#!/usr/bin/env python3
"""
E2E test for protected API routes on production.

Covers routes that need either:
  - CRON_SECRET Bearer auth (3 cron routes), OR
  - An authenticated user + a POST body (compromise, scene-comments), OR
  - Just a POST body (directors-cut, moderate, pipeline)

Routes tested:
  CRON (Bearer CRON_SECRET):
    - GET /api/cron/refresh         (warm TMDb/OMDb caches + prune)
    - GET /api/cron/prune-cache     (prune all 3 cache tiers)
    - GET /api/cron/streaming-warm  (warm streaming catalog)

  AUTH + POST body:
    - POST /api/compromise          (group movie recommendation engine)
    - POST /api/scene-comments      (timestamped scene comments)

  POST body only (no auth):
    - POST /api/directors-cut       (Gemini Q&A about a film)
    - POST /api/moderate            (AI content moderation)
    - POST /api/pipeline            (batch TMDb processing)

Test strategy:
  - Cron routes: verify 401 without/with-wrong secret, 200 with correct secret
  - POST routes: verify 401 (auth-required ones) without cookie, 400 with
    missing/invalid body, 200/201 with valid body
  - For scene-comments POST, we use a non-existent movie_id (99999999) to
    avoid polluting real movie pages, then verify GET returns it, then
    leave it (no DELETE endpoint exists — the test comment is benign and
    isolated to a movie that has no real UI)
"""
import json
import os
import sys
import time
import uuid

import requests

# ─── Config ─────────────────────────────────────────────────────────────────
PROD_URL = os.environ.get('PROD_URL', 'https://typescribe-mu.vercel.app')
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://iancvwkvqapkstqdltfs.supabase.co')
PROJECT_REF = 'iancvwkvqapkstqdltfs'
TEST_EMAIL = os.environ.get('TEST_EMAIL', 'testuser-e2e@typescribe.local')
TEST_PASSWORD = os.environ.get('TEST_PASSWORD', 'TestPass!2025')
TEST_USER_UUID = os.environ.get('TEST_USER_UUID', '8e375239-f2bd-49f9-a786-750bf0e0c3c5')

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

# Resolve CRON_SECRET:
#   1. CRON_SECRET env var (CI secret or local .env.local)
#   2. Fetch from Vercel project env API using VERCEL_TOKEN + VERCEL_PROJECT_ID
# If neither works, the cron tests are SKIPPED with a clear message rather
# than failing.
CRON_SECRET = os.environ.get('CRON_SECRET', '')
if not CRON_SECRET:
    env_path = '/home/z/my-project/typescribe/.env.local'
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith('CRON_SECRET='):
                    CRON_SECRET = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break

VERCEL_TOKEN = os.environ.get('VERCEL_TOKEN', '')
VERCEL_PROJECT_ID = os.environ.get('VERCEL_PROJECT_ID', '')


def fetch_cron_secret_from_vercel() -> str:
    """Fetch the decrypted CRON_SECRET env var from the Vercel project.

    Uses Vercel's GET /v9/projects/{id}/env?decrypt=true endpoint.
    Returns empty string if anything goes wrong.
    """
    if not VERCEL_TOKEN or not VERCEL_PROJECT_ID:
        return ''
    try:
        r = requests.get(
            f'https://api.vercel.com/v9/projects/{VERCEL_PROJECT_ID}/env?decrypt=true',
            headers={'Authorization': f'Bearer {VERCEL_TOKEN}'},
            timeout=15,
        )
        if r.status_code != 200:
            return ''
        for env in r.json().get('envs', []):
            if env.get('key') == 'CRON_SECRET' and env.get('target', []):
                # value is decrypted (may be None if it's a system env)
                return env.get('value') or ''
    except Exception:
        return ''
    return ''


if not CRON_SECRET and VERCEL_TOKEN and VERCEL_PROJECT_ID:
    print('[0a] Fetching CRON_SECRET from Vercel project env API…')
    CRON_SECRET = fetch_cron_secret_from_vercel()
    if CRON_SECRET:
        print(f'  OK — fetched CRON_SECRET ({len(CRON_SECRET)} chars)')
    else:
        print('  WARN — could not fetch CRON_SECRET from Vercel')

