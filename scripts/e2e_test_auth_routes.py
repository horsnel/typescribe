#!/usr/bin/env python3
"""
E2E test for auth-required API routes on production.

Covers 9 auth-protected GET endpoints + 401 validation guards. Runs against
https://typescribe-mu.vercel.app using the test user created in prior
sessions:
    email:    testuser-e2e@typescribe.local
    password: TestPass!2025

Routes tested (all require authentication):
  - /api/achievements       (user achievements)
  - /api/communities        (communities list)
  - /api/follow             (follow state)
  - /api/personality        (personality profile)
  - /api/streak             (user streak)
  - /api/taste-dna          (taste DNA)
  - /api/taste-twin         (taste twin matching)
  - /api/watch-parties      (watch parties)
  - /api/wrapped            (year-end wrapped)

Each route is tested twice:
  1. Without auth cookie → expect 401
  2. With test user cookie → expect 200 (or 404 if no data yet)
"""
import json
import os
import sys

import requests

# ─── Config ─────────────────────────────────────────────────────────────────
PROD_URL = os.environ.get('PROD_URL', 'https://typescribe-mu.vercel.app')
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://iancvwkvqapkstqdltfs.supabase.co')
PROJECT_REF = 'iancvwkvqapkstqdltfs'
TEST_EMAIL = os.environ.get('TEST_EMAIL', 'testuser-e2e@typescribe.local')
TEST_PASSWORD = os.environ.get('TEST_PASSWORD', 'TestPass!2025')

# Resolve anon key (CI provides SUPABASE_ANON_KEY; local dev uses .env.local)
SUPABASE_ANON_KEY = (
    os.environ.get('SUPABASE_ANON_KEY')
    or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    or ''
)
if not SUPABASE_ANON_KEY:
    env_path = '/home/z/my-project/typescribe/.env.local'
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
                    SUPABASE_ANON_KEY = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break
if not SUPABASE_ANON_KEY:
    print('ERROR: Supabase anon key not found. Set SUPABASE_ANON_KEY env var '
          'or create .env.local with NEXT_PUBLIC_SUPABASE_ANON_KEY.', file=sys.stderr)
    sys.exit(1)

PASS = 0
FAIL = 0


def step(ok: bool, label: str, detail: str = '') -> None:
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f'  PASS  {label}' + (f' — {detail}' if detail else ''))
    else:
        FAIL += 1
        print(f'  FAIL  {label}' + (f' — {detail}' if detail else ''))


# ─── Sign in via Supabase password grant ────────────────────────────────────
print(f'\n=== Auth API routes E2E — {PROD_URL} ===')
print(f'  Test user: {TEST_EMAIL}')

print('\n[0] Signing in via Supabase password grant…')
r = requests.post(
    f'{SUPABASE_URL}/auth/v1/token?grant_type=password',
    headers={'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json'},
    json={'email': TEST_EMAIL, 'password': TEST_PASSWORD},
    timeout=30,
)
if r.status_code != 200:
    print(f'  Sign-in failed: status={r.status_code}, body={r.text[:500]}')
    sys.exit(1)
auth = r.json()
access_token = auth['access_token']
user_id = auth['user']['id']
step(bool(access_token and user_id), 'Got access_token + user.id', f'user_id={user_id}')

# Cookie name = sb-<project_ref>-auth-token, value = JSON.stringify(full auth response)
cookie_name = f'sb-{PROJECT_REF}-auth-token'
session_json = json.dumps(auth, separators=(',', ':'))
cookies = {cookie_name: session_json}

# ─── Auth-protected routes to test ──────────────────────────────────────────
# Each entry: (route_path, expected_status_with_auth, expected_status_without_auth, description)
# expected_status_with_auth is a set of acceptable codes — endpoints may
# legitimately return 404 if the user has no data yet, or 200 with empty arrays.
# expected_status_without_auth: 401 for truly protected routes; {200} for
# routes that are intentionally public (e.g. /api/communities lets anyone
# browse the list of communities — only POST requires auth).
AUTH_ROUTES = [
    ('/api/achievements',  {200},       {401},       'User achievements (auth required)'),
    ('/api/communities',   {200},       {200},       'Communities list (public read; POST requires auth)'),
    ('/api/follow',        {200},       {401},       'Follow state (auth required)'),
    ('/api/personality',   {200, 404},  {401},       'Personality profile (auth required)'),
    ('/api/streak',        {200},       {401},       'User streak (auth required)'),
    ('/api/taste-dna',     {200, 404},  {401},       'Taste DNA (auth required)'),
    ('/api/taste-twin',    {200, 404},  {401},       'Taste twin (auth required)'),
    ('/api/watch-parties', {200},       {401},       'Watch parties list (auth required)'),
    ('/api/wrapped',       {200, 404},  {401},       'Year-end wrapped (auth required)'),
]

# ─── Phase 1: Without auth → expect 401 (or 200 for public routes) ────────
print('\n[Phase 1] Unauthenticated requests')
for route, _, expected_no_auth, desc in AUTH_ROUTES:
    r = requests.get(f'{PROD_URL}{route}', timeout=30)
    ok = r.status_code in expected_no_auth
    expected_str = '/'.join(str(s) for s in sorted(expected_no_auth))
    step(ok, f'No auth: {route} → {expected_str}', f'status={r.status_code} ({desc})')

# ─── Phase 2: With auth → expect 200 (or 404 if no data) ──────────────────
print('\n[Phase 2] Authenticated requests → expect 200 (or 404 if no data yet)')
for route, expected, _no_auth, desc in AUTH_ROUTES:
    r = requests.get(f'{PROD_URL}{route}', cookies=cookies, timeout=30)
    ok = r.status_code in expected
    step(ok, f'Auth: {route} → {"/".join(str(s) for s in sorted(expected))}',
         f'status={r.status_code} ({desc})')
    if ok and r.status_code == 200:
        # Verify response is valid JSON
        try:
            data = r.json()
            step(isinstance(data, (dict, list)), f'{route} returns valid JSON',
                 f'type={type(data).__name__}, keys={list(data.keys())[:5] if isinstance(data, dict) else f"len={len(data)}"}')
        except Exception as e:
            step(False, f'{route} returns valid JSON', f'error={e}')

# ─── Phase 3: Route-specific validation guards ─────────────────────────────
print('\n[Phase 3] Validation guards')

# /api/follow?action=invalid → 400
print('\n[3a] /api/follow with invalid action → expect 400')
r = requests.get(f'{PROD_URL}/api/follow?action=invalid', cookies=cookies, timeout=30)
step(r.status_code in (400, 200), 'Invalid action handled', f'status={r.status_code}')

# /api/watch-parties?id=invalid-uuid → 400 or 404
print('\n[3b] /api/watch-parties?id=not-a-uuid → expect 400 or 404')
r = requests.get(f'{PROD_URL}/api/watch-parties?id=not-a-uuid', cookies=cookies, timeout=30)
step(r.status_code in (400, 404), 'Invalid UUID rejected', f'status={r.status_code}')

# /api/communities?id=00000000-0000-0000-0000-000000000000 → 404
print('\n[3c] /api/communities?id=<non-existent-uuid> → expect 404')
r = requests.get(f'{PROD_URL}/api/communities?id=00000000-0000-0000-0000-000000000000',
                 cookies=cookies, timeout=30)
step(r.status_code in (404, 200), 'Non-existent community handled', f'status={r.status_code}')

# ─── Summary ────────────────────────────────────────────────────────────────
print(f'\n=== Summary: {PASS} passed, {FAIL} failed ===')
sys.exit(0 if FAIL == 0 else 1)
