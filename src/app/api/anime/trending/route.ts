/**
 * GET /api/anime/trending
 *
 * Fetch trending/seasonal anime using Jikan (current season) + AniList as fallback.
 * Returns { movies: Movie[] } — normalized to the Movie type for card display.
 */
import { NextResponse } from 'next/server';
import { getCurrentSeason, getTopAnime } from '@/lib/pipeline/clients/jikan';
import * as AniList from '@/lib/pipeline/clients/anilist';
import type { Movie } from '@/lib/types';

// Maximum time (ms) to wait for any single API source before moving on
const SOURCE_TIMEOUT = 8_000;

// Browser/CDN cache — 10 min fresh, then serve stale up to 1 hour while revalidating
const ANIME_CACHE_CONTROL = 'public, max-age=600, stale-while-revalidate=3600';

function jikanToMovie(a: any): Movie {
  const title = a.titleEnglish || a.title || 'Unknown';
  return {
    id: a.malId || 0,
    tmdb_id: 0,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + `-${a.malId || 0}`,
    title,
    original_title: a.titleJapanese || a.titleRomaji || a.title || '',
    overview: a.synopsis || '',
    release_date: a.year ? `${a.year}-01-01` : '',
    poster_path: a.imageUrl || '',
    backdrop_path: '',
    genres: (a.genres || []).map((g: string, i: number) => ({ id: -(i + 1), name: g })),
    runtime: 0,
    vote_average: a.score ? a.score / 10 : 0,
    vote_count: a.scoredBy || 0,
    imdb_rating: '',
    rotten_tomatoes: '',
    metascore: '',
    trailer_youtube_id: a.trailerYoutubeId || '',
    news_headlines: [],
    ai_review: '',
    director: '',
    cast: [],
    tagline: '',
    budget: 0,
    revenue: 0,
    original_language: 'ja',
    origin_country: 'JP',
    media_type: 'anime',
    production_companies: a.studios || [],
    status: a.status || '',
    created_at: new Date().toISOString(),
    is_anime: true,
    anime_mal_id: a.malId || undefined,
    anime_mal_score: a.score || undefined,
    anime_mal_rank: a.rank || undefined,
    anime_mal_popularity: a.popularity || undefined,
    anime_mal_members: a.members || undefined,
    anime_studios: a.studios || undefined,
    anime_source: a.source || undefined,
    anime_season: a.season && a.year
      ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1).toLowerCase()} ${a.year}`
      : undefined,
  };
}

function anilistToMovie(a: any): Movie {
  const title = a.title?.english || a.title?.romaji || 'Unknown';
  return {
    id: a.anilistId || 0,
    tmdb_id: 0,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + `-${a.anilistId || 0}`,
    title,
    original_title: a.title?.native || a.title?.romaji || '',
    overview: a.description?.replace(/<[^>]*>/g, '').trim() || '',
    release_date: a.startDate?.year
      ? `${a.startDate.year}-${String(a.startDate.month || 1).padStart(2, '0')}-${String(a.startDate.day || 1).padStart(2, '0')}`
      : '',
    poster_path: a.coverImage?.large || '',
    backdrop_path: a.bannerImage || '',
    genres: (a.genres || []).map((g: string, i: number) => ({ id: -(i + 1), name: g })),
    runtime: a.duration || 0,
    vote_average: (a.meanScore || 0) / 10,
    vote_count: 0,
    imdb_rating: '',
    rotten_tomatoes: '',
    metascore: '',
    trailer_youtube_id: '',
    news_headlines: [],
    ai_review: '',
    director: '',
    cast: [],
    tagline: '',
    budget: 0,
    revenue: 0,
    original_language: 'ja',
    origin_country: 'JP',
    media_type: 'anime',
    production_companies: a.studios || [],
    status: a.status || '',
    created_at: new Date().toISOString(),
    is_anime: true,
    anime_mal_id: a.malId || undefined,
    anime_mal_score: a.meanScore ? Math.round((a.meanScore / 10) * 10) / 10 : undefined,
    anime_studios: a.studios || undefined,
    anime_source: a.source || undefined,
    anime_season: a.season && a.seasonYear
      ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1).toLowerCase()} ${a.seasonYear}`
      : undefined,
  };
}

