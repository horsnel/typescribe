/**
 * Free-Tier Pipeline — Fallback data sources that require NO API keys.
 *
 * Sources:
 *   - AniList (GraphQL, free, no key) — trending/popular anime
 *   - Jikan   (REST, free, no key)   — seasonal/top anime from MAL
 *   - TVMaze  (REST, free, no key)   — TV show schedule & search
 *
 * These functions convert results from each source into the Movie type
 * used by the rest of the Typescribe pipeline.
 */

import type { Movie, MediaFormat } from '@/lib/types';
import * as AniList from '@/lib/pipeline/clients/anilist';
import * as Jikan from '@/lib/pipeline/clients/jikan';

// ─── TVMaze Types ────────────────────────────────────────────────────────────

interface TVMazeShow {
  id: number;
  name: string;
  type: string;
  language: string | null;
  genres: string[];
  status: string;
  runtime: number | null;
  averageRuntime: number | null;
  premiered: string | null;
  ended: string | null;
  rating: { average: number | null };
  image: { medium: string; original: string } | null;
  summary: string | null;
  network: { name: string; country: { code: string } | null } | null;
  webChannel: { name: string; country: { code: string } | null } | null;
}

interface TVMazeScheduleItem {
  id: number;
  name: string;
  type: string;
  language: string | null;
  genres: string[];
  status: string;
  runtime: number | null;
  averageRuntime: number | null;
  premiered: string | null;
  rating: { average: number | null };
  image: { medium: string; original: string } | null;
  summary: string | null;
  show: TVMazeShow;
}

// ─── TVMaze Fetch ────────────────────────────────────────────────────────────

const TVMAZE_BASE = 'https://api.tvmaze.com';
const TVMAZE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const tvMazeCache = new Map<string, { data: unknown; expiresAt: number }>();

function getTVCache<T>(key: string): T | null {
  const entry = tvMazeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { tvMazeCache.delete(key); return null; }
  return entry.data as T;
}

function setTVCache<T>(key: string, data: T, ttl = TVMAZE_CACHE_TTL): void {
  tvMazeCache.set(key, { data, expiresAt: Date.now() + ttl });
}

