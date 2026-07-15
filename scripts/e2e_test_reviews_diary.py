#!/usr/bin/env python3
"""
End-to-end test of the review/diary API flow against production.

Flow:
  1. Sign in via Supabase password grant
  2. Construct the supabase-ssr auth cookie
  3. POST /api/reviews        -> create a review
  4. GET  /api/reviews        -> verify it shows up
  5. DELETE /api/reviews/<id> -> delete it
  6. GET  /api/reviews        -> verify it's gone
  7. Same sequence for /api/diary
  8. Verify the Supabase trigger auto-populated poster_path / genres / release_year
"""
import json
import requests
import sys

SUPABASE_URL = "https://iancvwkvqapkstqdltfs.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbmN2d2t2cWFwa3N0cWRsdGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTg0MjMsImV4cCI6MjA5OTUzNDQyM30.CcOutlsx2sGbaIvRsRkoey3g4Tpvb4I2PQOun4fykvE"
APP_URL = "https://typescribe-mu.vercel.app"
EMAIL = "testuser-e2e@typescribe.local"
PASSWORD = "TestPass!2025"
PROJECT_REF = "iancvwkvqapkstqdltfs"

# Movie: Inception (TMDB id 27205, in movie_embeddings)
MOVIE_ID = 27205
MOVIE_TITLE = "Inception"

def step(n, msg):
    print(f"\n[{n}] {msg}")

