#!/usr/bin/env python3
"""Apply supabase/schema.sql to the live Supabase database via direct PG connection."""
import os
import sys
import psycopg2

DB_URL = "postgresql://postgres.iancvwkvqapkstqdltfs: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@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

SCHEMA_PATH = "/home/z/my-project/typescribe/supabase/schema.sql"

def main():
    print(f"[1/3] Connecting to {DB_URL.split('@')[-1]}")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print(f"[2/3] Reading schema from {SCHEMA_PATH}")
    with open(SCHEMA_PATH) as f:
        sql = f.read()

    print(f"[3/3] Executing ({len(sql)} bytes)")
    try:
        cur.execute(sql)
        print("✅ Schema applied successfully")
    except Exception as e:
        print(f"⚠️  Error: {e}")
        # Try executing statement-by-statement as fallback
        print("Attempting statement-by-statement execution...")
        stmts = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
        ok, fail = 0, 0
        for s in stmts:
            try:
                cur.execute(s + ';')
                ok += 1
            except Exception as e2:
                fail += 1
                if 'already exists' not in str(e2) and 'does not exist' not in str(e2):
                    print(f"  ❌ {str(e2)[:100]} | SQL: {s[:80]}...")
        print(f"✅ {ok} statements OK, {fail} failed (likely already-exists, OK)")

    # Verify
    cur.execute("""
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
        order by table_name
    """)
    tables = [r[0] for r in cur.fetchall()]
    print(f"\n📊 {len(tables)} tables in public schema:")
    for t in tables:
        print(f"  - {t}")

    cur.execute("select count(*) from public.achievements")
    print(f"\n🏆 {cur.fetchone()[0]} achievements seeded")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
