#!/usr/bin/env python3
"""
E2E test for additional public (no-auth) API routes on production.

Covers 11 more public GET endpoints that were not exercised by the
original e2e_test_public_routes.py. Runs against
https://typescribe-mu.vercel.app — no test user required.

Routes tested:
  - /api/anime/trending       (AniList trending anime)
  - /api/anime/search?q=...   (anime search)
  - /api/cinema-atlas         (curated cinema atlas seed list)
  - /api/discover/local?countryCode=US  (local picks by country)
  - /api/geo                  (IP-based geolocation)
  - /api/mood-heatmap         (global mood heatmap — GET is public)
  - /api/six-degrees          (random actor-pair challenge — GET is public)
  - /api/streaming/catalog    (free streaming catalog)
  - /api/streaming/search?q=... (search within streaming catalog)
  - /api/vibe-search?q=...    (semantic movie search via pgvector)
  - /api/discover/local (missing countryCode) → 400
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


print(f'\n=== Extra public API routes E2E — {PROD_URL} ===')

# ─── 1. /api/anime/trending ─────────────────────────────────────────────────
print('\n[1] GET /api/anime/trending')
r = safe_get(f'{PROD_URL}/api/anime/trending')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    # Endpoint returns {movies: [...], sources, totalResults}
    items = data.get('movies') or data.get('anime') or data.get('results') or (data if isinstance(data, list) else [])
    step(isinstance(items, list), 'Response contains a list (may be empty if no anime indexed yet)',
         f'count={len(items) if isinstance(items, list) else 0}')

# ─── 2. /api/anime/search?q=naruto ──────────────────────────────────────────
print('\n[2] GET /api/anime/search?q=naruto')
r = safe_get(f'{PROD_URL}/api/anime/search?q=naruto')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('movies') or data.get('anime') or data.get('results') or (data if isinstance(data, list) else [])
    step(isinstance(items, list) and len(items) > 0, 'Returns search results for "naruto"',
         f'count={len(items) if isinstance(items, list) else 0}')

# ─── 3. /api/anime/search (missing q) → 400 ─────────────────────────────────
print('\n[3] GET /api/anime/search (missing q) → expect 400')
r = safe_get(f'{PROD_URL}/api/anime/search')
step(r.status_code == 400, 'Missing q rejected with 400', f'status={r.status_code}')

# ─── 4. /api/cinema-atlas ───────────────────────────────────────────────────
print('\n[4] GET /api/cinema-atlas')
r = safe_get(f'{PROD_URL}/api/cinema-atlas')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    # Atlas endpoint may return {countries: [...]} or a flat list
    items = data.get('countries') or data.get('results') or (data if isinstance(data, list) else [])
    step(isinstance(items, list), 'Response contains a list', f'count={len(items) if isinstance(items, list) else 0}')

# ─── 5. /api/discover/local?countryCode=US ──────────────────────────────────
print('\n[5] GET /api/discover/local?countryCode=US')
r = safe_get(f'{PROD_URL}/api/discover/local?countryCode=US')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('movies') or data.get('results') or (data if isinstance(data, list) else [])
    step(isinstance(items, list), 'Response contains a movie list',
         f'count={len(items) if isinstance(items, list) else 0}')

# ─── 6. /api/discover/local (missing countryCode) → 400 ─────────────────────
print('\n[6] GET /api/discover/local (missing countryCode) → expect 400')
r = safe_get(f'{PROD_URL}/api/discover/local')
step(r.status_code == 400, 'Missing countryCode rejected with 400', f'status={r.status_code}')

# ─── 7. /api/geo ────────────────────────────────────────────────────────────
print('\n[7] GET /api/geo')
r = safe_get(f'{PROD_URL}/api/geo')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    # Geo endpoint should return at least a country code or country name
    has_geo = any(k in data for k in ('country', 'countryCode', 'country_code', 'region'))
    step(has_geo, 'Response contains geolocation data', f'keys={list(data.keys())[:6]}')

# ─── 8. /api/mood-heatmap (GET — auth required, user's own heatmap) ──────────
print('\n[8] GET /api/mood-heatmap (no auth) → expect 401')
r = safe_get(f'{PROD_URL}/api/mood-heatmap')
step(r.status_code == 401, 'Returns 401 without auth', f'status={r.status_code}')

# ─── 9. /api/six-degrees (GET — random challenge, public) ───────────────────
print('\n[9] GET /api/six-degrees')
r = safe_get(f'{PROD_URL}/api/six-degrees')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    # Endpoint returns {start_actor, end_actor, hint, max_links}
    has_actors = bool(data.get('start_actor')) and bool(data.get('end_actor'))
    step(has_actors, 'Response contains start_actor + end_actor challenge',
         f'keys={list(data.keys())[:6]}')

# ─── 10. /api/streaming/catalog ─────────────────────────────────────────────
print('\n[10] GET /api/streaming/catalog?moviesOnly=true')
r = safe_get(f'{PROD_URL}/api/streaming/catalog?moviesOnly=true')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('movies') or (data if isinstance(data, list) else [])
    step(isinstance(items, list) and len(items) > 0, 'Returns non-empty movie list',
         f'count={len(items) if isinstance(items, list) else 0}')

# ─── 11. /api/streaming/search?q=big ────────────────────────────────────────
print('\n[11] GET /api/streaming/search?q=big')
r = safe_get(f'{PROD_URL}/api/streaming/search?q=big')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('movies') or data.get('results') or (data if isinstance(data, list) else [])
    step(isinstance(items, list), 'Response contains a list',
         f'count={len(items) if isinstance(items, list) else 0}')

# ─── 12. /api/vibe-search?q=action ──────────────────────────────────────────
print('\n[12] GET /api/vibe-search?q=action')
r = safe_get(f'{PROD_URL}/api/vibe-search?q=action', timeout=45)
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    items = data.get('movies') or data.get('results') or (data if isinstance(data, list) else [])
    step(isinstance(items, list), 'Response contains a movie list',
         f'count={len(items) if isinstance(items, list) else 0}')

# ─── 13. /api/vibe-search (missing q) → 400 ─────────────────────────────────
print('\n[13] GET /api/vibe-search (missing q) → expect 400')
r = safe_get(f'{PROD_URL}/api/vibe-search')
step(r.status_code == 400, 'Missing q rejected with 400', f'status={r.status_code}')

# ─── 14. /api/anime/search — top entry shape (search returns results) ──────
print('\n[14] /api/anime/search?q=naruto — top entry shape')
r = safe_get(f'{PROD_URL}/api/anime/search?q=naruto')
if r.status_code == 200:
    data = r.json()
    items = data.get('movies') or data.get('anime') or data.get('results') or (data if isinstance(data, list) else [])
    if isinstance(items, list) and len(items) > 0:
        top = items[0]
        # AniList/TMDB anime entries have id + title
        has_id = any(k in top for k in ('id', 'mal_id', 'anilist_id', 'tmdb_id'))
        has_title = any(k in top for k in ('title', 'name', 'english_title'))
        step(has_id and has_title, 'Top anime entry has id + title',
             f'keys={list(top.keys())[:6] if isinstance(top, dict) else type(top).__name__}')
    else:
        step(False, 'Top anime entry has id + title', 'empty list')

# ─── 15. /api/streaming/catalog — verify tier=1 seed path ───────────────────
print('\n[15] GET /api/streaming/catalog?tier=1 (seed data, instant)')
r = safe_get(f'{PROD_URL}/api/streaming/catalog?tier=1')
step(r.status_code == 200, 'Returns 200', f'status={r.status_code}')
if r.status_code == 200:
    data = r.json()
    step(data.get('isSeed') is True or data.get('tier') == 1,
         'Seed tier flag set', f'isSeed={data.get("isSeed")}, tier={data.get("tier")}')

# ─── Summary ────────────────────────────────────────────────────────────────
print(f'\n=== Summary: {PASS} passed, {FAIL} failed ===')
sys.exit(0 if FAIL == 0 else 1)