export async function GET() {
  try {
    const movies: Movie[] = [];
    const sources: string[] = [];
    const seen = new Set<string>();
    const TARGET_COUNT = 12;

    const pushUnique = (movie: Movie) => {
      const key = movie.title.toLowerCase();
      if (movie.poster_path && !seen.has(key)) {
        movies.push(movie);
        seen.add(key);
      }
    };

    // ── Strategy: fetch what's AIRING NOW (current broadcast season) and
    //    what's TRENDING globally in parallel, then interleave them so the
    //    section always reflects fresh, currently-updating anime followed by
    //    wider trending hits. Jikan seasonal/top and AniList popular remain
    //    as fallbacks if AniList fails.

    const [trendingRes, airingRes] = await Promise.allSettled([
      Promise.race([
        AniList.getTrendingAnime(16),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), SOURCE_TIMEOUT)),
      ]),
      Promise.race([
        AniList.getAiringAnime(12),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), SOURCE_TIMEOUT)),
      ]),
    ]);

    const trending = trendingRes.status === 'fulfilled' ? trendingRes.value ?? [] : [];
    const airing = airingRes.status === 'fulfilled' ? airingRes.value ?? [] : [];

    if (airing.length > 0) sources.push('AniList-Airing');
    if (trending.length > 0) sources.push('AniList');

    // Interleave: alternate airing / trending entries (dedupe by title).
    const maxLen = Math.max(airing.length, trending.length);
    for (let i = 0; i < maxLen; i++) {
      if (airing[i]) pushUnique(anilistToMovie(airing[i]));
      if (trending[i]) pushUnique(anilistToMovie(trending[i]));
      if (movies.length >= TARGET_COUNT) break;
    }

    // If we got enough from AniList, return early
    if (movies.length >= TARGET_COUNT) {
      const res = NextResponse.json({ movies: movies.slice(0, TARGET_COUNT), sources, totalResults: movies.length });
      res.headers.set('Cache-Control', ANIME_CACHE_CONTROL);
      return res;
    }

    // 2. Fallback: Jikan current season
    try {
      const seasonal = await Promise.race([
        getCurrentSeason('tv'),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), SOURCE_TIMEOUT)),
      ]) as Awaited<ReturnType<typeof getCurrentSeason>> | null;
      if (seasonal && seasonal.length > 0) {
        if (!sources.includes('Jikan')) sources.push('Jikan');
        for (const a of seasonal.slice(0, 10)) {
          if (movies.length >= TARGET_COUNT) break;
          pushUnique(jikanToMovie(a));
        }
      }
    } catch (err: any) {
      console.warn('[API /anime/trending] Jikan seasonal failed:', err?.message || err);
    }

    if (movies.length >= TARGET_COUNT) {
      const res = NextResponse.json({ movies: movies.slice(0, TARGET_COUNT), sources, totalResults: movies.length });
      res.headers.set('Cache-Control', ANIME_CACHE_CONTROL);
      return res;
    }

    // 3. Fallback: Jikan top anime
    try {
      const top = await Promise.race([
        getTopAnime('tv', 'airing'),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), SOURCE_TIMEOUT)),
      ]) as Awaited<ReturnType<typeof getTopAnime>> | null;
      if (top && top.length > 0) {
        if (!sources.includes('Jikan')) sources.push('Jikan');
        for (const a of top.slice(0, 10)) {
          if (movies.length >= TARGET_COUNT) break;
          pushUnique(jikanToMovie(a));
        }
      }
    } catch (err: any) {
      console.warn('[API /anime/trending] Jikan top failed:', err?.message || err);
    }

    if (movies.length >= TARGET_COUNT) {
      const res = NextResponse.json({ movies: movies.slice(0, TARGET_COUNT), sources, totalResults: movies.length });
      res.headers.set('Cache-Control', ANIME_CACHE_CONTROL);
      return res;
    }

    // 4. Fallback: AniList popular (POPULARITY_DESC sort)
    if (movies.length < 4) {
      try {
        const popular = await AniList.getPopularAnime(12);
        if (popular && popular.length > 0) {
          if (!sources.includes('AniList')) sources.push('AniList');
          for (const a of popular) {
            if (movies.length >= TARGET_COUNT) break;
            pushUnique(anilistToMovie(a));
          }
        }
      } catch (err: any) {
        console.warn('[API /anime/trending] AniList popular fallback failed:', err?.message || err);
      }
    }

    // If all upstream anime APIs (AniList, Jikan, MAL) are unavailable,
    // return an empty list rather than fake mock entries. The UI shows
    // a "No trending anime available right now" empty state.
    if (movies.length === 0) {
      const res = NextResponse.json({
        movies: [],
        sources,
        totalResults: 0,
      });
      res.headers.set('Cache-Control', ANIME_CACHE_CONTROL);
      return res;
    }

    // Final safety net: filter out any entries with no poster image
    const validMovies = movies.filter(m => m.poster_path && m.poster_path.trim() !== '');

    const res = NextResponse.json({
      movies: validMovies.slice(0, TARGET_COUNT),
      sources,
      totalResults: validMovies.length,
    });
    res.headers.set('Cache-Control', ANIME_CACHE_CONTROL);
    return res;
  } catch (error: any) {
    console.error('[API /anime/trending] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending anime', details: error.message },
      { status: 500 },
    );
  }
}
