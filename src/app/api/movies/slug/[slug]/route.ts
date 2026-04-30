/**
 * GET /api/movies/slug/[slug]
 *
 * Get a single movie by its URL slug.
 *
 * Strategy (two-tier response):
 *   1. FAST mode (default): Returns TMDb data immediately (~2-3s)
 *      - Checks cache first, then fetches from TMDb only
 *      - Sets `enriched: false` if only TMDb data is available
 *      - Kicks off background enrichment (scrapers + APIs) if not cached
 *
 *   2. ENRICHED mode (?enriched=true): Waits for the full pipeline (~5-40s)
 *      - Runs all scrapers + APIs
 *      - Returns fully merged data with `enriched: true`
 *
 * This ensures the movie page always renders quickly with basic data,
 * while enriched data loads progressively.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as TMDb from '@/lib/pipeline/clients/tmdb';
import { getCachedMovie, setCachedMovie } from '@/lib/pipeline/cache';
import { mergeMovieData } from '@/lib/pipeline/merger';
import type { Movie } from '@/lib/types';

export const maxDuration = 60; // Vercel function timeout (seconds)

const PIPELINE_TIMEOUT_MS = 45_000;

// Track in-flight enrichment jobs to avoid duplicate work
const inFlightEnrichment = new Map<string, Promise<void>>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // ── Validate slug ──
    if (!slug || slug.trim().length === 0) {
      return NextResponse.json(
        { error: 'Slug parameter is required.' },
        { status: 400 },
      );
    }

    const trimmedSlug = slug.trim();
    const wantEnriched = request.nextUrl.searchParams.get('enriched') === 'true';

    console.log(`[API /movies/slug] Looking up slug: "${trimmedSlug}" (enriched=${wantEnriched})`);

    // ── Step 1: Check cache first (instant if available) ──
    const slugCacheKey = `slug:${trimmedSlug}`;
    const cached = getCachedMovie(slugCacheKey);

    if (cached) {
      console.log(`[API /movies/slug] Cache hit for "${trimmedSlug}" (completeness=${cached.completeness})`);

      // If we have enriched cached data, return it
      if (cached.completeness >= 50 || !wantEnriched) {
        return NextResponse.json({
          movie: cached.movie,
          sources: cached.sources,
          completeness: cached.completeness,
          enriched: cached.completeness >= 50,
          fromCache: true,
        });
      }
    }

    // ── Step 2: Extract TMDb ID from slug ──
    const slugIdMatch = trimmedSlug.match(/-(\d+)$/);
    const tmdbId = slugIdMatch ? parseInt(slugIdMatch[1], 10) : null;

    // ── Step 3: If enriched mode requested, run full pipeline ──
    if (wantEnriched) {
      if (tmdbId && tmdbId > 0) {
        try {
          // Determine media type hint from cached data if available
          const cachedMediaType = cached?.movie?.media_type as string | undefined;
          const mediaType = cachedMediaType === 'tv' ? 'tv' as const : 'movie' as const;

          // Use mergeMovieData directly to bypass cache and get full pipeline data
          const result = await Promise.race([
            mergeMovieData(tmdbId, { mediaType }),
            new Promise<null>((_, rej) =>
              setTimeout(() => rej(new Error('Pipeline timeout')), PIPELINE_TIMEOUT_MS)
            ),
          ]);
          if (result && result.completeness > 0 && result.movie.title) {
            // Cache the enriched result
            setCachedMovie(slugCacheKey, result.movie, result.sources, result.completeness);
            setCachedMovie(`tmdb:${tmdbId}`, result.movie, result.sources, result.completeness);

            return NextResponse.json({
              movie: result.movie,
              sources: result.sources,
              completeness: result.completeness,
              enriched: true,
            });
          }
          // Pipeline returned empty result — fall through to return cached data if any
        } catch (err) {
          console.warn(`[API /movies/slug] Full pipeline failed for "${trimmedSlug}"`, err);
        }
      }

      // If enriched failed, return whatever we have in cache
      if (cached) {
        return NextResponse.json({
          movie: cached.movie,
          sources: cached.sources,
          completeness: cached.completeness,
          enriched: cached.completeness >= 50,
          fromCache: true,
        });
      }

      return NextResponse.json(
        { error: `Movie with slug "${trimmedSlug}" not found.` },
        { status: 404 },
      );
    }

    // ── Step 4: FAST mode — Return TMDb data immediately ──
    if (tmdbId && tmdbId > 0) {
      console.log(`[API /movies/slug] Fast mode: fetching TMDb ID ${tmdbId}`);

      // Try BOTH movie and TV endpoints in parallel — TMDb IDs are namespace-separated,
      // so the same numeric ID can refer to a different movie vs TV show.
      // We pick the result whose generated slug best matches the URL slug.
      const [movieResult, tvResult] = await Promise.all([
        TMDb.getMovieDetails(tmdbId).catch(() => null),
        TMDb.getTvDetails(tmdbId).catch(() => null),
      ]);

      // Helper: compute slug similarity (exact match > prefix match > no match)
      const slugScore = (m: { slug: string } | null): number => {
        if (!m) return -1;
        if (m.slug === trimmedSlug) return 100;
        // Check if the title part of the slug matches
        const mTitle = m.slug.replace(/-\d+$/, '');
        const expectedTitle = trimmedSlug.replace(/-\d+$/, '');
        if (mTitle === expectedTitle) return 90;
        // Partial match
        if (mTitle.length > 2 && expectedTitle.includes(mTitle)) return 70;
        if (mTitle.length > 2 && mTitle.includes(expectedTitle)) return 70;
        return 0;
      };

      const movieScore = slugScore(movieResult);
      const tvScore = slugScore(tvResult);

      let movie: Movie | null = null;
      if (movieResult && tvResult) {
        // Both returned — pick the one with better slug match
        movie = tvScore > movieScore ? tvResult : movieResult;
        console.log(`[API /movies/slug] Both endpoints returned. Movie slug="${movieResult.slug}" (score=${movieScore}), TV slug="${tvResult.slug}" (score=${tvScore}). Picked ${tvScore > movieScore ? 'TV' : 'Movie'}.`);
      } else {
        movie = movieResult || tvResult;
      }

      if (movie) {
        // Ensure slug matches the URL
        if (movie.slug !== trimmedSlug) {
          movie.slug = trimmedSlug;
        }

        // Cache the fast result (so next request is instant)
        const tmdbCacheKey = `tmdb:${tmdbId}`;
        setCachedMovie(tmdbCacheKey, movie, ['TMDb'], 30);
        setCachedMovie(slugCacheKey, movie, ['TMDb'], 30);

        // Kick off background enrichment (fire-and-forget)
        kickOffEnrichment(trimmedSlug, tmdbId, movie.media_type as 'movie' | 'tv' | undefined);

        return NextResponse.json({
          movie,
          sources: ['TMDb'],
          completeness: 30,
          enriched: false,
        });
      }
    }

    // ── Step 5: Fallback — try title-based search on TMDb ──
    const titlePart = trimmedSlug.replace(/-/g, ' ').replace(/\s+\d+$/, '').trim();
    if (titlePart.length >= 2) {
      console.log(`[API /movies/slug] Searching TMDb for title: "${titlePart}"`);
      try {
        const searchResult = await TMDb.searchMulti(titlePart);
        if (searchResult && searchResult.length > 0) {
          const firstMatch = searchResult[0];
          // Cache and return
          setCachedMovie(slugCacheKey, firstMatch, ['TMDb'], 25);
          return NextResponse.json({
            movie: firstMatch,
            sources: ['TMDb'],
            completeness: 25,
            enriched: false,
          });
        }
      } catch (err) {
        console.warn(`[API /movies/slug] Search failed for "${titlePart}"`, err);
      }
    }

    return NextResponse.json(
      { error: `Movie with slug "${trimmedSlug}" not found.` },
      { status: 404 },
    );
  } catch (error: any) {
    console.error('[API /movies/slug] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get movie by slug', details: error.message },
      { status: 500 },
    );
  }
}

/**
 * Fire-and-forget background enrichment.
 * Runs the full pipeline (scrapers + APIs) and caches the result.
 * Avoids duplicate enrichment jobs for the same slug.
 */
function kickOffEnrichment(slug: string, tmdbId: number, mediaType?: 'movie' | 'tv'): void {
  const key = `enrich:${slug}`;

  if (inFlightEnrichment.has(key)) return;

  const job = (async () => {
    try {
      console.log(`[API /movies/slug] Starting background enrichment for "${slug}" (TMDb ${tmdbId}, mediaType=${mediaType || 'auto'})`);
      const result = await mergeMovieData(tmdbId, mediaType ? { mediaType } : {});

      if (result.completeness > 0 && result.movie.title) {
        const slugCacheKey = `slug:${slug}`;
        const tmdbCacheKey = `tmdb:${tmdbId}`;
        setCachedMovie(slugCacheKey, result.movie, result.sources, result.completeness);
        setCachedMovie(tmdbCacheKey, result.movie, result.sources, result.completeness);
        console.log(`[API /movies/slug] Background enrichment complete for "${slug}" (completeness=${result.completeness}, sources=${result.sources.length})`);
      }
    } catch (err) {
      console.warn(`[API /movies/slug] Background enrichment failed for "${slug}"`, err);
    } finally {
      inFlightEnrichment.delete(key);
    }
  })();

  inFlightEnrichment.set(key, job);
}
