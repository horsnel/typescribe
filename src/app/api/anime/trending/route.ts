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

    // Try Jikan current season first
    try {
      const seasonal = await getCurrentSeason('tv');
      if (seasonal && seasonal.length > 0) {
        sources.push('Jikan');
        for (const a of seasonal.slice(0, 8)) {
          movies.push(jikanToMovie(a));
        }
      }
    } catch (err) {
      console.warn('[API /anime/trending] Jikan seasonal failed:', err);
    }

    // If we got enough from Jikan, return early
    if (movies.length >= 6) {
      return NextResponse.json({ movies, sources, totalResults: movies.length });
    }

    // Fallback: Jikan top anime
    try {
      const top = await getTopAnime('tv', 'airing');
      if (top && top.length > 0) {
        if (!sources.includes('Jikan')) sources.push('Jikan');
        const existingTitles = new Set(movies.map(m => m.title.toLowerCase()));
        for (const a of top.slice(0, 10)) {
          const title = a.titleEnglish || a.title || '';
          if (!existingTitles.has(title.toLowerCase())) {
            movies.push(jikanToMovie(a));
            existingTitles.add(title.toLowerCase());
          }
        }
      }
    } catch (err) {
      console.warn('[API /anime/trending] Jikan top failed:', err);
    }

    // If still not enough, try AniList trending
    if (movies.length < 4) {
      try {
        // AniList doesn't have a direct "trending" endpoint we can call easily
        // Use searchAnime with a popular term as a workaround
        const anilistResults = await AniList.searchAnime('trending');
        if (anilistResults && anilistResults.length > 0) {
          sources.push('AniList');
          const existingTitles = new Set(movies.map(m => m.title.toLowerCase()));
          for (const a of anilistResults.slice(0, 8)) {
            const title = a.title?.english || a.title?.romaji || '';
            if (!existingTitles.has(title.toLowerCase())) {
              movies.push(anilistToMovie(a));
              existingTitles.add(title.toLowerCase());
            }
          }
        }
      } catch (err) {
        console.warn('[API /anime/trending] AniList fallback failed:', err);
      }
    }

    return NextResponse.json({
      movies: movies.slice(0, 8),
      sources,
      totalResults: movies.length,
    });
  } catch (error: any) {
    console.error('[API /anime/trending] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending anime', details: error.message },
      { status: 500 },
    );
  }
}
