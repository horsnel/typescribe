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

    // ── Strategy: Try AniList trending first (most reliable, always has images),
    //    then Jikan seasonal, then Jikan top, then AniList popular, then mock.
    //    AniList is prioritized because it has no rate-limit issues and always
    //    returns cover images. Jikan is kept as secondary because it often has
    //    downtime (500 errors).

    // 1. Try AniList trending (proper TRENDING_DESC sort)
    try {
      const trending = await Promise.race([
        AniList.getTrendingAnime(10),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), SOURCE_TIMEOUT)),
      ]) as Awaited<ReturnType<typeof AniList.getTrendingAnime>> | null;
      if (trending && trending.length > 0) {
        sources.push('AniList');
        for (const a of trending.slice(0, 8)) {
          const movie = anilistToMovie(a);
          if (movie.poster_path) movies.push(movie); // Only include if we have an image
        }
      }
    } catch (err: any) {
      console.warn('[API /anime/trending] AniList trending failed:', err?.message || err);
    }

    // If we got enough from AniList trending, return early
    if (movies.length >= 6) {
      return NextResponse.json({ movies: movies.slice(0, 8), sources, totalResults: movies.length });
    }

    // 2. Try Jikan current season
    try {
      const seasonal = await Promise.race([
        getCurrentSeason('tv'),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), SOURCE_TIMEOUT)),
      ]) as Awaited<ReturnType<typeof getCurrentSeason>> | null;
      if (seasonal && seasonal.length > 0) {
        if (!sources.includes('Jikan')) sources.push('Jikan');
        const existingTitles = new Set(movies.map(m => m.title.toLowerCase()));
        for (const a of seasonal.slice(0, 10)) {
          const movie = jikanToMovie(a);
          if (movie.poster_path && !existingTitles.has(movie.title.toLowerCase())) {
            movies.push(movie);
            existingTitles.add(movie.title.toLowerCase());
          }
        }
      }
    } catch (err: any) {
      console.warn('[API /anime/trending] Jikan seasonal failed:', err?.message || err);
    }

    if (movies.length >= 6) {
      return NextResponse.json({ movies: movies.slice(0, 8), sources, totalResults: movies.length });
    }

    // 3. Fallback: Jikan top anime
    try {
      const top = await Promise.race([
        getTopAnime('tv', 'airing'),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), SOURCE_TIMEOUT)),
      ]) as Awaited<ReturnType<typeof getTopAnime>> | null;
      if (top && top.length > 0) {
        if (!sources.includes('Jikan')) sources.push('Jikan');
        const existingTitles = new Set(movies.map(m => m.title.toLowerCase()));
        for (const a of top.slice(0, 10)) {
          const movie = jikanToMovie(a);
          if (movie.poster_path && !existingTitles.has(movie.title.toLowerCase())) {
            movies.push(movie);
            existingTitles.add(movie.title.toLowerCase());
          }
        }
      }
    } catch (err: any) {
      console.warn('[API /anime/trending] Jikan top failed:', err?.message || err);
    }

    if (movies.length >= 6) {
      return NextResponse.json({ movies: movies.slice(0, 8), sources, totalResults: movies.length });
    }

    // 4. Fallback: AniList popular (POPULARITY_DESC sort)
    if (movies.length < 4) {
      try {
        const popular = await AniList.getPopularAnime(10);
        if (popular && popular.length > 0) {
          if (!sources.includes('AniList')) sources.push('AniList');
          const existingTitles = new Set(movies.map(m => m.title.toLowerCase()));
          for (const a of popular.slice(0, 8)) {
            const movie = anilistToMovie(a);
            if (movie.poster_path && !existingTitles.has(movie.title.toLowerCase())) {
              movies.push(movie);
              existingTitles.add(movie.title.toLowerCase());
            }
          }
        }
      } catch (err: any) {
        console.warn('[API /anime/trending] AniList popular fallback failed:', err?.message || err);
      }
    }

    // If all APIs fail, provide mock anime data with VERIFIED working image URLs
    // NOTE: MAL CDN URLs can break over time; AniList CDN is more stable.
    if (movies.length === 0) {
      sources.push('Mock');
      const mockAnime = [
        { title: 'Attack on Titan: The Final Season', score: 9.0, year: 2024, genres: ['Action', 'Drama', 'Fantasy'], image: 'https://cdn.myanimelist.net/images/anime/1000/110531.jpg', studio: 'MAPPA', season: 'Winter 2024' },
        { title: 'Jujutsu Kaisen Season 2', score: 8.7, year: 2023, genres: ['Action', 'Supernatural'], image: 'https://cdn.myanimelist.net/images/anime/1792/138022.jpg', studio: 'MAPPA', season: 'Summer 2023' },
        { title: 'Demon Slayer: Hashira Training', score: 8.5, year: 2024, genres: ['Action', 'Fantasy'], image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx166240-PBV7zukIHW7V.png', studio: 'Ufotable', season: 'Spring 2024' },
        { title: 'Spy x Family Season 2', score: 8.4, year: 2023, genres: ['Action', 'Comedy'], image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/b158927-lfO85WVguYgc.png', studio: 'WIT Studio', season: 'Fall 2023' },
        { title: 'Frieren: Beyond Journey\'s End', score: 9.1, year: 2023, genres: ['Adventure', 'Fantasy', 'Drama'], image: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg', studio: 'Madhouse', season: 'Fall 2023' },
        { title: 'Solo Leveling', score: 8.3, year: 2024, genres: ['Action', 'Fantasy'], image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx151807-it355ZgzquUd.png', studio: 'A-1 Pictures', season: 'Winter 2024' },
        { title: 'Chainsaw Man', score: 8.5, year: 2022, genres: ['Action', 'Horror'], image: 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg', studio: 'MAPPA', season: 'Fall 2022' },
        { title: 'One Punch Man', score: 8.0, year: 2015, genres: ['Action', 'Comedy'], image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21087-B5DHjqZ3kW4b.jpg', studio: 'Madhouse', season: 'Fall 2015' },
      ];
      for (const a of mockAnime) {
        const id = a.title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        movies.push({
          id,
          tmdb_id: 0,
          slug: a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          title: a.title,
          original_title: '',
          overview: `A ${a.genres.join('/')} anime by ${a.studio}. ${a.season} season.`,
          release_date: `${a.year}-01-01`,
          poster_path: a.image,
          backdrop_path: '',
          genres: a.genres.map((g: string, i: number) => ({ id: -(i + 1), name: g })),
          runtime: 24,
          vote_average: a.score / 10,
          vote_count: 100000,
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
          media_type: 'anime' as const,
          production_companies: [a.studio],
          status: 'Released',
          created_at: new Date().toISOString(),
          is_anime: true,
          anime_studios: [a.studio],
          anime_season: a.season,
        });
      }
    }

    // Final safety net: filter out any entries with no poster image
    const validMovies = movies.filter(m => m.poster_path && m.poster_path.trim() !== '');

    return NextResponse.json({
      movies: validMovies.slice(0, 8),
      sources,
      totalResults: validMovies.length,
    });
  } catch (error: any) {
    console.error('[API /anime/trending] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending anime', details: error.message },
      { status: 500 },
    );
  }
}