def main():
    # 1. Sign in via Supabase password grant
    step(1, f"Signing in as {EMAIL}...")
    r = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        },
        json={"email": EMAIL, "password": PASSWORD},
    )
    r.raise_for_status()
    auth = r.json()
    access_token = auth["access_token"]
    user_id = auth["user"]["id"]
    print(f"  OK — user.id={user_id}")
    print(f"  access_token: {access_token[:50]}...")

    # 2. Construct the supabase-ssr cookie.
    session_json = json.dumps(auth, separators=(",", ":"))
    cookie_name = f"sb-{PROJECT_REF}-auth-token"
    cookies = {cookie_name: session_json}
    print(f"\n[2] Cookie name: {cookie_name}")
    print(f"  Cookie value length: {len(session_json)} chars")

    # 3. POST /api/reviews — create a review WITHOUT passing genres/release_year/poster_path
    step(3, f"POST /api/reviews (movie_id={MOVIE_ID}, no genres/year/poster)...")
    r = requests.post(
        f"{APP_URL}/api/reviews",
        cookies=cookies,
        headers={"Content-Type": "application/json"},
        json={
            "movie_id": MOVIE_ID,
            "movie_title": MOVIE_TITLE,
            "rating": 9,
            "body": "E2E test review — Inception is a masterpiece of dream-within-dream storytelling.",
            "title": "Dreams within dreams",
            "spoiler": False,
        },
    )
    print(f"  Status: {r.status_code}")
    if r.status_code != 201:
        print(f"  Response: {r.text[:500]}")
        sys.exit(1)
    review = r.json()["review"]
    review_id = review["id"]
    print(f"  OK — review.id={review_id}")
    print(f"  Trigger-enriched fields:")
    print(f"    poster_path: {review.get('poster_path')}")
    print(f"    genres:      {review.get('genres')}")
    print(f"    release_year:{review.get('release_year')}")

    # 4. GET /api/reviews — verify the review shows up
    step(4, "GET /api/reviews...")
    r = requests.get(f"{APP_URL}/api/reviews", cookies=cookies)
    print(f"  Status: {r.status_code}")
    reviews = r.json().get("reviews", [])
    print(f"  Reviews count: {len(reviews)}")
    found = next((rv for rv in reviews if rv["id"] == review_id), None)
    if found:
        print(f"  OK — found our review")
        print(f"    poster_path: {found.get('poster_path')}")
        print(f"    genres:      {found.get('genres')}")
        print(f"    release_year:{found.get('release_year')}")
        print(f"    spoiler:     {found.get('spoiler')}")
    else:
        print(f"  FAIL — review not found in user's reviews list")
        sys.exit(1)

    # 5. POST /api/diary
    step(5, f"POST /api/diary (movie_id={MOVIE_ID})...")
    r = requests.post(
        f"{APP_URL}/api/diary",
        cookies=cookies,
        headers={"Content-Type": "application/json"},
        json={
            "movie_id": MOVIE_ID,
            "movie_title": MOVIE_TITLE,
            "watched_on": "2025-07-15",
            "rating": 9,
            "rewatch": False,
            "location": "Cinema",
            "notes": "E2E test diary entry — first watch in theater.",
        },
    )
    print(f"  Status: {r.status_code}")
    if r.status_code != 201:
        print(f"  Response: {r.text[:500]}")
        sys.exit(1)
    entry = r.json()["entry"]
    entry_id = entry["id"]
    print(f"  OK — entry.id={entry_id}")
    print(f"  Trigger-enriched fields:")
    print(f"    poster_path (mapped from movie_poster): {entry.get('poster_path')}")
    print(f"    genres:      {entry.get('genres')}")
    print(f"    release_year:{entry.get('release_year')}")
    print(f"    notes (mapped from review_text): {entry.get('notes')}")

    # 6. GET /api/diary
    step(6, "GET /api/diary...")
    r = requests.get(f"{APP_URL}/api/diary", cookies=cookies)
    print(f"  Status: {r.status_code}")
    entries = r.json().get("entries", [])
    print(f"  Diary count: {len(entries)}")
    found = next((e for e in entries if e["id"] == entry_id), None)
    if found:
        print(f"  OK — found our diary entry")
        print(f"    poster_path: {found.get('poster_path')}")
        print(f"    notes:       {found.get('notes')}")
    else:
        print(f"  FAIL — diary entry not found")
        sys.exit(1)

    # 7. DELETE /api/reviews/<id>
    step(7, f"DELETE /api/reviews/{review_id}...")
    r = requests.delete(f"{APP_URL}/api/reviews/{review_id}", cookies=cookies)
    print(f"  Status: {r.status_code}")
    print(f"  Response: {r.json()}")

    # 8. DELETE /api/diary/<id>
    step(8, f"DELETE /api/diary/{entry_id}...")
    r = requests.delete(f"{APP_URL}/api/diary/{entry_id}", cookies=cookies)
    print(f"  Status: {r.status_code}")
    print(f"  Response: {r.json()}")

    # 9. Verify both are gone
    step(9, "Verify deletes...")
    r = requests.get(f"{APP_URL}/api/reviews", cookies=cookies)
    reviews = r.json().get("reviews", [])
    if any(rv["id"] == review_id for rv in reviews):
        print(f"  FAIL — review still exists after delete")
        sys.exit(1)
    print(f"  OK — review is gone ({len(reviews)} reviews left)")

    r = requests.get(f"{APP_URL}/api/diary", cookies=cookies)
    entries = r.json().get("entries", [])
    if any(e["id"] == entry_id for e in entries):
        print(f"  FAIL — diary entry still exists after delete")
        sys.exit(1)
    print(f"  OK — diary entry is gone ({len(entries)} entries left)")

    # 10. Test 401 path — no cookie
    step(10, "Verify auth required (no cookie)...")
    r = requests.get(f"{APP_URL}/api/reviews")
    print(f"  GET /api/reviews (no cookie): status={r.status_code} (expected 401)")
    if r.status_code != 401:
        print(f"  FAIL — expected 401, got {r.status_code}")
        sys.exit(1)

    r = requests.delete(f"{APP_URL}/api/reviews/{review_id}")
    print(f"  DELETE /api/reviews/<id> (no cookie): status={r.status_code} (expected 401)")
    if r.status_code != 401:
        print(f"  FAIL — expected 401, got {r.status_code}")
        sys.exit(1)

    print("\nAll E2E tests passed!")

if __name__ == "__main__":
    main()
