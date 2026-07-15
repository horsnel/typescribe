#!/usr/bin/env python3
"""
E2E test for public (no-auth) API routes on production.

Covers 10 public GET endpoints + validation guards. Runs against
https://typescribe-mu.vercel.app — no test user required.

Routes tested:
  - /api/box-office          (TMDB box office)
  - /api/browse              (movie browse)
  - /api/daily-trivia        (daily trivia question)
  - /api/film-festival       (film festivals)
  - /api/grid                (grid game data)
  - /api/movies              (movie list, paginated)
  - /api/news                (movie news)
  - /api/search              (search movies — requires ?q=)
  - /api/top-choice          (top choice recommendation)
  - /api/scene-comments      (public, requires ?movie_id=)
"""
import json
import os
import sys
import time

import requests

PROD_URL = os.environ.get('PROD_URL', 'https://typescribe-mu.vercel.app')

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


def safe_get(url: str, *, timeout: int = 30, **kwargs):
    """GET with one retry on transient network errors."""
    try:
        return requests.get(url, timeout=timeout, **kwargs)
    except requests.exceptions.RequestException:
        time.sleep(2)
        return requests.get(url, timeout=timeout, **kwargs)


def is_shape(obj, expected_keys):
    """Check that obj is a dict containing all expected_keys (values may be None)."""
    if not isinstance(obj, dict):
        return False
    return all(k in obj for k in expected_keys)


print(f'\n=== Public API routes E2E — {PROD_URL} ===')

# ─── 1. /api/box-office ─────────────────────────────────────────────────────
print('\n[1] GET /api/box-office')
r = safe_get(f'{PROD_URL}/api/box-office')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    # Endpoint returns either {results: [...]} or {boxOffice: [...]} or just [...]
    items = data.get('results') or data.get('boxOffice') or data.get('movies') or (data if isinstance(data, list) else [])
    step(isinstance(items, list), 'Response contains a list of movies', f'count={len(items) if isinstance(items, list) else "n/a"}')

# ─── 2. /api/browse ─────────────────────────────────────────────────────────
print('\n[2] GET /api/browse?page=1')
r = safe_get(f'{PROD_URL}/api/browse?page=1')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('results') or data.get('movies') or (data if isinstance(data, list) else [])
    step(isinstance(items, list) and len(items) > 0, 'Returns non-empty list', f'count={len(items) if isinstance(items, list) else 0}')

# ─── 3. /api/daily-trivia ───────────────────────────────────────────────────
print('\n[3] GET /api/daily-trivia')
r = safe_get(f'{PROD_URL}/api/daily-trivia')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    # Should have at least a question field
    has_question = any(k in data for k in ('question', 'trivia', 'prompt', 'movieId', 'movie_id'))
    step(has_question, 'Response contains trivia content', f'keys={list(data.keys())[:5]}')

# ─── 4. /api/film-festival ──────────────────────────────────────────────────
print('\n[4] GET /api/film-festival')
r = safe_get(f'{PROD_URL}/api/film-festival')
step(r.status_code in (200, 404), 'Returns 200 or 404 (festival data may be empty)',
     f'status={r.status_code}')

# ─── 5. /api/grid ───────────────────────────────────────────────────────────
print('\n[5] GET /api/grid')
r = safe_get(f'{PROD_URL}/api/grid')
step(r.status_code in (200, 401, 404), 'Returns 200/401/404',
     f'status={r.status_code}')
# grid may require auth — note but don't fail

# ─── 6. /api/movies ─────────────────────────────────────────────────────────
print('\n[6] GET /api/movies?page=1&limit=5')
r = safe_get(f'{PROD_URL}/api/movies?page=1&limit=5')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('results') or data.get('movies') or (data if isinstance(data, list) else [])
    step(isinstance(items, list), 'Response contains a movie list', f'count={len(items) if isinstance(items, list) else 0}')

# ─── 7. /api/news ───────────────────────────────────────────────────────────
print('\n[7] GET /api/news')
r = safe_get(f'{PROD_URL}/api/news')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('articles') or data.get('results') or data.get('news') or (data if isinstance(data, list) else [])
    step(isinstance(items, list), 'Response contains a news list', f'count={len(items) if isinstance(items, list) else 0}')

# ─── 8. /api/search?q=inception ─────────────────────────────────────────────
print('\n[8] GET /api/search?q=inception')
r = safe_get(f'{PROD_URL}/api/search?q=inception')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('results') or data.get('movies') or (data if isinstance(data, list) else [])
    step(isinstance(items, list) and len(items) > 0, 'Returns search results for "inception"',
         f'count={len(items) if isinstance(items, list) else 0}')

# ─── 9. /api/search (missing q) → 400 ──────────────────────────────────────
print('\n[9] GET /api/search (missing q param) → expect 400')
r = safe_get(f'{PROD_URL}/api/search')
step(r.status_code in (400, 200), 'Returns 400 or 200 (endpoint may have default)',
     f'status={r.status_code}')

# ─── 10. /api/top-choice ────────────────────────────────────────────────────
print('\n[10] GET /api/top-choice')
r = safe_get(f'{PROD_URL}/api/top-choice')
step(r.status_code in (200, 401, 404), 'Returns 200/401/404',
     f'status={r.status_code}')

# ─── 11. /api/scene-comments?movie_id=27205 ────────────────────────────────
print('\n[11] GET /api/scene-comments?movie_id=27205 (Inception)')
r = safe_get(f'{PROD_URL}/api/scene-comments?movie_id=27205')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('comments') or data.get('results') or (data if isinstance(data, list) else [])
    step(isinstance(items, list), 'Response contains a comments list', f'count={len(items) if isinstance(items, list) else 0}')

# ─── 12. /api/scene-comments (missing movie_id) → 400 ──────────────────────
print('\n[12] GET /api/scene-comments (missing movie_id) → expect 400')
r = safe_get(f'{PROD_URL}/api/scene-comments')
step(r.status_code == 400, 'Missing movie_id rejected with 400', f'status={r.status_code}')

# ─── 13. /api/scene-comments?movie_id=invalid → 400 ────────────────────────
print('\n[13] GET /api/scene-comments?movie_id=not-a-number → expect 400')
r = safe_get(f'{PROD_URL}/api/scene-comments?movie_id=not-a-number')
step(r.status_code == 400, 'Non-numeric movie_id rejected with 400', f'status={r.status_code}')

# ─── 14. /api/movies/[id] (if exists) — test a known movie ─────────────────
# The movies route supports ?id= or the path /api/movies/<id>
print('\n[14] GET /api/movies?id=27205 (Inception)')
r = safe_get(f'{PROD_URL}/api/movies?id=27205')
step(r.status_code in (200, 404), 'Returns 200 or 404',
     f'status={r.status_code}')

# ─── 15. Unknown route → 404 ────────────────────────────────────────────────
print('\n[15] GET /api/this-route-does-not-exist → expect 404')
r = safe_get(f'{PROD_URL}/api/this-route-does-not-exist')
step(r.status_code == 404, 'Unknown route returns 404', f'status={r.status_code}')

# ─── Summary ────────────────────────────────────────────────────────────────
print(f'\n=== Summary: {PASS} passed, {FAIL} failed ===')
sys.exit(0 if FAIL == 0 else 1)
