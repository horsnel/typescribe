#!/usr/bin/env python3
"""
Migration: add `privacy_settings` JSONB column to public.profiles.

Stores per-user privacy toggles that aren't covered by the existing
standalone `public_profile` / `email_notifications` columns:

  {
    "show_watchlist":  true,
    "show_ratings":    true,
    "show_community":  true,
    "allow_mentions":  true
  }

`public_profile` continues to be its own column because the RLS policy
`profiles_public_read` already references it directly.

Idempotent: safe to run multiple times.
"""
import os
import sys
from urllib.parse import urlparse

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

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
-- Add privacy_settings JSONB column to profiles.
-- Stores per-user toggles for show_watchlist / show_ratings / show_community / allow_mentions.
-- public_profile stays as a standalone column (referenced by RLS).
alter table public.profiles
  add column if not exists privacy_settings jsonb default '{}'::jsonb;

-- Backfill default values for existing rows so the UI shows sensible defaults.
update public.profiles
   set privacy_settings = coalesce(privacy_settings, '{}'::jsonb) || '{"show_watchlist": true, "show_ratings": true, "show_community": true, "allow_mentions": true}'::jsonb
 where privacy_settings is null
    or privacy_settings = '{}'::jsonb;
"""

with conn:
    with conn.cursor() as cur:
        cur.execute(DDL)
print("✓ privacy_settings column added to public.profiles (idempotent).")
