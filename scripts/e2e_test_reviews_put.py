"""
E2E test for the 4 follow-up tasks:
  1. PUT /api/reviews/[id] — edit an existing review
  2. avatar_url bug fix — author.avatar field present in /api/reviews response
  3. Movie-page reviews — GET /api/reviews?movie_id=<id> returns real reviews
  4. DELETE /api/reviews/[id] — re-verify cleanup

Auth flow:
  - Sign in via Supabase password grant (POST /auth/v1/token?grant_type=password)
  - Construct the supabase-ssr auth cookie: `sb-<ref>-auth-token=<JSON.stringify(session)>`
    Note: the value is the plain session object JSON, NOT [session, null].
  - Send the cookie with all requests to /api/reviews*.

Usage:
  export VERCEL_TOKEN=<token>
  export TEST_EMAIL=<email>
  export TEST_PASSWORD=<password>
  python3 scripts/e2e_test_reviews_put.py
"""
import json
import os
import time
import subprocess
import requests

# Pull credentials from env vars (never hardcode secrets in the script —
# GitHub's secret scanner blocked an earlier commit).
VERCEL_TOKEN = os.environ.get("VERCEL_TOKEN", "")
TEST_EMAIL = os.environ.get("TEST_EMAIL", "e2e-test@typescribe.app")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")
PROJECT_ID = "prj_yolHTA7B8Bg9RLZJkb2TBbTLcDzz"
ANON_KEY_ENV_ID = "AbSFXBhrAlLFBVFT"  # Vercel env ID for NEXT_PUBLIC_SUPABASE_ANON_KEY

PRODUCTION_URL = "https://typescribe-mu.vercel.app"
SUPABASE_URL = "https://iancvwkvqapkstqdltfs.supabase.co"
PROJECT_REF = "iancvwkvqapkstqdltfs"

TEST_MOVIE_ID = 27205
TEST_MOVIE_TITLE = "Inception"


def get_anon_key():
    """Fetch the Supabase anon key from Vercel env vars (avoids hardcoding)."""
    r = subprocess.check_output([
        "curl", "-sS", "-H", f"Authorization: Bearer {VERCEL_TOKEN}",
        f"https://api.vercel.com/v9/projects/{PROJECT_ID}/env/{ANON_KEY_ENV_ID}",
    ], timeout=30).decode()
    return json.loads(r)["value"]


def step(n, label):
    print(f"\n--- Step {n}: {label} ---")


def assert_eq(actual, expected, label):
    if actual != expected:
        print(f"  X FAIL: {label} - expected {expected!r}, got {actual!r}")
        return False
    print(f"  OK {label}")
    return True


def assert_truthy(value, label):
    if not value:
        print(f"  X FAIL: {label} - value is falsy: {value!r}")
        return False
    print(f"  OK {label}")
    return True


