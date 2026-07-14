"""
Migration: add missing tables + fix daily_grids schema to match /api/grid route code.

Tables affected:
  - daily_grids        : drop + recreate with columns the route expects (grid_date, criteria, solution_*)
  - daily_trivia       : create new (referenced by /api/daily-trivia)
  - monthly_festivals  : create new (referenced by /api/film-festival)

Idempotent: safe to re-run.
"""
import psycopg2
import sys

URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

STATEMENTS = [
    # 1. daily_grids - drop + recreate with the schema the /api/grid route expects
    "DROP TABLE IF EXISTS public.daily_grids CASCADE;",
    """
    CREATE TABLE public.daily_grids (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      grid_date       date NOT NULL UNIQUE,
      criteria        jsonb NOT NULL,
      solution_ids    jsonb NOT NULL,
      solution_titles jsonb NOT NULL,
      solution_posters jsonb NOT NULL,
      created_at      timestamptz NOT NULL DEFAULT now()
    );
    """,
    "ALTER TABLE public.daily_grids ENABLE ROW LEVEL SECURITY;",
    "CREATE POLICY \"anyone can read daily grids\" ON public.daily_grids FOR SELECT USING (true);",
    "CREATE POLICY \"service role can write daily grids\" ON public.daily_grids FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');",

    # 2. daily_trivia
    "DROP TABLE IF EXISTS public.daily_trivia CASCADE;",
    """
    CREATE TABLE public.daily_trivia (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      trivia_date   date NOT NULL UNIQUE,
      movie_id      integer NOT NULL,
      movie_title   text NOT NULL,
      question      text NOT NULL,
      choices       jsonb NOT NULL,
      answer_idx    integer NOT NULL,
      explanation   text,
      created_at    timestamptz NOT NULL DEFAULT now()
    );
    """,
    "ALTER TABLE public.daily_trivia ENABLE ROW LEVEL SECURITY;",
    "CREATE POLICY \"anyone can read daily trivia\" ON public.daily_trivia FOR SELECT USING (true);",
    "CREATE POLICY \"service role can write daily trivia\" ON public.daily_trivia FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');",

    # 3. monthly_festivals
    "DROP TABLE IF EXISTS public.monthly_festivals CASCADE;",
    """
    CREATE TABLE public.monthly_festivals (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      festival_key    text NOT NULL UNIQUE,
      films           jsonb NOT NULL,
      month_start     date NOT NULL,
      month_end       date NOT NULL,
      created_at      timestamptz NOT NULL DEFAULT now()
    );
    """,
    "ALTER TABLE public.monthly_festivals ENABLE ROW LEVEL SECURITY;",
    "CREATE POLICY \"anyone can read monthly festivals\" ON public.monthly_festivals FOR SELECT USING (true);",
    "CREATE POLICY \"service role can write monthly festivals\" ON public.monthly_festivals FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');",
]

def main():
    try:
        conn = psycopg2.connect(URL, connect_timeout=15)
    except Exception as e:
        print("Connect failed:", e)
        sys.exit(1)

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

    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('daily_grids','daily_trivia','monthly_festivals') ORDER BY tablename")
    rows = [r[0] for r in cur.fetchall()]
    print()
    print("Tables now present:", rows)

    for t in ('daily_grids', 'daily_trivia', 'monthly_festivals'):
        cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='{t}' ORDER BY ordinal_position")
        print(f"  {t}:")
        for col, typ in cur.fetchall():
            print(f"      {col:20} {typ}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
