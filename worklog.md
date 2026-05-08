# Worklog — Task 2a-2f: Streaming Pipeline Fixes

## Summary
Fixed Part 2 of the 5-part plan: the Streaming Pipeline. Applied 6 fixes to address duplicate seed data, slow timeouts, UI issues, dead components, and added Crunchyroll anime source.

## Changes Made

### Fix 1: Remove YouTube duplicates from seed.ts
**File:** `src/lib/streaming-pipeline/seed.ts`
- Removed 5 Blender movie duplicates from YOUTUBE_SEED (Big Buck Bunny, Sintel, Tears of Steel, Spring, Elephant's Dream)
- These had different IDs (`youtube-aqz-KE-bpKQ` vs `blender-big-buck-bunny`) so the ID-based dedup didn't catch them
- The BLENDER_SEED versions always have richer metadata (more languages, subtitles) so they are preferred
- Added comment explaining the dedup rationale
- Kept only 5 unique YouTube entries: Night of the Living Dead, Plan 9, Charade, His Girl Friday, D.O.A.
- **Result:** Seed count reduced from 24 (with duplicates) to 20 unique movies (5 Blender + 10 Archive + 5 YouTube)

### Fix 2: Optimize streaming pipeline timeouts
**File:** `src/lib/streaming-pipeline/index.ts`
- Reduced `TIER2_TIMEOUT` from 3000ms → 2000ms
- Reduced `SOURCE_TIMEOUT` from 8000ms → 5000ms
- Reduced `CATALOG_CACHE_TTL` from 1 hour → 30 minutes
- Updated architecture comment to reflect new Tier 3 timeout (<5s instead of <8s)

### Fix 3: Fix streaming page UI
**File:** `src/app/stream/page.tsx`
- Changed error state text from "Failed to load movies. Using fallback data." → "Failed to load. Tap Retry."
- Removed the `isSeedData`-driven "Loading more..." badge from the page header; replaced with `backgroundRefreshInProgress`-driven subtle "Refreshing..." text
- Replaced the prominent "Loading more movies from streaming sources..." bottom indicator with a subtle "Loading more sources..." text (smaller font, lower opacity)
- Reduced initial fetch timeout from 5000ms → 3000ms
- Reduced polling interval from 5000ms → 3000ms
- Reduced max polling attempts from 6 → 4 (12s max instead of 30s)

### Fix 4: Delete old PremiumVideoPlayer
**File:** `src/components/stream/PremiumVideoPlayer.tsx` (DELETED)
- Confirmed the component was not imported anywhere else (only self-referencing)
- Safe to delete; the watch page already uses CinemaPlayer

### Fix 5: Add Crunchyroll source
**New file:** `src/lib/streaming-pipeline/sources/crunchyroll.ts`
- Created linkout-only source with 8 curated anime entries: Naruto, One Piece, Dragon Ball, Attack on Titan, Demon Slayer, Jujutsu Kaisen, My Hero Academia, Death Note
- All entries use `videoType: 'linkout'` and `source: 'crunchyroll'`
- Includes `fetchCrunchyrollMovies()` and `searchCrunchyrollMovies()` functions
- 24-hour cache TTL for curated data

**File:** `src/lib/streaming-pipeline/types.ts`
- Added `'crunchyroll'` to the `StreamSource` union type

**File:** `src/lib/streaming-pipeline/index.ts`
- Imported Crunchyroll source functions
- Added Crunchyroll to Tier 3 sources in `fetchTier3Movies()`
- Added `searchCrunchyrollMovies()` to `searchStreamingMovies()` API searches
- Added `crunchyroll-anime` category in `buildCategories()`
- Added Crunchyroll resolve in `resolveMovieFromId()` for `crunchyroll-` prefix IDs
- Added `crunchyroll: true` to pipeline status sources

### Fix 6: Add Crunchyroll badge and count to streaming page
**File:** `src/app/stream/page.tsx`
- Added Crunchyroll badge to `getSourceBadge()`: `case 'crunchyroll': return { label: 'CR', className: 'bg-orange-500/20 text-orange-400' }`
- Added `crunchyrollCount` variable after `bilibiliCount`
- Added `{crunchyrollCount} Crunchyroll` to stats footer

## Build Verification
- `npx next build` completed successfully with no errors
- No lint errors introduced in modified files (pre-existing lint errors are unrelated)

## Files Modified
1. `src/lib/streaming-pipeline/seed.ts` — Removed Blender duplicates from YOUTUBE_SEED
2. `src/lib/streaming-pipeline/index.ts` — Reduced timeouts, added Crunchyroll integration
3. `src/lib/streaming-pipeline/types.ts` — Added 'crunchyroll' to StreamSource
4. `src/app/stream/page.tsx` — UI fixes, Crunchyroll badge & count
5. `src/components/stream/PremiumVideoPlayer.tsx` — DELETED

## Files Created
1. `src/lib/streaming-pipeline/sources/crunchyroll.ts` — Crunchyroll anime linkout source