def main():
    if not VERCEL_TOKEN:
        print("ERROR: VERCEL_TOKEN env var not set")
        return False
    if not TEST_PASSWORD:
        print("ERROR: TEST_PASSWORD env var not set")
        return False

    print("=" * 70)
    print("E2E Test: PUT /api/reviews/[id] + movie-page reviews + avatar fix")
    print("=" * 70)

    anon_key = get_anon_key()

    # Step 1: Sign in via Supabase password grant
    step(1, "Sign in via Supabase password grant")
    r = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"apikey": anon_key, "Content-Type": "application/json"},
        timeout=30,
    )
    if r.status_code != 200:
        print(f"  X FAIL: sign-in returned {r.status_code}: {r.text[:200]}")
        return False
    auth = r.json()
    access_token = auth["access_token"]
    refresh_token = auth["refresh_token"]
    user = auth["user"]
    user_id = user["id"]
    print(f"  OK Signed in as {TEST_EMAIL} (user_id={user_id})")

    # Step 2: Construct the supabase-ssr auth cookie.
    # @supabase/ssr stores the session as JSON.stringify(session_object) in
    # cookie `sb-<project-ref>-auth-token`. The value is the plain session
    # object, NOT [session, null].
    step(2, "Construct supabase-ssr auth cookie")
    session = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": int(time.time()) + 3600,
        "token_type": "bearer",
        "user": user,
    }
    cookie_value = json.dumps(session, separators=(",", ":"))
    cookie_name = f"sb-{PROJECT_REF}-auth-token"
    cookie = f"{cookie_name}={cookie_value}"
    print(f"  OK Cookie constructed: {cookie_name} ({len(cookie_value)} chars)")

    session_http = requests.Session()
    session_http.headers["Cookie"] = cookie

    # Clean up any leftover review from a prior test run
    r = session_http.get(f"{PRODUCTION_URL}/api/reviews", timeout=30)
    if r.status_code == 200:
        for rev in r.json().get("reviews", []):
            if rev.get("title", "").startswith("E2E edit test"):
                session_http.delete(f"{PRODUCTION_URL}/api/reviews/{rev['id']}", timeout=30)
                print(f"  (cleanup) deleted stale review {rev['id']}")

    # Step 3: POST /api/reviews -> create
    step(3, "POST /api/reviews (create)")
    r = session_http.post(f"{PRODUCTION_URL}/api/reviews", json={
        "movie_id": TEST_MOVIE_ID,
        "movie_title": TEST_MOVIE_TITLE,
        "rating": 7,
        "title": "E2E edit test - original",
        "body": "Original review body created by the E2E test script. Will be edited in the next step.",
        "spoiler": False,
        "genres": ["Action", "Science Fiction", "Thriller"],
        "release_year": 2010,
    }, timeout=30)
    if not assert_eq(r.status_code, 201, "POST returns 201"):
        print(f"  Body: {r.text[:300]}")
        return False
    body = r.json()
    review_id = body["review"]["id"]
    print(f"  OK Created review id={review_id}, rating={body['review']['rating']}")
    assert_truthy(body["review"].get("poster_path"), f"poster_path auto-populated ({body['review'].get('poster_path')})")

    # Step 4: PUT /api/reviews/[id] -> edit
    step(4, f"PUT /api/reviews/{review_id} (edit)")
    r = session_http.put(f"{PRODUCTION_URL}/api/reviews/{review_id}", json={
        "rating": 9,
        "title": "E2E edit test - EDITED",
        "body": "Edited body: this review was updated via PUT /api/reviews/[id]. The rating changed from 7 to 9.",
    }, timeout=30)
    if not assert_eq(r.status_code, 200, "PUT returns 200"):
        print(f"  Body: {r.text[:300]}")
        return False
    body = r.json()
    if not assert_eq(body["review"]["rating"], 9, "rating updated to 9"):
        return False
    if not assert_eq(body["review"]["title"], "E2E edit test - EDITED", "title updated"):
        return False
    if not body["review"]["body"].startswith("Edited body"):
        print(f"  X FAIL: body not updated. Got: {body['review']['body'][:80]}")
        return False
    print(f"  OK Review edited (updated_at={body['review']['updated_at'][:19]})")

    # Step 5: GET /api/reviews?movie_id=27205 -> confirm edited review + author.avatar
    step(5, f"GET /api/reviews?movie_id={TEST_MOVIE_ID} (movie-page fetch)")
    r = session_http.get(f"{PRODUCTION_URL}/api/reviews?movie_id={TEST_MOVIE_ID}", timeout=30)
    if not assert_eq(r.status_code, 200, "GET returns 200"):
        return False
    body = r.json()
    reviews = body.get("reviews", [])
    print(f"  OK Got {len(reviews)} review(s) for movie {TEST_MOVIE_ID}")
    if len(reviews) == 0:
        print("  X FAIL: no reviews returned")
        return False
    our_review = next((rev for rev in reviews if rev["id"] == review_id), None)
    if not our_review:
        print(f"  X FAIL: edited review {review_id} not in movie-page list")
        return False
    print(f"  OK Edited review found in movie-page list (rating={our_review['rating']})")

    # Step 6: Verify author.avatar field present (avatar_url bug fix)
    step(6, "Verify author.avatar field present (avatar_url fix)")
    author = our_review.get("author") or {}
    if "avatar" not in author:
        print(f"  X FAIL: author.avatar field MISSING. Author: {author}")
        return False
    print(f"  OK author.avatar present (value: {author.get('avatar', '')!r})")
    print(f"     author.display_name: {author.get('display_name', '')!r}")

    # Step 7: PUT with no fields -> 400
    step(7, "PUT with no updatable fields -> 400")
    r = session_http.put(f"{PRODUCTION_URL}/api/reviews/{review_id}", json={}, timeout=30)
    if not assert_eq(r.status_code, 400, "empty PUT returns 400"):
        return False

    # Step 8: PUT with invalid rating -> 400
    step(8, "PUT with rating=15 -> 400")
    r = session_http.put(f"{PRODUCTION_URL}/api/reviews/{review_id}", json={"rating": 15}, timeout=30)
    if not assert_eq(r.status_code, 400, "invalid rating returns 400"):
        return False

    # Step 9: GET /api/reviews (dashboard list)
    step(9, "GET /api/reviews (dashboard list)")
    r = session_http.get(f"{PRODUCTION_URL}/api/reviews", timeout=30)
    if not assert_eq(r.status_code, 200, "GET returns 200"):
        return False
    user_reviews = r.json().get("reviews", [])
    found = any(rev["id"] == review_id for rev in user_reviews)
    if not assert_truthy(found, "edited review appears in user's dashboard list"):
        return False

    # Step 10: DELETE -> cleanup
    step(10, f"DELETE /api/reviews/{review_id} (cleanup)")
    r = session_http.delete(f"{PRODUCTION_URL}/api/reviews/{review_id}", timeout=30)
    if not assert_eq(r.status_code, 200, "DELETE returns 200"):
        return False
    print(f"  OK Review deleted")

    # Step 11: PUT on deleted review -> 404
    step(11, f"PUT on deleted review -> 404")
    r = session_http.put(f"{PRODUCTION_URL}/api/reviews/{review_id}", json={"rating": 5}, timeout=30)
    if not assert_eq(r.status_code, 404, "PUT on deleted review returns 404"):
        return False

    # Step 12: Clean up the direct-insert review from earlier debugging
    step(12, "Cleanup direct-insert review")
    try:
        # Find and delete any remaining test reviews
        r = session_http.get(f"{PRODUCTION_URL}/api/reviews?movie_id={TEST_MOVIE_ID}", timeout=30)
        for rev in r.json().get("reviews", []):
            if "test" in (rev.get("title", "") + rev.get("body", "")).lower():
                session_http.delete(f"{PRODUCTION_URL}/api/reviews/{rev['id']}", timeout=30)
                print(f"  OK Deleted review {rev['id']}")
    except Exception:
        pass

    print("\n" + "=" * 70)
    print("ALL STEPS PASSED")
    print("=" * 70)
    return True


if __name__ == "__main__":
    ok = main()
    exit(0 if ok else 1)
