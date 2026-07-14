#!/usr/bin/env python3
"""
Migration: add `genres` (text[]) and `release_year` (int) columns to the
`reviews` and `watch_diary` tables, plus backfill what we can from the
movie_embeddings table for existing rows.

This unblocks /api/taste-dna and /api/personality from computing real
genre/decade affinities instead of placeholder heuristics.
"""
import os
import sys
import json
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
print(f"Connecting to {p.hostname}:{p.port or 5432} ...", file=sys.stderr)
conn = psycopg2.connect(
    host=p.hostname, port=p.port or 5432,
    dbname=p.path.lstrip("/") or "postgres",
    user=p.username, password=p.password,
    sslmode="require", connect_timeout=15,
)

DDL = """
-- ─── reviews: add genres + release_year ───
alter table public.reviews add column if not exists genres text[] default '{}';
alter table public.reviews add column if not exists release_year int;

-- ─── watch_diary: add genres + release_year ───
alter table public.watch_diary add column if not exists genres text[] default '{}';
alter table public.watch_diary add column if not exists release_year int;

-- Index for faster genre-based aggregation in taste-dna/personality queries
create index if not exists reviews_user_genres_idx on public.reviews(user_id) where array_length(genres, 1) > 0;
create index if not exists diary_user_genres_idx  on public.watch_diary(user_id) where array_length(genres, 1) > 0;
"""

BACKFILL_FROM_EMBEDDINGS = """
-- Backfill genres + release_year from movie_embeddings where possible.
-- Left join: rows without a matching embedding keep genres='{}' and release_year=NULL.
update public.reviews r
set genres = coalesce(me.genres, r.genres),
    release_year = coalesce(r.release_year,
      case when me.release_date is not null
           then extract(year from me.release_date::date)::int
           else null end)
from public.movie_embeddings me
where me.movie_id = r.movie_id
  and (r.genres = '{}' or r.release_year is null);

update public.watch_diary d
set genres = coalesce(me.genres, d.genres),
    release_year = coalesce(d.release_year,
      case when me.release_date is not null
           then extract(year from me.release_date::date)::int
           else null end)
from public.movie_embeddings me
where me.movie_id = d.movie_id
  and (d.genres = '{}' or d.release_year is null);
"""

with conn.cursor() as cur:
    print("  → applying DDL ...", file=sys.stderr)
    cur.execute(DDL)
    conn.commit()
    print("  → backfilling from movie_embeddings ...", file=sys.stderr)
    cur.execute(BACKFILL_FROM_EMBEDDINGS)
    rows_updated = cur.rowcount
    conn.commit()
    print(f"  → backfilled {rows_updated} rows total", file=sys.stderr)

# Stats
with conn.cursor() as cur:
    cur.execute("select count(*) from public.reviews where array_length(genres,1) > 0")
    reviews_with_genres = cur.fetchone()[0]
    cur.execute("select count(*) from public.watch_diary where array_length(genres,1) > 0")
    diary_with_genres = cur.fetchone()[0]
    cur.execute("select count(*) from public.reviews")
    reviews_total = cur.fetchone()[0]
    cur.execute("select count(*) from public.watch_diary")
    diary_total = cur.fetchone()[0]

print(f"OK: reviews {reviews_with_genres}/{reviews_total} have genres, "
      f"diary {diary_with_genres}/{diary_total} have genres")
conn.close()
