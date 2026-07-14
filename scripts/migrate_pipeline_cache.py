#!/usr/bin/env python3
"""
Migration: create `pipeline_cache` table on the live Supabase DB.

This is the persistent cross-instance cache that Vercel serverless functions
share. Without it, every cold start re-scrapes from upstream APIs even though
another instance scraped the same movie 30 seconds earlier.
"""
import os
import sys
from urllib.parse import urlparse

import psycopg2

# Load .env.local if it exists
env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
if os.path.exists(env_path):
    for line in open(env_path):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

db_url = os.environ.get("SUPABASE_DB_URL")
if not db_url:
    raw = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not raw or not key:
        print("ERROR: SUPABASE_DB_URL or (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) required", file=sys.stderr)
        sys.exit(1)
    host = urlparse(raw).netloc
    project_ref = host.split(".")[0]
    db_url = f"postgresql://postgres.{project_ref}:{key}@aws-0-eu-west-1.{project_ref}.pooler.supabase.com:6543/postgres"

p = urlparse(db_url)
print(f"Connecting to {p.hostname}:{p.port or 5432}/{p.path.lstrip('/') or 'postgres'} ...", file=sys.stderr)
try:
    conn = psycopg2.connect(
        host=p.hostname,
        port=p.port or 5432,
        dbname=p.path.lstrip("/") or "postgres",
        user=p.username,
        password=p.password,
        sslmode="require",
        connect_timeout=15,
    )
except Exception as e:
    print(f"ERROR: cannot connect: {e}", file=sys.stderr)
    sys.exit(1)

DDL = """
create table if not exists public.pipeline_cache (
  key          text primary key,
  value        jsonb not null,
  expires_at   timestamptz not null,
  created_at   timestamptz default now(),
  hit_count    int default 0
);

-- Index for fast expiry pruning
create index if not exists pipeline_cache_expires_idx on public.pipeline_cache(expires_at);

-- Row Level Security: server-side only (service-role key bypasses RLS).
-- No client-side policy needed because the cache is never queried from browsers.
alter table public.pipeline_cache enable row level security;

-- Allow anonymous SELECT/INSERT/UPDATE/DELETE because the API routes use
-- the service-role key (which bypasses RLS). For anon key fallback, deny all.
-- (No policy = no access for anon/authenticated roles.)
"""

with conn.cursor() as cur:
    cur.execute(DDL)
conn.commit()
print("OK: pipeline_cache table created + index + RLS enabled")
conn.close()
