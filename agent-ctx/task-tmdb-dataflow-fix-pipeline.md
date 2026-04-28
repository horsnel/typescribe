# Task: Fix TMDb Data Flow Bugs

## Summary
Fixed 6 data flow bugs preventing real TMDb data from flowing through the Typescribe (O.L.H.M.E.S) movie site pipeline. No visual styles were changed.

## Changes Made

### 1. Fixed TMDb Image URLs in ALL transforms (`src/lib/pipeline/clients/tmdb.ts`)
- **transformMovieDetail** (line 251): `profile_path: c.profile_path ?? ''` → `profile_path: tmdbImageUrl(c.profile_path, 'w185')` for cast
- **transformTvDetail** (line 354): `profile_path: c.profile_path ?? ''` → `profile_path: tmdbImageUrl(c.profile_path, 'w185')` for cast
- **transformTvDetail** (lines 374-375): `poster_path: raw.poster_path ?? ''` → `poster_path: tmdbImageUrl(raw.poster_path, 'w500')` and same for `backdrop_path` with `w780`
- **transformMovieCard** (lines 443-444): `poster_path` and `backdrop_path` → use `tmdbImageUrl()`
- **transformTvCard** (lines 478-479): `poster_path` and `backdrop_path` → use `tmdbImageUrl()`

Total: 8 lines changed across 4 transform functions.

### 2. Fixed Browse API (`src/app/api/browse/route.ts`)
- Added `source` param parsing from query string
- When `source=trending`, calls `getTrending('week')` instead of `browseMovies`
- When `source=top_rated`, calls `getTopRated(page)`
- When `source=now_playing`, calls `getNowPlaying(page)`
- Added `fromAPI: result.sources.length > 0` to the response JSON
- Added imports: `getTrending`, `getTopRated`, `getNowPlaying` from `@/lib/pipeline`

This fixes TrendingCarousel and TopRatedSection components which call `/api/browse?source=trending` and `/api/browse?source=top_rated`.

### 3. Fixed Slug-Based Movie Lookup (`src/lib/pipeline/index.ts`)
Replaced the stub `getMovieBySlug` that only checked cache and returned null with a full implementation that:
1. Checks cache by slug first
2. Extracts TMDb ID from slug (format: "title-123") using regex `/-(\d+)$/`
3. Falls back to TMDb search by title if no ID in slug
4. Returns `null` only if both strategies fail

### 4. Fixed Movie Detail API Route (`src/app/api/movies/slug/[slug]/route.ts`)
Changed return from `NextResponse.json(result.movie)` to:
```typescript
NextResponse.json({
  movie: result.movie,
  sources: result.sources,
  completeness: result.completeness,
})
```
This matches what the frontend expects (`data.movie`, `data.sources`, `data.completeness`).

### 5. Verified Discover/Local API (`src/app/api/discover/local/route.ts`)
- Already exists and works correctly
- Uses `discoverMovies` and `discoverTv` from TMDb client (now fixed with `tmdbImageUrl`)
- Returns `fromAPI: true` in response
- `getCountryDiscoverParams` from `@/lib/geolocation` exists and works

### 6. Verified Movie Detail Page (`src/app/movie/[slug]/page.tsx`)
- `poster_path`, `backdrop_path`, `profile_path` used in `<img src={...}>` tags - work with full URLs
- Watch providers section uses separate API endpoint `/api/movies/${tmdbId}/watch-providers` - unaffected
- Fallback mock data uses `/images/...` paths which also work in `<img>` tags
- SearchOverlay already has `startsWith('http')` guard to avoid double-prepending

## Build Verification
- `npx next build` compiles successfully
- Pre-existing lint warnings (59 errors) are unrelated to our changes (mostly `set-state-in-effect` warnings)