async function tvMazeFetch<T>(endpoint: string, ttl = TVMAZE_CACHE_TTL): Promise<T | null> {
  const url = `${TVMAZE_BASE}${endpoint}`;
  const cached = getTVCache<T>(url);
  if (cached !== null) return cached;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[TVMaze] ${res.status} ${res.statusText} — ${url}`);
      return null;
    }
    const data = await res.json() as T;
    setTVCache(url, data, ttl);
    return data;
  } catch (err) {
    console.warn('[TVMaze] Request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Transform Helpers ───────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Transform an AniList result into a Movie */
function anilistToMovie(result: AniList.AniListResult): Movie {
  return {
    id: result.anilistId,
    tmdb_id: 0,
    slug: slugify(result.title.english || result.title.romaji || 'unknown') + `-${result.anilistId}`,
    title: result.title.english || result.title.romaji || 'Unknown',
    original_title: result.title.native || result.title.romaji || '',
    overview: result.description?.replace(/<[^>]*>/g, '').trim() || '',
    release_date: result.startDate?.year
      ? `${result.startDate.year}-${String(result.startDate.month || 1).padStart(2, '0')}-${String(result.startDate.day || 1).padStart(2, '0')}`
      : '',
    poster_path: result.coverImage?.large || '',
    backdrop_path: result.bannerImage || '',
    genres: (result.genres || []).map(g => ({ id: -1, name: g })),
    runtime: result.duration || 0,
    vote_average: (result.meanScore || 0) / 10,
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
    production_companies: result.studios || [],
    status: result.status || '',
    created_at: new Date().toISOString(),
    is_anime: true,
    anime_mal_id: result.malId || undefined,
    anime_mal_score: result.meanScore ? Math.round((result.meanScore / 10) * 10) / 10 : undefined,
    anime_studios: result.studios || undefined,
    anime_source: result.source || undefined,
    anime_season: result.season && result.seasonYear
      ? `${result.season.charAt(0).toUpperCase() + result.season.slice(1).toLowerCase()} ${result.seasonYear}`
      : undefined,
    anime_tags: result.tags?.filter(t => t.rank >= 60).map(t => t.name) || undefined,
    anime_streaming: result.streaming?.map(s => ({ platform: s.site, url: s.url })) || undefined,
    anime_episodes_aired: result.nextAiringEpisode?.episode ? result.nextAiringEpisode.episode - 1 : result.episodes || undefined,
    anime_next_episode: result.nextAiringEpisode
      ? new Date(result.nextAiringEpisode.airingAt * 1000).toISOString() : undefined,
  };
}

/** Transform a Jikan result into a Movie */
function jikanToMovie(a: Jikan.JikanAnimeResult): Movie {
  const title = a.titleEnglish || a.title || 'Unknown';
  return {
    id: a.malId || 0,
    tmdb_id: 0,
    slug: slugify(title) + `-${a.malId || 0}`,
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

/** Transform a TVMaze show into a Movie */
function tvMazeToMovie(show: TVMazeShow): Movie {
  const country = show.network?.country?.code || show.webChannel?.country?.code || '';
  return {
    id: show.id,
    tmdb_id: 0,
    slug: slugify(show.name) + `-${show.id}`,
    title: show.name,
    original_title: show.name,
    overview: show.summary?.replace(/<[^>]*>/g, '').trim() || '',
    release_date: show.premiered || '',
    poster_path: show.image?.original || show.image?.medium || '',
    backdrop_path: show.image?.original || '',
    genres: show.genres.map((g, i) => ({ id: -(i + 1), name: g })),
    runtime: show.averageRuntime || show.runtime || 0,
    vote_average: show.rating?.average ? show.rating.average / 1 : 0,
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
    original_language: show.language?.toLowerCase()?.split('-')[0] || 'en',
    origin_country: country || '',
    media_type: 'tv',
    production_companies: show.network?.name ? [show.network.name] : show.webChannel?.name ? [show.webChannel.name] : [],
    status: show.status || '',
    created_at: new Date().toISOString(),
  };
}

/** Transform a TVMaze schedule item (which wraps a show) */
function tvMazeScheduleToMovie(item: TVMazeScheduleItem): Movie {
  return tvMazeToMovie(item.show);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get trending content from free sources.
 * Combines AniList trending + Jikan seasonal + TVMaze schedule.
 */
export async function getFreeTierTrending(limit: number = 20): Promise<Movie[]> {
  const movies: Movie[] = [];
  const seenIds = new Set<number>();

  // 1. AniList trending
  try {
    const trending = await AniList.getTrendingAnime(Math.ceil(limit / 2));
    for (const r of trending) {
      if (!seenIds.has(r.anilistId)) {
        seenIds.add(r.anilistId);
        movies.push(anilistToMovie(r));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] AniList trending error:', err);
  }

  // 2. Jikan current season
  try {
    const seasonal = await Jikan.getCurrentSeason('tv');
    for (const a of seasonal.slice(0, 15)) {
      if (!seenIds.has(a.malId)) {
        seenIds.add(a.malId);
        movies.push(jikanToMovie(a));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] Jikan seasonal error:', err);
  }

  // 3. TVMaze schedule (shows airing today)
  try {
    const schedule = await tvMazeFetch<TVMazeScheduleItem[]>('/schedule');
    if (schedule && Array.isArray(schedule)) {
      for (const item of schedule.slice(0, 10)) {
        if (!seenIds.has(item.show.id)) {
          seenIds.add(item.show.id);
          movies.push(tvMazeScheduleToMovie(item));
        }
      }
    }
  } catch (err) {
    console.warn('[FreeTier] TVMaze schedule error:', err);
  }

  return movies.slice(0, limit);
}

/**
 * Get top-rated content from free sources.
 * Combines Jikan top anime + AniList popular + TVMaze top shows.
 */
export async function getFreeTierTopRated(limit: number = 20): Promise<Movie[]> {
  const movies: Movie[] = [];
  const seenIds = new Set<number>();

  // 1. Jikan top anime (by score)
  try {
    const top = await Jikan.getTopAnime('tv', '');
    for (const a of top.slice(0, 15)) {
      if (!seenIds.has(a.malId)) {
        seenIds.add(a.malId);
        movies.push(jikanToMovie(a));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] Jikan top anime error:', err);
  }

  // 2. AniList popular (by popularity)
  try {
    const popular = await AniList.getPopularAnime(Math.ceil(limit / 2));
    for (const r of popular) {
      if (!seenIds.has(r.anilistId)) {
        seenIds.add(r.anilistId);
        movies.push(anilistToMovie(r));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] AniList popular error:', err);
  }

  // 3. TVMaze top-rated shows (use shows endpoint with rating sort)
  try {
    const shows = await tvMazeFetch<TVMazeShow[]>('/shows');
    if (shows && Array.isArray(shows)) {
      // Sort by rating descending
      const sorted = shows
        .filter(s => s.rating?.average && s.rating.average > 0)
        .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
      for (const show of sorted.slice(0, 10)) {
        if (!seenIds.has(show.id)) {
          seenIds.add(show.id);
          movies.push(tvMazeToMovie(show));
        }
      }
    }
  } catch (err) {
    console.warn('[FreeTier] TVMaze shows error:', err);
  }

  return movies.slice(0, limit);
}

/**
 * Get now playing / new releases from free sources.
 * Combines Jikan current season + TVMaze schedule + AniList trending.
 */
export async function getFreeTierNowPlaying(limit: number = 20): Promise<Movie[]> {
  const movies: Movie[] = [];
  const seenIds = new Set<number>();

  // 1. TVMaze schedule (shows airing today = "now playing")
  try {
    const schedule = await tvMazeFetch<TVMazeScheduleItem[]>('/schedule');
    if (schedule && Array.isArray(schedule)) {
      for (const item of schedule.slice(0, 15)) {
        if (!seenIds.has(item.show.id)) {
          seenIds.add(item.show.id);
          movies.push(tvMazeScheduleToMovie(item));
        }
      }
    }
  } catch (err) {
    console.warn('[FreeTier] TVMaze schedule error:', err);
  }

  // 2. Jikan current season (airing anime)
  try {
    const seasonal = await Jikan.getCurrentSeason('tv');
    for (const a of seasonal.slice(0, 15)) {
      if (!seenIds.has(a.malId)) {
        seenIds.add(a.malId);
        movies.push(jikanToMovie(a));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] Jikan current season error:', err);
  }

  // 3. AniList trending
  try {
    const trending = await AniList.getTrendingAnime(10);
    for (const r of trending) {
      if (!seenIds.has(r.anilistId)) {
        seenIds.add(r.anilistId);
        movies.push(anilistToMovie(r));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] AniList trending error:', err);
  }

  return movies.slice(0, limit);
}

/**
 * Get upcoming content from free sources.
 * Combines Jikan upcoming + TVMaze shows + AniList popular (as proxy).
 */
export async function getFreeTierUpcoming(limit: number = 20): Promise<Movie[]> {
  const movies: Movie[] = [];
  const seenIds = new Set<number>();

  // 1. Jikan upcoming anime
  try {
    const upcoming = await Jikan.getTopAnime('tv', 'upcoming');
    for (const a of upcoming.slice(0, 15)) {
      if (!seenIds.has(a.malId)) {
        seenIds.add(a.malId);
        movies.push(jikanToMovie(a));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] Jikan upcoming error:', err);
  }

  // 2. AniList popular (as a proxy for anticipated content)
  try {
    const popular = await AniList.getPopularAnime(10);
    for (const r of popular) {
      if (!seenIds.has(r.anilistId)) {
        seenIds.add(r.anilistId);
        movies.push(anilistToMovie(r));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] AniList popular error:', err);
  }

  return movies.slice(0, limit);
}

/**
 * Browse with filters using free sources.
 * Since free sources don't support complex filtering, we fetch and filter client-side.
 */
export async function freeTierBrowse(filters: {
  format?: 'movie' | 'tv' | 'anime' | 'all';
  genreIds?: number[];
  sort?: string;
  page?: number;
}): Promise<{ movies: Movie[]; page: number; totalPages: number; totalResults: number }> {
  const format = filters.format || 'all';
  const page = filters.page || 1;
  const perPage = 20;

  let allMovies: Movie[] = [];

  // Fetch from appropriate sources based on format
  if (format === 'anime' || format === 'all') {
    // AniList + Jikan for anime
    try {
      const trending = await AniList.getTrendingAnime(15);
      allMovies.push(...trending.map(anilistToMovie));
    } catch { /* ignore */ }

    try {
      const seasonal = await Jikan.getCurrentSeason('tv');
      allMovies.push(...seasonal.slice(0, 15).map(jikanToMovie));
    } catch { /* ignore */ }

    try {
      const topAnime = await Jikan.getTopAnime('tv', 'bypopularity');
      allMovies.push(...topAnime.slice(0, 15).map(jikanToMovie));
    } catch { /* ignore */ }
  }

  if (format === 'tv' || format === 'all') {
    // TVMaze for TV shows
    try {
      const shows = await tvMazeFetch<TVMazeShow[]>('/shows');
      if (shows && Array.isArray(shows)) {
        allMovies.push(...shows.slice(0, 40).map(tvMazeToMovie));
      }
    } catch { /* ignore */ }

    try {
      const schedule = await tvMazeFetch<TVMazeScheduleItem[]>('/schedule');
      if (schedule && Array.isArray(schedule)) {
        allMovies.push(...schedule.slice(0, 20).map(tvMazeScheduleToMovie));
      }
    } catch { /* ignore */ }
  }

  if (format === 'movie') {
    // For movies specifically, use Jikan movie type + TVMaze shows filtered by type
    try {
      const topMovies = await Jikan.getTopAnime('movie', '');
      allMovies.push(...topMovies.slice(0, 20).map(jikanToMovie));
    } catch { /* ignore */ }

    try {
      const shows = await tvMazeFetch<TVMazeShow[]>('/shows');
      if (shows && Array.isArray(shows)) {
        // TVMaze doesn't distinguish movies well, but we include some
        allMovies.push(...shows.slice(0, 20).map(tvMazeToMovie));
      }
    } catch { /* ignore */ }
  }

  // Deduplicate by id
  const seen = new Set<number>();
  allMovies = allMovies.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  // Filter by media_type if format is specific
  if (format === 'anime') {
    allMovies = allMovies.filter(m => m.media_type === 'anime');
  } else if (format === 'tv') {
    allMovies = allMovies.filter(m => m.media_type === 'tv');
  } else if (format === 'movie') {
    allMovies = allMovies.filter(m => m.media_type === 'movie' || m.media_type === 'anime');
  }

  // Sort
  const sort = filters.sort || 'popularity.desc';
  switch (sort) {
    case 'vote_average.desc':
      allMovies.sort((a, b) => b.vote_average - a.vote_average);
      break;
    case 'vote_average.asc':
      allMovies.sort((a, b) => a.vote_average - b.vote_average);
      break;
    case 'primary_release_date.desc':
      allMovies.sort((a, b) => b.release_date.localeCompare(a.release_date));
      break;
    case 'primary_release_date.asc':
      allMovies.sort((a, b) => a.release_date.localeCompare(b.release_date));
      break;
    case 'title.asc':
      allMovies.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      // popularity.desc — keep order (already roughly by popularity)
      break;
  }

  const totalResults = allMovies.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / perPage));
  const start = (page - 1) * perPage;
  const paged = allMovies.slice(start, start + perPage);

  return { movies: paged, page, totalPages, totalResults };
}

/**
 * Search using free sources (AniList + Jikan + TVMaze).
 */
export async function freeTierSearch(query: string): Promise<Movie[]> {
  const movies: Movie[] = [];
  const seenIds = new Set<number>();

  // 1. AniList search
  try {
    const results = await AniList.searchAnime(query);
    for (const r of results) {
      if (!seenIds.has(r.anilistId)) {
        seenIds.add(r.anilistId);
        movies.push(anilistToMovie(r));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] AniList search error:', err);
  }

  // 2. Jikan search
  try {
    const results = await Jikan.searchAnime(query, 10);
    for (const a of results) {
      if (!seenIds.has(a.malId)) {
        seenIds.add(a.malId);
        movies.push(jikanToMovie(a));
      }
    }
  } catch (err) {
    console.warn('[FreeTier] Jikan search error:', err);
  }

  // 3. TVMaze search
  try {
    const results = await tvMazeFetch<TVMazeShow[]>(`/search/shows?q=${encodeURIComponent(query)}`);
    if (results && Array.isArray(results)) {
      for (const show of results) {
        if (!seenIds.has(show.id)) {
          seenIds.add(show.id);
          movies.push(tvMazeToMovie(show));
        }
      }
    }
  } catch (err) {
    console.warn('[FreeTier] TVMaze search error:', err);
  }

  return movies;
}
