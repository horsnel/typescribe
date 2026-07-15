"""
Migration v7: denormalize poster_path onto reviews + watch_diary.

Goals
-----
1. Add `poster_path text` column to `reviews` (currently missing — the dashboard
   reviews list can't show posters).
2. Extend the existing `enrich_review_genres_year` / `enrich_diary_genres_year`
   trigger functions so they ALSO auto-populate the poster column from
   `movie_embeddings.poster_path` when the caller doesn't pass one.
   - For `reviews`: writes to `poster_path`
   - For `watch_diary`: writes to `movie_poster` (existing column name)

This makes the dashboard reviews list show posters without needing a join,
and makes the dashboard diary list show posters reliably (currently the
diary API passes `poster_path` but the column is `movie_poster` — fixed in
a separate code change to db.ts).

Idempotent: safe to re-run.
"""
import psycopg2

URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

STATEMENTS = [
    # ─── 1. Add poster_path column to reviews (if missing) ───
    """
    ALTER TABLE public.reviews
      ADD COLUMN IF NOT EXISTS poster_path text;
    """,

    # ─── 2. Updated lookup helper (now also returns poster_path) ───
    # We must DROP first because the return type changed (added poster_path).
    "DROP FUNCTION IF EXISTS public.lookup_movie_genres_year(integer);",
    """
    CREATE OR REPLACE FUNCTION public.lookup_movie_genres_year(p_movie_id integer)
    RETURNS TABLE(genres text[], release_year integer, poster_path text)
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT
        genres,
        CASE
          WHEN release_date ~ '^\\d{4}' THEN substring(release_date from '^(\\d{4})')::integer
          ELSE NULL
        END AS release_year,
        poster_path
      FROM public.movie_embeddings
      WHERE movie_id = p_movie_id
      LIMIT 1;
    $$;
    """,

    # ─── 3. Updated reviews trigger (now also sets poster_path) ───
    """
    CREATE OR REPLACE FUNCTION public.enrich_review_genres_year()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      lookup_row record;
    BEGIN
      -- Only enrich if at least one of genres/release_year/poster_path is missing
      IF (NEW.genres IS NULL OR array_length(NEW.genres, 1) IS NULL)
         OR NEW.release_year IS NULL
         OR NEW.poster_path IS NULL THEN
        SELECT * INTO lookup_row FROM public.lookup_movie_genres_year(NEW.movie_id);
        IF (NEW.genres IS NULL OR array_length(NEW.genres, 1) IS NULL)
           AND lookup_row.genres IS NOT NULL THEN
          NEW.genres := lookup_row.genres;
        END IF;
        IF NEW.release_year IS NULL AND lookup_row.release_year IS NOT NULL THEN
          NEW.release_year := lookup_row.release_year;
        END IF;
        IF NEW.poster_path IS NULL AND lookup_row.poster_path IS NOT NULL THEN
          NEW.poster_path := lookup_row.poster_path;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$;
    """,

    # ─── 4. Updated watch_diary trigger (now also sets movie_poster) ───
    """
    CREATE OR REPLACE FUNCTION public.enrich_diary_genres_year()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      lookup_row record;
    BEGIN
      IF (NEW.genres IS NULL OR array_length(NEW.genres, 1) IS NULL)
         OR NEW.release_year IS NULL
         OR NEW.movie_poster IS NULL THEN
        SELECT * INTO lookup_row FROM public.lookup_movie_genres_year(NEW.movie_id);
        IF (NEW.genres IS NULL OR array_length(NEW.genres, 1) IS NULL)
           AND lookup_row.genres IS NOT NULL THEN
          NEW.genres := lookup_row.genres;
        END IF;
        IF NEW.release_year IS NULL AND lookup_row.release_year IS NOT NULL THEN
          NEW.release_year := lookup_row.release_year;
        END IF;
        IF NEW.movie_poster IS NULL AND lookup_row.poster_path IS NOT NULL THEN
          NEW.movie_poster := lookup_row.poster_path;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$;
    """,

    # ─── 5. Backfill existing rows (no-op if tables are empty) ───
    # Updates existing reviews/diary rows that have NULL poster_path/movie_poster
    # but do have a matching row in movie_embeddings.
    """
    UPDATE public.reviews r
      SET poster_path = m.poster_path
      FROM public.movie_embeddings m
      WHERE r.movie_id = m.movie_id
        AND r.poster_path IS NULL
        AND m.poster_path IS NOT NULL;
    """,
    """
    UPDATE public.watch_diary d
      SET movie_poster = m.poster_path
      FROM public.movie_embeddings m
      WHERE d.movie_id = m.movie_id
        AND d.movie_poster IS NULL
        AND m.poster_path IS NOT NULL;
    """,

    # ─── 6. Grant execute on the updated lookup helper ───
    "GRANT EXECUTE ON FUNCTION public.lookup_movie_genres_year(integer) TO anon, authenticated;",
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
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='reviews'
          AND column_name='poster_path';
    """)
    rows = cur.fetchall()
    print(f"reviews.poster_path column: {rows if rows else 'MISSING'}")

    cur.execute("""
        SELECT event_object_table, trigger_name, event_manipulation
        FROM information_schema.triggers
        WHERE trigger_schema='public'
          AND trigger_name LIKE 'trg_%enrich_genres_year%';
    """)
    print("\nInstalled triggers:")
    for r in cur.fetchall(): print(" ", r)

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