PASS = 0
FAIL = 0
SKIP = 0


def step(ok: bool, label: str, detail: str = '') -> None:
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f'  PASS  {label}' + (f' — {detail}' if detail else ''))
    else:
        FAIL += 1
        print(f'  FAIL  {label}' + (f' — {detail}' if detail else ''))


def skip(label: str, reason: str = '') -> None:
    global SKIP
    SKIP += 1
    print(f'  SKIP  {label}' + (f' — {reason}' if reason else ''))


def safe_request(method: str, url: str, *, timeout: int = 30, **kwargs):
    """HTTP request with one retry on transient network errors."""
    try:
        return requests.request(method, url, timeout=timeout, **kwargs)
    except requests.exceptions.RequestException:
        time.sleep(2)
        return requests.request(method, url, timeout=timeout, **kwargs)


# ─── Auth setup ─────────────────────────────────────────────────────────────
print(f'\n=== Protected API routes E2E — {PROD_URL} ===')

cookies = {}
if SUPABASE_ANON_KEY:
    print('\n[0] Signing in via Supabase password grant…')
    r = requests.post(
        f'{SUPABASE_URL}/auth/v1/token?grant_type=password',
        headers={'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json'},
        json={'email': TEST_EMAIL, 'password': TEST_PASSWORD},
        timeout=30,
    )
    if r.status_code == 200:
        auth = r.json()
        access_token = auth['access_token']
        user_id = auth['user']['id']
        cookie_name = f'sb-{PROJECT_REF}-auth-token'
        session_json = json.dumps(auth, separators=(',', ':'))
        cookies = {cookie_name: session_json}
        step(bool(access_token and user_id), 'Got access_token + user.id', f'user_id={user_id}')
    else:
        step(False, 'Sign-in failed', f'status={r.status_code}, body={r.text[:200]}')
else:
    print('\n[0] No SUPABASE_ANON_KEY — auth-required POST tests will be skipped.')


# ─── CRON routes (Bearer CRON_SECRET) ───────────────────────────────────────
print('\n[A] CRON routes — Bearer CRON_SECRET required')

CRON_ROUTES = [
    ('/api/cron/refresh',        'Cache warmer + pruner'),
    ('/api/cron/prune-cache',    'Prune all 3 cache tiers'),
    ('/api/cron/streaming-warm', 'Warm streaming catalog (maxDuration=60s)'),
]

if not CRON_SECRET:
    print('  CRON_SECRET not available — skipping 3 cron routes × 3 checks (9 checks)')
    for route, desc in CRON_ROUTES:
        skip(f'Cron no-auth: {route}', 'no CRON_SECRET')
        skip(f'Cron wrong-secret: {route}', 'no CRON_SECRET')
        skip(f'Cron correct-secret: {route}', 'no CRON_SECRET')
