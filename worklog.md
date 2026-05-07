---
Task ID: streaming-pipeline-overhaul
Agent: Main Agent
Task: Fix streaming pipeline - remove mock data, make videos actually play, add new sources, build premium CinemaPlayer

Work Log:
- Audited all streaming source files and identified root causes: fake Archive.org IDs, no video file resolution, missing sources
- Verified real Archive.org identifiers and video files via API calls
- Fixed public-domain-anime.ts with 7 verified real entries
- Fixed internet-archive.ts to resolve actual video file URLs from metadata
- Added isEmbeddable field to all streaming sources
- Created 7 new streaming source files: tubi.ts, pluto-tv.ts, crackle.ts, retrocrush.ts, contv.ts, bilibili.ts, indie-animation.ts
- Built CinemaPlayer.tsx - Netflix-type premium video player
- Updated streaming pipeline orchestrator with all 13 sources
- Added fast-path resolveMovieFromId() for fast single movie lookups
- Added maxDuration, revalidate, and streaming cache warmer cron
- Pushed to GitHub and deployed to Vercel

Stage Summary:
- 152 movies from 11 sources (95 playable, 57 link-out)
- All mock data removed - only verified real video URLs
- Site live at https://typescribe-mu.vercel.app/stream
