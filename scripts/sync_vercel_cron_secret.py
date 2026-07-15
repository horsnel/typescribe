#!/usr/bin/env python3
"""
One-off script to sync the Vercel project's CRON_SECRET env var with the
value stored in .env.local.

This is needed because the VERCEL_TOKEN used in CI doesn't have the decrypt
scope required to read decrypted env values via the Vercel REST API. By
updating the Vercel env to match our local value (and the GitHub Actions
secret we just uploaded), we make all three sources consistent.

Usage: run locally with VERCEL_TOKEN + VERCEL_PROJECT_ID env vars set.
       OR run as a one-off GitHub Actions workflow_dispatch (the workflow
       already has both as secrets).

Vercel API flow:
  1. GET /v9/projects/{id}/env — find the env var ID for CRON_SECRET
  2. DELETE /v9/projects/{id}/env/{envId} — remove the old value
  3. POST /v9/projects/{id}/env — create a new one with our value
"""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ─── Extract GitHub token from git remote (to fetch VERCEL_TOKEN secret)
# Actually, GitHub Actions secrets can't be read back via API. So this
# script must be run from inside a CI workflow that exposes VERCEL_TOKEN
# as an env var. For local runs, set VERCEL_TOKEN + VERCEL_PROJECT_ID
# env vars manually.

VERCEL_TOKEN = os.environ.get('VERCEL_TOKEN', '')
VERCEL_PROJECT_ID = os.environ.get('VERCEL_PROJECT_ID', '')

if not VERCEL_TOKEN or not VERCEL_PROJECT_ID:
    print('ERROR: VERCEL_TOKEN and VERCEL_PROJECT_ID env vars required.', file=sys.stderr)
    sys.exit(1)

# Load desired CRON_SECRET value:
#   - CRON_SECRET env var (preferred — set by CI from GitHub Actions secret)
#   - .env.local at repo root (local dev fallback)
DESIRED_SECRET = os.environ.get('CRON_SECRET', '')

if not DESIRED_SECRET:
    # Try .env.local in a few candidate locations (local dev vs CI checkout)
    candidates = [
        '/home/z/my-project/typescribe/.env.local',
        Path(__file__).resolve().parent.parent / '.env.local',
    ]
    for env_path in candidates:
        if Path(env_path).exists():
            for line in Path(env_path).read_text().splitlines():
                if line.startswith('CRON_SECRET='):
                    DESIRED_SECRET = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break
            if DESIRED_SECRET:
                break

if not DESIRED_SECRET:
    print('ERROR: Could not determine desired CRON_SECRET value.', file=sys.stderr)
    print('Set CRON_SECRET env var or create .env.local with CRON_SECRET=...', file=sys.stderr)
    sys.exit(1)

print(f'Desired CRON_SECRET: {len(DESIRED_SECRET)} chars')


def vercel_api(method: str, path: str, body: dict | None = None) -> dict:
    url = f'https://api.vercel.com{path}'
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={
            'Authorization': f'Bearer {VERCEL_TOKEN}',
            'Content-Type': 'application/json',
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body_text = resp.read().decode()
            return json.loads(body_text) if body_text else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()[:500]
        print(f'HTTP {e.code} on {method} {path}: {err_body}', file=sys.stderr)
        if e.code == 403:
            print('Token may lack the project env write scope.', file=sys.stderr)
        raise


# 1. Find existing CRON_SECRET env var(s)
print('\n[1] Fetching existing env vars from Vercel…')
result = vercel_api('GET', f'/v9/projects/{VERCEL_PROJECT_ID}/env')
envs = result.get('envs', [])
print(f'  Total env vars: {len(envs)}')

cron_envs = [e for e in envs if e.get('key') == 'CRON_SECRET']
print(f'  CRON_SECRET entries: {len(cron_envs)}')
for e in cron_envs:
    print(f'    id={e["id"]}  target={e.get("target")}  type={e.get("type")}')

# 2. Delete existing CRON_SECRET entries
for e in cron_envs:
    print(f'\n[2] Deleting CRON_SECRET env var {e["id"]}…')
    try:
        vercel_api('DELETE', f'/v9/projects/{VERCEL_PROJECT_ID}/env/{e["id"]}')
        print('  OK — deleted')
    except Exception as e2:
        print(f'  WARN — delete failed: {e2}')

# 3. Create new CRON_SECRET with desired value (production + preview + development targets)
print('\n[3] Creating new CRON_SECRET env var with desired value…')
new_env = vercel_api('POST', f'/v9/projects/{VERCEL_PROJECT_ID}/env', {
    'key': 'CRON_SECRET',
    'value': DESIRED_SECRET,
    'type': 'encrypted',
    'target': ['production', 'preview', 'development'],
})
print(f'  OK — created env var id={new_env.get("id")}')
print(f'  target={new_env.get("target")}')

# 4. Verify by listing again
print('\n[4] Verifying…')
result = vercel_api('GET', f'/v9/projects/{VERCEL_PROJECT_ID}/env')
cron_envs = [e for e in result.get('envs', []) if e.get('key') == 'CRON_SECRET']
print(f'  CRON_SECRET entries after update: {len(cron_envs)}')
for e in cron_envs:
    print(f'    id={e["id"]}  target={e.get("target")}')

print('\n✓ Done. Vercel CRON_SECRET is now synced with the local + GitHub Actions secret.')
print('  The next Vercel deployment will pick up the new value automatically.')
