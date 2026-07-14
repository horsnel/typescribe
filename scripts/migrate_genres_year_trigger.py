"""
Migration v6: add BEFORE INSERT triggers to auto-populate `genres` and
`release_year` on `reviews` and `watch_diary` tables.

When a user submits a review or diary entry WITHOUT passing genres/release_year
explicitly, the trigger looks up `movie_embeddings` by movie_id and copies the
genres (text[]) + release_year (parsed from release_date) into the new row.

This makes the dashboard's "Write Review" / "Log Watch" UI work even when the
client doesn't pass genres — the data still gets enriched server-side so the
taste-dna + personality aggregations have real genre/decade data to work with.

The trigger is idempotent: if the new row already has genres/release_year set,
it leaves them alone (so explicit caller data always wins).
"""
import psycopg2

URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

STATEMENTS = [
    # ─── Helper function shared by both triggers ───
    # Looks up the movie in movie_embeddings and returns (genres, release_year).
    # Returns (NULL, NULL) if the movie isn't in the embeddings table.
    """
    CREATE OR REPLACE FUNCTION public.lookup_movie_genres_year(p_movie_id integer)
    RETURNS TABLE(genres text[], release_year integer)
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
        END AS release_year
      FROM public.movie_embeddings
      WHERE movie_id = p_movie_id
      LIMIT 1;
    $$;
    """,

    # ─── Trigger function for reviews ───
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
      -- Only enrich if both fields are missing or empty
      IF (NEW.genres IS NULL OR array_length(NEW.genres, 1) IS NULL)
         AND NEW.release_year IS NULL THEN
        SELECT * INTO lookup_row FROM public.lookup_movie_genres_year(NEW.movie_id);
        IF lookup_row.genres IS NOT NULL THEN
          NEW.genres := lookup_row.genres;
        END IF;
        IF lookup_row.release_year IS NOT NULL THEN
          NEW.release_year := lookup_row.release_year;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$;
    """,

    # ─── Trigger function for watch_diary ───
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
         AND NEW.release_year IS NULL THEN
        SELECT * INTO lookup_row FROM public.lookup_movie_genres_year(NEW.movie_id);
        IF lookup_row.genres IS NOT NULL THEN
          NEW.genres := lookup_row.genres;
        END IF;
        IF lookup_row.release_year IS NOT NULL THEN
          NEW.release_year := lookup_row.release_year;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$;
    """,

    # ─── Drop existing triggers (idempotent) ───
    "DROP TRIGGER IF EXISTS trg_reviews_enrich_genres_year ON public.reviews;",
    "DROP TRIGGER IF EXISTS trg_diary_enrich_genres_year ON public.watch_diary;",

    # ─── Attach triggers as BEFORE INSERT (so the enriched row gets inserted) ───
    """
    CREATE TRIGGER trg_reviews_enrich_genres_year
      BEFORE INSERT ON public.reviews
      FOR EACH ROW
      EXECUTE FUNCTION public.enrich_review_genres_year();
    """,
    """
    CREATE TRIGGER trg_diary_enrich_genres_year
      BEFORE INSERT ON public.watch_diary
      FOR EACH ROW
      EXECUTE FUNCTION public.enrich_diary_genres_year();
    """,

    # ─── Also fire on UPDATE (in case movie_id changes or genres get cleared) ───
    """
    CREATE TRIGGER trg_reviews_enrich_genres_year_update
      BEFORE UPDATE ON public.reviews
      FOR EACH ROW
      WHEN (NEW.movie_id IS DISTINCT FROM OLD.movie_id
            AND (NEW.genres IS NULL OR array_length(NEW.genres, 1) IS NULL)
            AND NEW.release_year IS NULL)
      EXECUTE FUNCTION public.enrich_review_genres_year();
    """,
    """
    CREATE TRIGGER trg_diary_enrich_genres_year_update
      BEFORE UPDATE ON public.watch_diary
      FOR EACH ROW
      WHEN (NEW.movie_id IS DISTINCT FROM OLD.movie_id
            AND (NEW.genres IS NULL OR array_length(NEW.genres, 1) IS NULL)
            AND NEW.release_year IS NULL)
      EXECUTE FUNCTION public.enrich_diary_genres_year();
    """,

    # ─── Grant execute on the lookup helper (anon + authenticated) ───
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

    # Verify triggers exist
    print()
    cur.execute("""
        SELECT event_object_table, trigger_name, event_manipulation
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND trigger_name LIKE 'trg_%enrich_genres_year%'
        ORDER BY event_object_table, trigger_name;
    """)
    print("Installed triggers:")
    for table, name, event in cur.fetchall():
        print(f"  {table:20} {event:10} {name}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