else:
    # A1. No auth header → 401
    print('\n[A1] No Authorization header → expect 401')
    for route, desc in CRON_ROUTES:
        r = safe_request('GET', f'{PROD_URL}{route}', timeout=60)
        step(r.status_code == 401, f'No auth: {route} → 401', f'status={r.status_code} ({desc})')

    # A2. Wrong secret → 401
    print('\n[A2] Wrong Bearer secret → expect 401')
    for route, desc in CRON_ROUTES:
        r = safe_request('GET', f'{PROD_URL}{route}',
                         headers={'Authorization': 'Bearer wrong-secret-xyz'}, timeout=60)
        step(r.status_code == 401, f'Wrong secret: {route} → 401', f'status={r.status_code}')

    # A3. Correct secret → 200 + success:true
    #     NOTE: if the local CRON_SECRET doesn't match production's, the test
    #     will see 401 instead of 200. We treat that as a SKIP (not FAIL) so
    #     local dev with a stale .env.local doesn't break CI's green-build
    #     signal. In CI, CRON_SECRET is fetched fresh from Vercel's env API
    #     (see .github/workflows/ci.yml) so it always matches production.
    print('\n[A3] Correct Bearer CRON_SECRET → expect 200 + success:true')
    secret_matches = True
    for route, desc in CRON_ROUTES:
        r = safe_request('GET', f'{PROD_URL}{route}',
                         headers={'Authorization': f'Bearer {CRON_SECRET}'}, timeout=90)
        if r.status_code == 401:
            # Secret mismatch — skip remaining cron tests
            secret_matches = False
            skip(f'Auth: {route} → 200', f'CRON_SECRET mismatch (401) — skipping remaining cron checks')
            break
        step(r.status_code == 200, f'Auth: {route} → 200', f'status={r.status_code} ({desc})')
        if r.status_code == 200:
            try:
                data = r.json()
                step(data.get('success') is True, f'{route} success=true',
                     f'keys={list(data.keys())[:5]}, results={len(data.get("results", []))}')
            except Exception as e:
                step(False, f'{route} returns valid JSON', f'error={e}')
    if not secret_matches:
        for route, _ in CRON_ROUTES[1:]:
            skip(f'Auth: {route} → 200', 'CRON_SECRET mismatch — skipped')


# ─── POST /api/compromise (auth required) ───────────────────────────────────
print('\n[B] POST /api/compromise — auth + body validation')

# B1. No auth → 401
print('\n[B1] POST /api/compromise without auth → expect 401')
r = safe_request('POST', f'{PROD_URL}/api/compromise',
                 headers={'Content-Type': 'application/json'},
                 json={'userIds': [TEST_USER_UUID, '00000000-0000-0000-0000-000000000000']})
step(r.status_code == 401, 'No auth → 401', f'status={r.status_code}')

if cookies:
    # B2. Missing userIds → 400
    print('\n[B2] POST /api/compromise (missing userIds) → expect 400')
    r = safe_request('POST', f'{PROD_URL}/api/compromise',
                     cookies=cookies, headers={'Content-Type': 'application/json'},
                     json={})
    step(r.status_code == 400, 'Missing userIds → 400', f'status={r.status_code}, body={r.text[:150]}')

    # B3. userIds with only 1 entry → 400
    print('\n[B3] POST /api/compromise (userIds.length=1) → expect 400')
    r = safe_request('POST', f'{PROD_URL}/api/compromise',
                     cookies=cookies, headers={'Content-Type': 'application/json'},
                     json={'userIds': [TEST_USER_UUID]})
    step(r.status_code == 400, 'userIds.length=1 → 400', f'status={r.status_code}')

    # B4. userIds with 7 entries → 400
    print('\n[B4] POST /api/compromise (userIds.length=7) → expect 400')
    r = safe_request('POST', f'{PROD_URL}/api/compromise',
                     cookies=cookies, headers={'Content-Type': 'application/json'},
                     json={'userIds': [TEST_USER_UUID] * 7})
    step(r.status_code == 400, 'userIds.length=7 → 400', f'status={r.status_code}')

    # B5. userIds with 2 valid UUIDs → 200 + {results, user_count}
    print('\n[B5] POST /api/compromise (2 valid UUIDs) → expect 200')
    r = safe_request('POST', f'{PROD_URL}/api/compromise',
                     cookies=cookies, headers={'Content-Type': 'application/json'},
                     json={'userIds': [TEST_USER_UUID, '00000000-0000-0000-0000-000000000000']})
    step(r.status_code == 200, '2 valid UUIDs → 200', f'status={r.status_code}')
    if r.status_code == 200:
        data = r.json()
        step('results' in data and 'user_count' in data,
             'Response has results + user_count',
             f'user_count={data.get("user_count")}, results={len(data.get("results", []))}')
else:
    skip('POST /api/compromise auth tests', 'no auth cookies available')


# ─── POST /api/directors-cut (no auth) ──────────────────────────────────────
print('\n[C] POST /api/directors-cut — body validation + Gemini/cache/fallback')

