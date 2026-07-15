#!/usr/bin/env python3
"""
E2E test for Task ID 5 (continued session):
  1. PUT /api/diary/[id]  — edit a diary entry (rating, notes, rewatch, location)
  2. GET /api/reviews?user_id=<UUID> — public profile reviews endpoint
  3. Verify auth/ownership/validation guards

Runs against production (https://typescribe-mu.vercel.app) using the test user
created in the prior session:
    email:    testuser-e2e@typescribe.local
    password: TestPass!2025
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

# Pull anon key from .env.local
SUPABASE_ANON_KEY = ''
env_path = '/home/z/my-project/typescribe/.env.local'
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
                SUPABASE_ANON_KEY = line.split('=', 1)[1].strip().strip('"').strip("'")
                break
if not SUPABASE_ANON_KEY:
    print('ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY not found')
    sys.exit(1)

PASS = 0
FAIL = 0

def step(ok, label, detail=''):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f'  PASS  {label}' + (f' — {detail}' if detail else ''))
    else:
        FAIL += 1
        print(f'  FAIL  {label}' + (f' — {detail}' if detail else ''))

# ─── Sign in via Supabase password grant ────────────────────────────────────
print('\n=== Task ID 5 (continued session) — E2E test against production ===')
print(f'  Prod URL: {PROD_URL}')
print(f'  Supabase URL: {SUPABASE_URL}')
print(f'  Test user: {TEST_EMAIL}')

print('\n[1] Signing in via Supabase password grant…')
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

# ─── Step 2: Create a diary entry to edit ───────────────────────────────────
print('\n[2] Creating a diary entry to edit (POST /api/diary)…')
create_body = {
    'movie_id': 27205,  # Inception
    'movie_title': 'Inception',
    'watched_on': '2024-01-15',
    'rating': 8,
    'rewatch': False,
    'location': 'Cinema',
    'notes': 'Original entry — testing edit functionality.',
}
r = requests.post(f'{PROD_URL}/api/diary', cookies=cookies, json=create_body, timeout=30)
print(f'  status={r.status_code}')
if r.status_code != 201:
    print(f'  body={r.text[:500]}')
    sys.exit(1)
entry = r.json().get('entry')
step(entry is not None, 'Created diary entry',
     f'id={entry.get("id")[:8]}… rating={entry.get("rating")}')
if not entry:
    sys.exit(1)
entry_id = entry['id']

# ─── Step 3: PUT /api/diary/[id] — partial update ─────────────────────────
print('\n[3] PUT /api/diary/[id] — updating rating, notes, rewatch, location…')
update_body = {
    'rating': 9,
    'rewatch': True,
    'location': 'IMAX',
    'notes': 'EDITED: Watched again, even better the second time!',
}
r = requests.put(f'{PROD_URL}/api/diary/{entry_id}', cookies=cookies, json=update_body, timeout=30)
print(f'  status={r.status_code}')
updated = r.json().get('entry') if r.status_code == 200 else None
step(r.status_code == 200 and updated is not None, 'PUT /api/diary/[id] returned 200',
     f'status={r.status_code}')
if updated:
    step(updated.get('rating') == 9, 'rating updated to 9', f'got={updated.get("rating")}')
    step(updated.get('rewatch') == True, 'rewatch updated to True', f'got={updated.get("rewatch")}')
    step(updated.get('location') == 'IMAX', 'location updated to IMAX', f'got={updated.get("location")}')
    step('EDITED' in (updated.get('notes') or ''), 'notes updated', f'got={(updated.get("notes") or "")[:40]}…')
    # watched_on should NOT have been touched (partial update)
    step(updated.get('watched_on', '').startswith('2024-01-15'), 'watched_on unchanged',
         f'got={updated.get("watched_on")}')

# ─── Step 4: Verify update persisted via GET /api/diary ────────────────────
print('\n[4] Verifying the update persisted via GET /api/diary…')
r = requests.get(f'{PROD_URL}/api/diary?limit=200', cookies=cookies, timeout=30)
entries = r.json().get('entries', []) if r.status_code == 200 else []
found = next((e for e in entries if e.get('id') == entry_id), None)
step(found is not None, 'Found our entry in the diary list')
if found:
    step(found.get('rating') == 9, 'Persisted rating=9', f'got={found.get("rating")}')
    step(found.get('rewatch') == True, 'Persisted rewatch=True', f'got={found.get("rewatch")}')

# ─── Step 5: PUT with invalid rating → 400 ────────────────────────────────
print('\n[5] PUT /api/diary/[id] with invalid rating → expect 400…')
r = requests.put(f'{PROD_URL}/api/diary/{entry_id}', cookies=cookies,
                 json={'rating': 11}, timeout=30)
step(r.status_code == 400, 'Invalid rating rejected with 400', f'status={r.status_code}')

# ─── Step 6: PUT with no fields → 400 ─────────────────────────────────────
print('\n[6] PUT /api/diary/[id] with empty body → expect 400…')
r = requests.put(f'{PROD_URL}/api/diary/{entry_id}', cookies=cookies,
                 json={}, timeout=30)
step(r.status_code == 400, 'Empty body rejected with 400', f'status={r.status_code}')

# ─── Step 7: PUT without auth → 401 ───────────────────────────────────────
print('\n[7] PUT /api/diary/[id] without auth → expect 401…')
r = requests.put(f'{PROD_URL}/api/diary/{entry_id}', json={'rating': 5}, timeout=30)
step(r.status_code == 401, 'Unauthenticated PUT rejected with 401', f'status={r.status_code}')

# ─── Step 8: PUT on a non-existent id → 404 ───────────────────────────────
print('\n[8] PUT /api/diary/<fake-uuid> → expect 404…')
r = requests.put(f'{PROD_URL}/api/diary/00000000-0000-0000-0000-000000000000',
                 cookies=cookies, json={'rating': 5}, timeout=30)
step(r.status_code == 404, 'Non-existent id returns 404', f'status={r.status_code}')

# ─── Step 9: GET /api/reviews?user_id=<UUID> — public profile endpoint ────
print(f'\n[9] GET /api/reviews?user_id={user_id} — public profile endpoint…')
r = requests.get(f'{PROD_URL}/api/reviews?user_id={user_id}&limit=50', timeout=30)
step(r.status_code == 200, 'GET ?user_id returned 200 (public, no auth)', f'status={r.status_code}')
reviews = r.json().get('reviews', []) if r.status_code == 200 else []
step(isinstance(reviews, list), 'Response contains a reviews array', f'count={len(reviews)}')

# ─── Step 10: Create a review so we have something to fetch ───────────────
print('\n[10] Creating a review so we have something to fetch via the public endpoint…')
review_body = {
    'movie_id': 27205,
    'movie_title': 'Inception',
    'rating': 10,
    'title': 'A masterclass in narrative structure',
    'body': "Nolan's best work. The dream-within-a-dream heist is both emotionally resonant and intellectually stimulating. The ending still haunts me years later.",
    'spoiler': False,
}
r = requests.post(f'{PROD_URL}/api/reviews', cookies=cookies, json=review_body, timeout=30)
print(f'  status={r.status_code}')
created_review = r.json().get('review') if r.status_code == 201 else None
step(created_review is not None, 'Created review for public fetch',
     f'id={created_review.get("id")[:8] if created_review else None}…')
review_id = created_review['id'] if created_review else None

# ─── Step 11: GET /api/reviews?user_id=<UUID> — should now have our review ─
print('\n[11] GET /api/reviews?user_id=<UUID> — should now include our new review…')
r = requests.get(f'{PROD_URL}/api/reviews?user_id={user_id}&limit=50', timeout=30)
reviews = r.json().get('reviews', []) if r.status_code == 200 else []
found_review = next((rv for rv in reviews if rv.get('id') == review_id), None) if review_id else None
step(found_review is not None, 'Public endpoint returns our review', f'count={len(reviews)}')
if found_review:
    step(found_review.get('author') is not None, 'Review has author join populated',
         f'author.display_name={(found_review.get("author") or {}).get("display_name")}')
    step(found_review.get('movie_title') == 'Inception', 'movie_title correct',
         f'got={found_review.get("movie_title")}')
    step(found_review.get('rating') == 10, 'rating correct', f'got={found_review.get("rating")}')

# ─── Step 12: GET /api/reviews?user_id=invalid → 400 ──────────────────────
print('\n[12] GET /api/reviews?user_id=not-a-uuid → expect 400…')
r = requests.get(f'{PROD_URL}/api/reviews?user_id=not-a-uuid', timeout=30)
step(r.status_code == 400, 'Invalid user_id rejected with 400', f'status={r.status_code}')

# ─── Step 13: Cleanup ──────────────────────────────────────────────────────
print('\n[13] Cleanup — deleting the test review + diary entry…')
if review_id:
    r = requests.delete(f'{PROD_URL}/api/reviews/{review_id}', cookies=cookies, timeout=30)
    step(r.status_code == 200, 'Deleted test review', f'status={r.status_code}')

r = requests.delete(f'{PROD_URL}/api/diary/{entry_id}', cookies=cookies, timeout=30)
step(r.status_code == 200, 'Deleted test diary entry', f'status={r.status_code}')

# ─── Summary ───────────────────────────────────────────────────────────────
print(f'\n=== Summary: {PASS} passed, {FAIL} failed ===')
sys.exit(0 if FAIL == 0 else 1)
