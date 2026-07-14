"""
Migration v2: align daily_trivia + monthly_festivals schemas with the route code.
- daily_trivia: route inserts trivia_date, movie_id, question, choices, answer_idx, explanation
                (no movie_title in insert) -> drop NOT NULL on movie_title, OR drop column.
                Route reads back trivia_date, movie_id, question, choices (no movie_title).
                So just drop the column.
- monthly_festivals: route inserts festival_key, title, description, movie_ids, movie_titles,
                     movie_posters, starts_on, ends_on. Drop and recreate with these columns.
"""
import psycopg2

URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

STATEMENTS = [
    # 1. daily_trivia — drop the movie_title column (route doesn't use it)
    "ALTER TABLE public.daily_trivia DROP COLUMN IF EXISTS movie_title;",

    # 2. monthly_festivals — drop + recreate with the schema the route expects
    "DROP TABLE IF EXISTS public.monthly_festivals CASCADE;",
    """
    CREATE TABLE public.monthly_festivals (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      festival_key    text NOT NULL UNIQUE,
      title           text NOT NULL,
      description     text,
      movie_ids       jsonb NOT NULL,
      movie_titles    jsonb NOT NULL,
      movie_posters   jsonb,
      starts_on       date NOT NULL,
      ends_on         date NOT NULL,
      created_at      timestamptz NOT NULL DEFAULT now()
    );
    """,
    "ALTER TABLE public.monthly_festivals ENABLE ROW LEVEL SECURITY;",
    "CREATE POLICY \"anyone can read monthly festivals\" ON public.monthly_festivals FOR SELECT USING (true);",
    "CREATE POLICY \"service role can write monthly festivals\" ON public.monthly_festivals FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');",
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
    for t in ('daily_trivia', 'monthly_festivals'):
        cur.execute(f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='{t}' ORDER BY ordinal_position")
        print(f"{t}:")
        for col, typ, nullable in cur.fetchall():
            print(f"  {col:20} {typ:30} nullable={nullable}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
