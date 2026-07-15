#!/usr/bin/env python3
"""
Page-level smoke tests for key public pages on production.

Hits each page and verifies:
  - HTTP 200
  - HTML body contains expected marker text (proves the right page rendered)
  - No error boundary string ("Application error") in the response

Pages tested (all public, no auth required):
  - /                     (homepage — hero + sections)
  - /stream               (free streaming catalog)
  - /browse               (movie browse)
  - /top-rated            (top rated movies)
  - /upcoming             (upcoming movies)
  - /new-releases         (new releases)
  - /category/action      (category page)
  - /anime                (anime landing)
  - /communities          (communities list)
  - /news                 (movie news)
  - /login                (login page)
  - /signup               (signup page)
  - /about                (about page)
  - /profile/<UUID>       (public profile — uses known test user)
  - /movie/inception-27205 (movie detail page)
  - /search?q=inception   (search results)
  - /mood                 (mood browsing)
  - /watchlist            (watchlist — may redirect to login, 200 or 307)
"""
import os
import sys
import time

import requests

PROD_URL = os.environ.get('PROD_URL', 'https://typescribe-mu.vercel.app')
TEST_USER_UUID = os.environ.get('TEST_USER_UUID', '8e375239-f2bd-49f9-a786-750bf0e0c3c5')

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


def safe_get(url: str, *, timeout: int = 30, allow_redirects: bool = True, **kwargs):
    """GET with one retry on transient network errors."""
    try:
        return requests.get(url, timeout=timeout, allow_redirects=allow_redirects, **kwargs)
    except requests.exceptions.RequestException:
        time.sleep(2)
        return requests.get(url, timeout=timeout, allow_redirects=allow_redirects, **kwargs)


def check_page(path: str, *, expected_marker: str, label: str, allow_redirect: bool = False) -> None:
    """Fetch a page and verify 200 + expected marker + no error boundary."""
    url = f'{PROD_URL}{path}'
    r = safe_get(url, allow_redirects=allow_redirect)
    ok_status = r.status_code == 200
    step(ok_status, f'{label}: returns 200', f'status={r.status_code}')
    if ok_status:
        body = r.text
        has_marker = expected_marker.lower() in body.lower()
        step(has_marker, f'{label}: contains expected marker "{expected_marker}"',
             f'marker={"found" if has_marker else "MISSING"}')
        no_error = 'application error' not in body.lower() and 'internal server error' not in body.lower()
        step(no_error, f'{label}: no error boundary', f'error={"none" if no_error else "DETECTED"}')


print(f'\n=== Page smoke tests — {PROD_URL} ===')

# ─── 1. Homepage ────────────────────────────────────────────────────────────
print('\n[1] /')
check_page('/', expected_marker='Typescribe', label='Homepage')

# ─── 2. Stream page ─────────────────────────────────────────────────────────
print('\n[2] /stream')
check_page('/stream', expected_marker='Watch Now', label='Stream page')

# ─── 3. Browse page ─────────────────────────────────────────────────────────
print('\n[3] /browse')
check_page('/browse', expected_marker='Browse', label='Browse page')

# ─── 4. Top rated ───────────────────────────────────────────────────────────
print('\n[4] /top-rated')
check_page('/top-rated', expected_marker='Top Rated', label='Top Rated page')

# ─── 5. Upcoming ────────────────────────────────────────────────────────────
print('\n[5] /upcoming')
check_page('/upcoming', expected_marker='Upcoming', label='Upcoming page')

# ─── 6. New releases ────────────────────────────────────────────────────────
print('\n[6] /new-releases')
check_page('/new-releases', expected_marker='New Releases', label='New Releases page')

# ─── 7. Category page ───────────────────────────────────────────────────────
print('\n[7] /category/action')
check_page('/category/action', expected_marker='Action', label='Category: Action')

# ─── 8. Anime detail page (Naruto — tmdb_id 46260, client-rendered) ─────────
print('\n[8] /anime/46260 (Naruto)')
check_page('/anime/46260', expected_marker='anime', label='Anime detail: Naruto')

# ─── 9. Communities ─────────────────────────────────────────────────────────
print('\n[9] /communities')
check_page('/communities', expected_marker='Communit', label='Communities page')

# ─── 10. News ───────────────────────────────────────────────────────────────
print('\n[10] /news')
check_page('/news', expected_marker='News', label='News page')

# ─── 11. Login ──────────────────────────────────────────────────────────────
print('\n[11] /login')
check_page('/login', expected_marker='Sign', label='Login page')

# ─── 12. Signup ─────────────────────────────────────────────────────────────
print('\n[12] /signup')
check_page('/signup', expected_marker='Sign', label='Signup page')

# ─── 13. About ──────────────────────────────────────────────────────────────
print('\n[13] /about')
check_page('/about', expected_marker='Typescribe', label='About page')

# ─── 14. Public profile (known test user UUID) ──────────────────────────────
print('\n[14] /profile/<test-user-uuid>')
check_page(f'/profile/{TEST_USER_UUID}', expected_marker='profile', label='Public profile')

# ─── 15. Movie detail page ──────────────────────────────────────────────────
print('\n[15] /movie/inception-27205')
check_page('/movie/inception-27205', expected_marker='Inception', label='Movie detail: Inception')

# ─── 16. Search results page (client-rendered — check for "Search" label) ───
print('\n[16] /search?q=inception')
check_page('/search?q=inception', expected_marker='Search', label='Search page')

# ─── 17. Mood browsing ──────────────────────────────────────────────────────
print('\n[17] /mood')
check_page('/mood', expected_marker='mood', label='Mood page')

# ─── 18. Watchlist (may redirect to login — accept 200 or 307) ──────────────
print('\n[18] /watchlist (no auth — may redirect)')
r = safe_get(f'{PROD_URL}/watchlist', allow_redirects=False)
step(r.status_code in (200, 307, 302), 'Watchlist: returns 200 or redirect',
     f'status={r.status_code}')

# ─── 19. 404 page ───────────────────────────────────────────────────────────
print('\n[19] /this-page-does-not-exist → expect 404')
r = safe_get(f'{PROD_URL}/this-page-does-not-exist')
step(r.status_code == 404, 'Unknown route returns 404', f'status={r.status_code}')

# ─── 20. Person detail page (if exists) ─────────────────────────────────────
print('\n[20] /person/138 (Tom Hanks — person page)')
r = safe_get(f'{PROD_URL}/person/138')
step(r.status_code in (200, 404), 'Person page: 200 or 404', f'status={r.status_code}')

# ─── Summary ────────────────────────────────────────────────────────────────
print(f'\n=== Summary: {PASS} passed, {FAIL} failed ===')
sys.exit(0 if FAIL == 0 else 1)
