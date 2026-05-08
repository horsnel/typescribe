/**
 * GET /api/top-choice
 *
 * Returns the most trending movie from each genre/region category.
 * Uses TMDb discover + trending APIs with country filters to get
 * the #1 trending pick per region.
 *
 * Categories: Hollywood, Bollywood, K-Drama, Nollywood, South African,
 * C-Drama, Thai Drama, UK, Anime, Turkish, and more.
 */
import { NextRequest, NextResponse } from 'next/server';
import { discoverMovies, discoverTv, getTrending } from '@/lib/pipeline/clients/tmdb';
import { getCurrentSeason, getTopAnime } from '@/lib/pipeline/clients/jikan';
import type { Movie } from '@/lib/types';
import { apiLimiter } from '@/lib/rate-limit';

interface TopChoiceCategory {
  id: string;
  label: string;
  flag: string;
  movie: Movie | null;
}

const CATEGORIES = [
  { id: 'hollywood', label: 'Hollywood', flag: '🇺🇸', country: 'US', format: 'movie' as const },
  { id: 'bollywood', label: 'Bollywood', flag: '🇮🇳', country: 'IN', format: 'movie' as const },
  { id: 'kdrama', label: 'K-Drama', flag: '🇰🇷', country: 'KR', format: 'tv' as const },
  { id: 'nollywood', label: 'Nollywood', flag: '🇳🇬', country: 'NG', format: 'movie' as const },
  { id: 'southafrica', label: 'South Africa', flag: '🇿🇦', country: 'ZA', format: 'movie' as const },
  { id: 'cdrama', label: 'C-Drama', flag: '🇨🇳', country: 'CN', format: 'tv' as const },
  { id: 'thai', label: 'Thai Drama', flag: '🇹🇭', country: 'TH', format: 'tv' as const },
  { id: 'uk', label: 'UK', flag: '🇬🇧', country: 'GB', format: 'movie' as const },
  { id: 'anime', label: 'Anime', flag: '🇯🇵', country: 'JP', format: 'tv' as const },
  { id: 'turkish', label: 'Turkish', flag: '🇹🇷', country: 'TR', format: 'tv' as const },
  { id: 'mexican', label: 'Mexican Cinema', flag: '🇲🇽', country: 'MX', format: 'movie' as const },
  { id: 'brazilian', label: 'Brazilian', flag: '🇧🇷', country: 'BR', format: 'movie' as const },
  { id: 'french', label: 'French Cinema', flag: '🇫🇷', country: 'FR', format: 'movie' as const },
  { id: 'filipino', label: 'Filipino', flag: '🇵🇭', country: 'PH', format: 'movie' as const },
];

export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed } = apiLimiter.check(clientIp);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Fetch top pick for each category in parallel
    const results: TopChoiceCategory[] = [];

    const fetchPromises = CATEGORIES.map(async (cat) => {
      let movie: Movie | null = null;

      try {
        if (cat.id === 'anime') {
          // Special handling for anime — use Jikan API
          try {
            const seasonal = await getCurrentSeason('tv');
            if (seasonal && seasonal.length > 0) {
              const top = seasonal[0];
              const title = top.titleEnglish || top.title || 'Unknown';
              movie = {
                id: top.malId || 0,
                tmdb_id: 0,
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + `-${top.malId || 0}`,
                title,
                original_title: top.titleJapanese || top.titleRomaji || top.title || '',
                overview: top.synopsis || '',
                release_date: top.year ? `${top.year}-01-01` : '',
                poster_path: top.imageUrl || '',
                backdrop_path: '',
                genres: (top.genres || []).map((g: string, i: number) => ({ id: -(i + 1), name: g })),
                runtime: 0,
                vote_average: top.score ? top.score / 10 : 0,
                vote_count: top.scoredBy || 0,
                imdb_rating: '',
                rotten_tomatoes: '',
                metascore: '',
                trailer_youtube_id: top.trailerYoutubeId || '',
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
                production_companies: top.studios || [],
                status: top.status || '',
                created_at: new Date().toISOString(),
                is_anime: true,
                anime_mal_id: top.malId || undefined,
                anime_mal_score: top.score || undefined,
              };
            }
          } catch {
            // Jikan failed, try TMDb
          }

          if (!movie) {
            const tvResult = await discoverTv({
              with_origin_country: 'JP',
              with_genres: '16',
              sort_by: 'popularity.desc',
              'vote_count.gte': 100,
              page: 1,
            });
            if (tvResult && tvResult.results.length > 0) {
              movie = { ...tvResult.results[0], media_type: 'anime' as const, is_anime: true };
            }
          }
        } else if (cat.format === 'tv') {
          const tvResult = await discoverTv({
            with_origin_country: cat.country,
            sort_by: 'popularity.desc',
            'vote_count.gte': 20,
            page: 1,
          });
          if (tvResult && tvResult.results.length > 0) {
            movie = tvResult.results[0];
          }
        } else {
          const movieResult = await discoverMovies({
            with_origin_country: cat.country,
            sort_by: 'popularity.desc',
            'vote_count.gte': 20,
            page: 1,
          });
          if (movieResult && movieResult.results.length > 0) {
            movie = movieResult.results[0];
          }
        }
      } catch (err) {
        console.warn(`[TopChoice] Failed to fetch for ${cat.id}:`, err);
      }

      return {
        id: cat.id,
        label: cat.label,
        flag: cat.flag,
        movie,
      };
    });

    const settled = await Promise.allSettled(fetchPromises);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    // Filter out categories with no movie, maintain order
    const validResults = results.filter(r => r.movie);

    return NextResponse.json({
      categories: validResults,
      total: validResults.length,
    });
  } catch (error: any) {
    console.error('[API /top-choice] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top choices', details: error.message },
      { status: 500 }
    );
  }
}
