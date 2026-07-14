"""
Migration v5: restore match_movies to return poster_path, overview, genres, release_date.

Previous migration (migrate_resize_embedding.py) re-created match_movies with
ONLY (movie_id, movie_title, similarity). This broke vibe-search image rendering
because the page expected r.poster_path — which came back as undefined.

This script re-creates match_movies with the full column set so vibe search
results display real TMDb posters again.
"""
import psycopg2

URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

STATEMENTS = [
    # Drop both signatures (untyped vector + typed vector(768)) to avoid ambiguity
    "DROP FUNCTION IF EXISTS public.match_movies(vector, int);",
    "DROP FUNCTION IF EXISTS public.match_movies(vector(768), int);",
    # Re-create with untyped vector (matches any dimension) and full column set
    """
    CREATE OR REPLACE FUNCTION public.match_movies(query_embedding vector, match_count integer DEFAULT 20)
    RETURNS TABLE (
      movie_id integer,
      movie_title text,
      poster_path text,
      overview text,
      genres text[],
      release_date text,
      similarity double precision
    )
    LANGUAGE sql
    STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT
        movie_id,
        movie_title,
        poster_path,
        overview,
        genres,
        release_date,
        1 - (embedding <=> query_embedding) AS similarity
      FROM public.movie_embeddings
      ORDER BY embedding <=> query_embedding
      LIMIT LEAST(match_count, 100);
    $$;
    """,
    # Re-grant execute (in case the DROP revoked it)
    "GRANT EXECUTE ON FUNCTION public.match_movies(vector, int) TO anon, authenticated;",
]

def main():
    print(f"Connecting to {URL.split('@')[1]}...")
    conn = psycopg2.connect(URL, connect_timeout=15)
    conn.autocommit = True
    cur = conn.cursor()
    for i, sql in enumerate(STATEMENTS, 1):
        clean = ' '.join(sql.split())
        try:
            cur.execute(sql)
            print(f"[{i:02}/{len(STATEMENTS)}] OK   {clean[:120]}")
        except Exception as e:
            print(f"[{i:02}/{len(STATEMENTS)}] FAIL {clean[:120]}")
            print(f"        -> {e}")
    # Verify
    print()
    cur.execute("""
        SELECT pg_get_function_arguments(oid), pg_get_function_result(oid)
        FROM pg_proc
        WHERE proname = 'match_movies'
    """)
    for args, result in cur.fetchall():
        print(f"ARGS:   {args}")
        print(f"RESULT: {result}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
