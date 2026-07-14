"""
Migration v7: create `streaming_cache` table for the streaming-pipeline cache.

The streaming-pipeline cache (`src/lib/streaming-pipeline/cache.ts`) was
previously memory + /tmp only, which means every Vercel cold start re-fetched
the streaming catalog from 14+ upstream sources. This migration creates a
Supabase-backed persistent tier so cache hits survive across cold starts —
matching the architecture already used by the main `pipeline_cache` table.

Schema mirrors `pipeline_cache` so we can reuse the same query patterns.
"""
import psycopg2

URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS public.streaming_cache (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      hit_count integer NOT NULL DEFAULT 0
    );
    """,
    "CREATE INDEX IF NOT EXISTS streaming_cache_expires_at_idx ON public.streaming_cache (expires_at);",
    # Enable RLS but allow anon read (the catalog data is public; writes go
    # through the service-role admin client which bypasses RLS).
    "ALTER TABLE public.streaming_cache ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS streaming_cache_read_all ON public.streaming_cache;",
    "CREATE POLICY streaming_cache_read_all ON public.streaming_cache FOR SELECT USING (true);",
    "DROP POLICY IF EXISTS streaming_cache_write_none ON public.streaming_cache;",
    "CREATE POLICY streaming_cache_write_none ON public.streaming_cache FOR ALL USING (false) WITH CHECK (false);",
    # Grant access — service role bypasses RLS; anon can only SELECT.
    "GRANT SELECT ON public.streaming_cache TO anon, authenticated;",
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
        WHERE table_schema='public' AND table_name='streaming_cache'
        ORDER BY ordinal_position
    """)
    print("streaming_cache schema:")
    for col, typ in cur.fetchall():
        print(f"  {col:18} {typ}")
    cur.close(); conn.close()

if __name__ == "__main__":
    main()
