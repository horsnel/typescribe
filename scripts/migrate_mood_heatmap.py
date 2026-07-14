#!/usr/bin/env python3
"""
Migration: create `mood_heatmap` table + RLS policy on the live Supabase DB.
Fixes the missing table that was causing /api/mood-heatmap to 500.
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
    # Construct from URL + service key
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
create table if not exists public.mood_heatmap (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  mood         text not null,
  movie_id     int not null,
  movie_title  text not null,
  poster_path  text,
  rating       numeric(3,1),
  logged_at    timestamptz default now(),
  primary key (user_id, mood, movie_id)
);

alter table public.mood_heatmap enable row level security;

drop policy if exists "mood_owner" on public.mood_heatmap;
create policy "mood_owner"
  on public.mood_heatmap for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
"""

with conn.cursor() as cur:
    cur.execute(DDL)
conn.commit()
print("OK: mood_heatmap table created + RLS enabled + policy set")
conn.close()
