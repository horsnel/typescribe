"""
Migration v4: resize movie_embeddings.embedding column from vector(768) to vector(3072).

The old model 'embedding-001' returned 768-dim vectors. The current model
'gemini-embedding-001' returns 3072-dim vectors. The table needs to be resized.

Since pgvector doesn't support in-place ALTER COLUMN for vector dimensions,
we drop + recreate the column. The table is currently empty (seed never succeeded),
so no data loss.
"""
import psycopg2

URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

STATEMENTS = [
    # Drop the existing embedding column (table is empty, no data loss)
    "ALTER TABLE public.movie_embeddings DROP COLUMN IF EXISTS embedding;",
    # Recreate with 3072 dimensions (matches gemini-embedding-001 output)
    "ALTER TABLE public.movie_embeddings ADD COLUMN embedding vector(3072);",
    # Recreate the ivfflat index for fast cosine similarity (optional but recommended)
    # Note: ivfflat needs rows to build lists; we'll create it without lists for now
    # and the index will be rebuilt automatically as rows are inserted.
    "DROP INDEX IF EXISTS movie_embeddings_embedding_idx;",
    # Use hnsw for cosine similarity — better for high-dim vectors
    "CREATE INDEX IF NOT EXISTS movie_embeddings_embedding_idx ON public.movie_embeddings USING hnsw (embedding vector_cosine_ops);",
    # Re-ensure match_movies function exists (it's schema-agnostic, just uses embedding column)
    """
    CREATE OR REPLACE FUNCTION public.match_movies(query_embedding vector, match_count integer DEFAULT 20)
    RETURNS TABLE(movie_id integer, movie_title text, similarity double precision)
    LANGUAGE sql
    STABLE SECURITY DEFINER
    AS $$
      SELECT
        movie_id,
        movie_title,
        1 - (embedding <=> query_embedding) AS similarity
      FROM public.movie_embeddings
      ORDER BY embedding <=> query_embedding
      LIMIT LEAST(match_count, 100);
    $$;
    """,
]

def main():
    conn = psycopg2.connect(URL, connect_timeout=15)
    cur = conn.cursor()
    for i, sql in enumerate(STATEMENTS, 1):
        clean = ' '.join(sql.split())
        try:
            cur.execute(sql)
            print(f"[{i:02}/{len(STATEMENTS)}] OK   {clean[:120]}")
        except Exception as e:
            conn.rollback()
            print(f"[{i:02}/{len(STATEMENTS)}] FAIL {clean[:120]}")
            print(f"        -> {e}")
            cur = conn.cursor()
    conn.commit()

    # Verify
    cur.execute("""SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a WHERE a.attrelid = 'public.movie_embeddings'::regclass AND a.attname='embedding'""")
    print()
    print("New embedding type:", cur.fetchone()[0])
    cur.execute("SELECT count(*) FROM movie_embeddings")
    print("Row count:", cur.fetchone()[0])

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
