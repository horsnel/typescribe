/**
 * GET /api/browse
 *
 * Browse/discover movies and TV shows using TMDb discover API.
 * Supports filtering by format, country, genre, theme, rating, year, and sort.
 * For anime format, falls back to AniList/Jikan when TMDb returns 0 results.
 *
 * Query params:
 *   format    – "movie" | "tv" | "anime" | "all" (default: "movie")
 *   country   – ISO 3166-1 alpha-2 code or "all" (default: "all")
 *   genres    – comma-separated genre IDs (e.g. "28,12,16")
 *   theme     – TMDb keyword ID for thematic filtering
 *   sort      – TMDb sort string (default: "popularity.desc")
 *   minRating – minimum vote average (0-10)
 *   yearFrom  – start year filter
 *   yearTo    – end year filter
 *   page      – page number (default: 1)
 */
import { NextRequest, NextResponse } from 'next/server';
import { browseMovies, searchAnime, getTrending, getTopRated, getNowPlaying, getUpcoming } from '@/lib/pipeline';
import { getCurrentSeason, getTopAnime } from '@/lib/pipeline/clients/jikan';
import type { Movie, MediaFormat } from '@/lib/types';
import { apiLimiter } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining, resetIn } = apiLimiter.check(clientIp);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfter: resetIn }, { status: 429 });
    }

    const { searchParams } = request.nextUrl;

    // ── Parse source param (trending / top_rated / now_playing) ──
    const source = searchParams.get('source');

    // ── Parse format ──
    const formatRaw = searchParams.get('format') || 'movie';
    const validFormats: MediaFormat[] = ['movie', 'tv', 'anime', 'all'];
    const format: MediaFormat = validFormats.includes(formatRaw as MediaFormat)
      ? (formatRaw as MediaFormat)
      : 'movie';

    // ── Parse genres (comma-separated IDs → number[]) ──
    const genresRaw = searchParams.get('genres');
    const genreIds: number[] = genresRaw
      ? genresRaw
          .split(',')
          .map(g => parseInt(g.trim(), 10))
          .filter(n => !isNaN(n) && n > 0)
      : [];

    // ── Parse theme (keyword ID) ──
    const themeRaw = searchParams.get('theme');
    const themeKeywordId = themeRaw ? parseInt(themeRaw, 10) : null;

    // ── Parse numeric filters ──
    const minRating = parseFloat(searchParams.get('minRating') || '0') || 0;
    const yearFrom = parseInt(searchParams.get('yearFrom') || '0', 10) || undefined;
    const yearTo = parseInt(searchParams.get('yearTo') || '0', 10) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;

    // ── Parse sort & country ──
    const sort = searchParams.get('sort') || 'popularity.desc';
    const country = searchParams.get('country') || 'all';

    // ── Handle source-based shortcuts (trending, top_rated, now_playing) ──
    let result;

    if (source === 'trending') {
      console.log('[API /browse] Fetching trending');
      result = await getTrending('week');
    } else if (source === 'top_rated') {
      console.log('[API /browse] Fetching top rated', { page });
      result = await getTopRated(page);
    } else if (source === 'now_playing') {
      console.log('[API /browse] Fetching now playing', { page });
      result = await getNowPlaying(page);
    } else if (source === 'upcoming') {
      console.log('[API /browse] Fetching upcoming', { page });
      result = await getUpcoming(page);
    } else {
      // ── Call browseMovies ──
      console.log('[API /browse] Browsing movies', {
        format, country, genreIds, themeKeywordId, sort, minRating, yearFrom, yearTo, page,
      });

      result = await browseMovies({
        format,
        country,
        genreIds,
        themeKeywordId,
        sort,
        minRating: minRating > 0 ? minRating : undefined,
        yearFrom,
        yearTo,
        page,
      });
    }

    // ── Anime fallback: If TMDb returned 0 results for anime, try AniList/Jikan ──
    if (format === 'anime' && result.movies.length === 0) {
      console.log('[API /browse] TMDb returned 0 anime results. Falling back to AniList/Jikan...');

      const fallbackMovies: Movie[] = [];
      const fallbackSources: string[] = [];

      // Try Jikan seasonal / top anime
      try {
        const seasonal = await getCurrentSeason('tv');
        if (seasonal && seasonal.length > 0) {
          fallbackSources.push('Jikan');
          for (const a of seasonal.slice(0, 20)) {
            const title = a.titleEnglish || a.title || 'Unknown';
            fallbackMovies.push({
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
              media_type: 'anime' as const,
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
            });
          }
        }
      } catch (err) {
        console.warn('[API /browse] Jikan fallback failed:', err);
      }

      // Try AniList search if still no results
      if (fallbackMovies.length === 0) {
        try {
          const anilistResult = await searchAnime('popular anime');
          if (anilistResult.movies.length > 0) {
            fallbackSources.push('AniList');
            fallbackMovies.push(...anilistResult.movies);
          }
        } catch (err) {
          console.warn('[API /browse] AniList fallback failed:', err);
        }
      }

      // Try Jikan top anime as last resort
      if (fallbackMovies.length === 0) {
        try {
          const top = await getTopAnime('tv', 'bypopularity');
          if (top && top.length > 0) {
            fallbackSources.push('Jikan');
            for (const a of top.slice(0, 20)) {
              const title = a.titleEnglish || a.title || 'Unknown';
              fallbackMovies.push({
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
                media_type: 'anime' as const,
                production_companies: a.studios || [],
                status: a.status || '',
                created_at: new Date().toISOString(),
                is_anime: true,
                anime_mal_id: a.malId || undefined,
                anime_mal_score: a.score || undefined,
                anime_studios: a.studios || undefined,
                anime_season: a.season && a.year
                  ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1).toLowerCase()} ${a.year}`
                  : undefined,
              });
            }
          }
        } catch (err) {
          console.warn('[API /browse] Jikan top anime fallback failed:', err);
        }
      }

      if (fallbackMovies.length > 0) {
        result = {
          movies: fallbackMovies,
          page: 1,
          totalPages: 1,
          totalResults: fallbackMovies.length,
          sources: fallbackSources,
          durationMs: result.durationMs,
        };
      } else {
        // Last resort: mock anime data
        const mockAnime = [
          { t: 'Attack on Titan: The Final Season', s: 9.0, y: 2024, g: ['Action','Drama','Fantasy'], img: 'https://cdn.myanimelist.net/images/anime/1000/110531.jpg', st: 'MAPPA' },
          { t: 'Jujutsu Kaisen Season 2', s: 8.7, y: 2023, g: ['Action','Supernatural'], img: 'https://cdn.myanimelist.net/images/anime/1792/138022.jpg', st: 'MAPPA' },
          { t: 'Demon Slayer: Hashira Training', s: 8.5, y: 2024, g: ['Action','Fantasy'], img: 'https://cdn.myanimelist.net/images/anime/1428/141939.jpg', st: 'Ufotable' },
          { t: 'Spy x Family Season 2', s: 8.4, y: 2023, g: ['Action','Comedy'], img: 'https://cdn.myanimelist.net/images/anime/1441/139629.jpg', st: 'WIT Studio' },
          { t: 'Frieren: Beyond Journey\'s End', s: 9.1, y: 2023, g: ['Adventure','Fantasy','Drama'], img: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg', st: 'Madhouse' },
          { t: 'Solo Leveling', s: 8.3, y: 2024, g: ['Action','Fantasy'], img: 'https://cdn.myanimelist.net/images/anime/1422/135042.jpg', st: 'A-1 Pictures' },
          { t: 'Chainsaw Man', s: 8.5, y: 2022, g: ['Action','Horror'], img: 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg', st: 'MAPPA' },
          { t: 'My Hero Academia Season 7', s: 7.9, y: 2024, g: ['Action','Superhero'], img: 'https://cdn.myanimelist.net/images/anime/1030/138298.jpg', st: 'Bones' },
        ];
        result = {
          movies: mockAnime.map((a, i) => ({
            id: 9000 + i,
            tmdb_id: 0,
            slug: a.t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            title: a.t,
            original_title: '',
            overview: `A ${a.g.join('/')} anime by ${a.st}.`,
            release_date: `${a.y}-01-01`,
            poster_path: a.img,
            backdrop_path: '',
            genres: a.g.map((g, j) => ({ id: -(j + 1), name: g })),
            runtime: 24,
            vote_average: a.s / 10,
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
            production_companies: [a.st],
            status: 'Released',
            created_at: new Date().toISOString(),
            is_anime: true,
          })),
          page: 1,
          totalPages: 1,
          totalResults: mockAnime.length,
          sources: ['Mock'],
          durationMs: result.durationMs,
        };
      }
    }

    return NextResponse.json({
      ...result,
      fromAPI: result.sources.length > 0,
    });
  } catch (error: any) {
    console.error('[API /browse] Error:', error);
    return NextResponse.json(
      { error: 'Failed to browse movies', details: error.message },
      { status: 500 },
    );
  }
}
