---
Task ID: 3
Agent: main
Task: Part 3 - Free-tier metadata pipeline

Work Log:
- Verified `src/lib/pipeline/free-tier.ts` already exists with AniList, Jikan, TVMaze transforms
- Verified `src/lib/pipeline/index.ts` already has free-tier fallbacks for trending, top-rated, now-playing, upcoming, browse, search
- Verified `src/app/api/browse/route.ts` already uses free-tier fallback when TMDb returns 0 results
- Updated `src/lib/data.ts` — replaced 20 fake movies with empty array, kept static genre definitions (not fake data)
- Updated `src/sections/LocalPicksSection.tsx` — removed data.ts import, added trending API fallback
- Updated `src/app/search/page.tsx` — removed data.ts movie/review/news imports, uses API only
- Fixed `src/lib/streaming-pipeline/types.ts` — added missing StreamSource types (contv, crackle, tmdb-discover, retrocrush, indie-animation)
- Fixed `src/lib/streaming-pipeline/sources/tmdb-discover.ts` — added missing isEmbeddable field
- Build passes, committed and pushed to GitHub

Stage Summary:
- All 20 fake movies removed from data.ts
- Free-tier pipeline (AniList + Jikan + TVMaze) serves as primary data source when no TMDB_API_KEY
- Build passes, pushed to GitHub, Vercel auto-deploys

---
Task ID: 4
Agent: main
Task: Part 4 - UI/UX Polish & Advanced Features

Work Log:
- Added image remote patterns to next.config.ts for AniList, MAL, TVMaze, YouTube thumbnails
- Added free-tier fallback to /api/movies/slug/[slug] route (Step 6) — when TMDb fails, searches AniList/Jikan/TVMaze
- This fixes the critical issue where clicking on anime from browse/home would 404
- Build passes, committed and pushed

Stage Summary:
- Image optimization configured for free-tier source images
- Movie detail pages now work for free-tier anime/TV content
- Search functionality uses free-tier pipeline as fallback
