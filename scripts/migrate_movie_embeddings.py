"""
Migration v3: align movie_embeddings with /api/vibe-search/seed route.

Route inserts: movie_id, movie_title, poster_path, overview, release_date, genres, embedding, metadata
Table currently has: movie_id, movie_title, embedding, overview, genres, release_year, created_at

Missing columns: poster_path, release_date, metadata
Stale column: release_year (route doesn't insert it; keep it nullable for safety)

Also re-creates the match_movies function to be sure it works with the current schema.
"""
import psycopg2

URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

STATEMENTS = [
    # Add missing columns (idempotent via IF NOT EXISTS)
    "ALTER TABLE public.movie_embeddings ADD COLUMN IF NOT EXISTS poster_path text;",
    "ALTER TABLE public.movie_embeddings ADD COLUMN IF NOT EXISTS release_date text;",
    "ALTER TABLE public.movie_embeddings ADD COLUMN IF NOT EXISTS metadata jsonb;",
    # Make release_year nullable (route doesn't insert it)
    "ALTER TABLE public.movie_embeddings ALTER COLUMN release_year DROP NOT NULL;",
    # Make sure movie_id is unique (used as onConflict target in upsert)
    """
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public' AND tablename='movie_embeddings' AND indexname='movie_embeddings_movie_id_key'
      ) THEN
        ALTER TABLE public.movie_embeddings ADD CONSTRAINT movie_embeddings_movie_id_key UNIQUE (movie_id);
      END IF;
    END$$;
    """,
    # Re-create the match_movies function (in case it was dropped)
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

    print()
    cur.execute("""SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='movie_embeddings' ORDER BY ordinal_position""")
    print("movie_embeddings schema:")
    for col, typ, nullable in cur.fetchall():
        print(f"  {col:18} {typ:30} nullable={nullable}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