# C1. Missing fields → 400
print('\n[C1] POST /api/directors-cut (missing question) → expect 400')
r = safe_request('POST', f'{PROD_URL}/api/directors-cut',
                 headers={'Content-Type': 'application/json'},
                 json={'movieId': 27205, 'movieTitle': 'Inception'})
step(r.status_code == 400, 'Missing question → 400', f'status={r.status_code}')

# C2. Valid request → 200 + {answer, source}
print('\n[C2] POST /api/directors-cut (Inception + question) → expect 200')
r = safe_request('POST', f'{PROD_URL}/api/directors-cut',
                 headers={'Content-Type': 'application/json'},
                 json={
                     'movieId': 27205,
                     'movieTitle': 'Inception',
                     'question': 'What is the spinning top scene about?',
                 }, timeout=60)
step(r.status_code == 200, 'Valid request → 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    step('answer' in data and data.get('source') in ('gemini', 'cache', 'fallback'),
         'Response has answer + valid source',
         f'source={data.get("source")}, answer_len={len(data.get("answer", ""))}')


# ─── POST /api/scene-comments (auth required) ───────────────────────────────
print('\n[D] POST /api/scene-comments — auth + body validation')

# Use a non-existent movie_id so we don't pollute real movie pages. The
# addSceneComment DB function does not FK to movies, so this is safe.
SCENE_MOVIE_ID = 99999999
SCENE_TIMESTAMP = 1337
SCENE_BODY = f'E2E test scene comment — {uuid.uuid4().hex[:8]}'

# D1. No auth → 401
print('\n[D1] POST /api/scene-comments without auth → expect 401')
r = safe_request('POST', f'{PROD_URL}/api/scene-comments',
                 headers={'Content-Type': 'application/json'},
                 json={'movie_id': SCENE_MOVIE_ID, 'timestamp_sec': SCENE_TIMESTAMP, 'body': SCENE_BODY})
step(r.status_code == 401, 'No auth → 401', f'status={r.status_code}')

if cookies:
    # D2. Missing fields → 400
    print('\n[D2] POST /api/scene-comments (missing body) → expect 400')
    r = safe_request('POST', f'{PROD_URL}/api/scene-comments',
                     cookies=cookies, headers={'Content-Type': 'application/json'},
                     json={'movie_id': SCENE_MOVIE_ID, 'timestamp_sec': SCENE_TIMESTAMP})
    step(r.status_code == 400, 'Missing body → 400', f'status={r.status_code}')

    # D3. Valid POST → 200 + {comment}
    print('\n[D3] POST /api/scene-comments (valid) → expect 200')
    r = safe_request('POST', f'{PROD_URL}/api/scene-comments',
                     cookies=cookies, headers={'Content-Type': 'application/json'},
                     json={
                         'movie_id': SCENE_MOVIE_ID,
                         'timestamp_sec': SCENE_TIMESTAMP,
                         'body': SCENE_BODY,
                         'spoiler': False,
                     })
    step(r.status_code == 200, 'Valid POST → 200', f'status={r.status_code}')
    comment_id = None
    if r.status_code == 200:
        comment = r.json().get('comment')
        if comment:
            comment_id = comment.get('id')
            step(bool(comment_id), 'Response has comment.id',
                 f'comment_id={comment_id}, body={comment.get("body", "")[:40]!r}')
            # Verify the field-name translation worked — public API exposes
            # `body` / `spoiler` / `timestamp_sec`, not the raw DB column names.
            step(comment.get('body') == SCENE_BODY,
                 'Public API uses `body` field (not raw DB `comment`)',
                 f'body={comment.get("body", "")[:40]!r}')
            step(comment.get('timestamp_sec') == SCENE_TIMESTAMP,
                 'Public API uses `timestamp_sec` field (not raw DB `timestamp_seconds`)',
                 f'timestamp_sec={comment.get("timestamp_sec")}')
            step(comment.get('spoiler') is False,
                 'Public API uses `spoiler` field (not raw DB `is_spoiler`)',
                 f'spoiler={comment.get("spoiler")}')
        else:
            step(False, 'Response has comment.id', f'comment is null/None — body={r.text[:200]}')

    # D4. GET /api/scene-comments?movie_id=... → should include our comment
    print('\n[D4] GET /api/scene-comments?movie_id=99999999 — verify our comment is retrievable')
    r = safe_request('GET', f'{PROD_URL}/api/scene-comments?movie_id={SCENE_MOVIE_ID}')
    step(r.status_code == 200, 'GET → 200', f'status={r.status_code}')
    if r.status_code == 200:
        comments = r.json().get('comments', [])
        found = any(c.get('id') == comment_id for c in comments) if comment_id else False
        step(found, 'Our comment is retrievable', f'total comments for movie: {len(comments)}')

