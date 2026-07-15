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
    raw = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    db_password = os.environ.get("SUPABASE_DB_PASSWORD")  # optional, falls back to service role JWT
    if not raw or not (key or db_password):
        print("ERROR: SUPABASE_DB_URL or (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) required", file=sys.stderr)
        sys.exit(1)
    host = urlparse(raw).netloc
    project_ref = host.split(".")[0]
    # Use the DB password if provided (recommended); otherwise fall back to the
    # service-role JWT (works on some Supabase pooler configurations).
    pw = db_password or key
    # Build a list of candidate connection URLs to try. Different Supabase
    # projects use different pooler URL formats depending on age and region:
    #   - Direct DB:     db.<ref>.supabase.co:5432   (user=postgres, IPv6-only on newer projects)
    #   - Pooler (new):  <ref>.pooler.supabase.com:6543   (user=postgres.<ref>)
    #   - Pooler (old):  aws-0-<region>.<ref>.pooler.supabase.com:6543   (user=postgres.<ref>)
    # We try them in order and use the first one that connects.
    candidate_db_urls = [
        # Newer pooler format (no region prefix)
        f"postgresql://postgres.{project_ref}:{pw}@{project_ref}.pooler.supabase.com:6543/postgres",
        # Direct DB (works on projects with IPv4 connectivity to db.<ref>.supabase.co)
        f"postgresql://postgres:{pw}@db.{project_ref}.supabase.co:5432/postgres",
    ]
    # Add known pooler regions as fallbacks
    for region in (
        "aws-0-eu-west-1", "aws-0-us-east-1", "aws-0-us-west-1",
        "aws-0-ap-southeast-1", "aws-0-eu-central-1", "aws-0-ap-northeast-1",
        "aws-0-ap-south-1", "aws-0-sa-east-1", "aws-0-us-east-2",
        "aws-0-eu-west-2", "aws-0-eu-west-3", "aws-0-ap-southeast-2",
        "aws-0-ap-northeast-2", "aws-0-ca-central-1", "aws-0-eu-north-1",
    ):
        candidate_db_urls.append(
            f"postgresql://postgres.{project_ref}:{pw}@{region}.{project_ref}.pooler.supabase.com:6543/postgres"
        )
else:
    candidate_db_urls = [db_url]

# Try each candidate URL until one connects.
conn = None
last_err = None
for candidate in candidate_db_urls:
    p = urlparse(candidate)
    print(f"Trying {p.hostname}:{p.port or 5432}/{p.path.lstrip('/') or 'postgres'} (user={p.username}) ...", file=sys.stderr)
    try:
        conn = psycopg2.connect(
            host=p.hostname,
            port=p.port or 5432,
            dbname=p.path.lstrip("/") or "postgres",
            user=p.username,
            password=p.password,
            sslmode="require",
            connect_timeout=10,
        )
        print(f"  -> connected via {p.hostname}", file=sys.stderr)
        break
    except Exception as e:
        msg = str(e).strip().split("\n")[0][:100]
        print(f"  -> failed: {msg}", file=sys.stderr)
        last_err = e

if conn is None:
    print(f"ERROR: could not connect to any Supabase DB candidate. Last error: {last_err}", file=sys.stderr)
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