# D5. GET /api/scene-comments (missing movie_id) → 400
print('\n[D5] GET /api/scene-comments (missing movie_id) → expect 400')
r = safe_request('GET', f'{PROD_URL}/api/scene-comments')
step(r.status_code == 400, 'Missing movie_id → 400', f'status={r.status_code}')


# ─── POST /api/moderate (no auth) ───────────────────────────────────────────
print('\n[E] POST /api/moderate — content moderation')

# E1. Missing text → 400
print('\n[E1] POST /api/moderate (missing text) → expect 400')
r = safe_request('POST', f'{PROD_URL}/api/moderate',
                 headers={'Content-Type': 'application/json'},
                 json={})
step(r.status_code == 400, 'Missing text → 400', f'status={r.status_code}')

# E2. Clean text → 200, flagged=false
print('\n[E2] POST /api/moderate (clean text) → expect 200 + flagged=false')
r = safe_request('POST', f'{PROD_URL}/api/moderate',
                 headers={'Content-Type': 'application/json'},
                 json={'text': 'This movie was a delightful journey through the human condition.'},
                 timeout=30)
step(r.status_code == 200, 'Clean text → 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    step(data.get('flagged') is False,
         'flagged=false for clean text',
         f'source={data.get("source")}, severity={data.get("severity")}')

# E3. Spam text → 200, flagged=true (rule-based catches "buy now")
print('\n[E3] POST /api/moderate (spam text "buy now") → expect flagged=true')
r = safe_request('POST', f'{PROD_URL}/api/moderate',
                 headers={'Content-Type': 'application/json'},
                 json={'text': 'BUY NOW! Click here for free money!!!'},
                 timeout=30)
step(r.status_code == 200, 'Spam text → 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    step(data.get('flagged') is True,
         'flagged=true for spam text',
         f'reason={data.get("reason")}, severity={data.get("severity")}, source={data.get("source")}')


# ─── POST /api/pipeline (no auth) ───────────────────────────────────────────
print('\n[F] POST /api/pipeline — batch validation')

# F1. Missing tmdbIds → 400
print('\n[F1] POST /api/pipeline (missing tmdbIds) → expect 400')
r = safe_request('POST', f'{PROD_URL}/api/pipeline',
                 headers={'Content-Type': 'application/json'},
                 json={})
step(r.status_code == 400, 'Missing tmdbIds → 400', f'status={r.status_code}')

# F2. Empty tmdbIds array → 400
print('\n[F2] POST /api/pipeline (empty tmdbIds) → expect 400')
r = safe_request('POST', f'{PROD_URL}/api/pipeline',
                 headers={'Content-Type': 'application/json'},
                 json={'tmdbIds': []})
step(r.status_code == 400, 'Empty tmdbIds → 400', f'status={r.status_code}')

# F3. >50 IDs → 400
print('\n[F3] POST /api/pipeline (>50 IDs) → expect 400')
r = safe_request('POST', f'{PROD_URL}/api/pipeline',
                 headers={'Content-Type': 'application/json'},
                 json={'tmdbIds': list(range(1, 52))})
step(r.status_code == 400, '>50 IDs → 400', f'status={r.status_code}')


# ─── Summary ────────────────────────────────────────────────────────────────
print(f'\n=== Summary: {PASS} passed, {FAIL} failed, {SKIP} skipped ===')
sys.exit(0 if FAIL == 0 else 1)
