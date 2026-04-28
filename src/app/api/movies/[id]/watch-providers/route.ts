/**
 * GET /api/movies/[id]/watch-providers
 *
 * Returns the watch/streaming providers for a given movie TMDb ID.
 *
 * Strategy:
 *   1. Try TMDb watch providers first (existing logic via streaming client)
 *   2. If TMDb returns null/empty, fall back to TVMaze search using the
 *      movie title — TVMaze is free (no key) and provides network/web-channel
 *      info that is especially useful for TV-style content.
 *   3. When both sources return data, combine them into a single response.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMovieWatchProviders } from '@/lib/pipeline/clients/streaming';
import { getMovieDetails } from '@/lib/pipeline/clients/tmdb';
import { getWhereToWatch } from '@/lib/api/tvmaze';
import type { StreamingProvider } from '@/lib/pipeline/clients/streaming';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Parse & validate TMDb ID ──
    const { id } = await params;
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json(
        { error: 'Invalid TMDb ID. Must be a positive integer.' },
        { status: 400 },
      );
    }

    console.log(`[API /watch-providers] Fetching providers for movie ${tmdbId}`);

    // ── Step 1: TMDb watch providers ──
    const tmdbResult = await getMovieWatchProviders(tmdbId);

    // If TMDb returned providers, build the response but also check TVMaze
    // so we can merge supplementary streaming info.
    const hasTmdbProviders =
      tmdbResult && tmdbResult.providers && tmdbResult.providers.length > 0;

    // ── Step 2: TVMaze fallback / supplement ──
    // We need the movie title to search TVMaze.  Fetch it from TMDb if we
    // don't already have it from the watch-providers response.
    let movieTitle: string | null = null;
    let tvmazeResult = null;

    if (!hasTmdbProviders) {
      // No TMDb providers — definitely try TVMaze
      const movieDetails = await getMovieDetails(tmdbId);
      movieTitle = movieDetails?.title ?? null;

      if (movieTitle) {
        console.log(
          `[API /watch-providers] TMDb empty — falling back to TVMaze for "${movieTitle}"`,
        );
        tvmazeResult = await getWhereToWatch(movieTitle);
      }
    } else {
      // TMDb has providers — still try TVMaze to enrich with network/streaming
      // info, but do it non-blockingly (don't fail if TVMaze is down).
      try {
        const movieDetails = await getMovieDetails(tmdbId);
        movieTitle = movieDetails?.title ?? null;

        if (movieTitle) {
          tvmazeResult = await getWhereToWatch(movieTitle);
        }
      } catch {
        // Non-critical — swallow errors from TVMaze when TMDb already has data
      }
    }

    // ── Step 3: Build combined response ──

    // Case A: Both sources returned nothing
    if (!hasTmdbProviders && !tvmazeResult) {
      return NextResponse.json(
        { error: `Watch providers not found for movie with TMDb ID ${tmdbId}.` },
        { status: 404 },
      );
    }

    // Case B: Only TVMaze has data (TMDb was empty)
    if (!hasTmdbProviders && tvmazeResult) {
      return NextResponse.json({
        tmdbId,
        link: '',
        providers: tvmazeResult.streamingOptions.map(
          (opt): StreamingProvider => ({
            id: -Math.abs(opt.platform.charCodeAt(0) * 1000 + tvmazeResult.showId),
            name: opt.platform,
            logoUrl: '',
            flatrate: opt.type === 'streaming',
            rent: false,
            buy: false,
            free: opt.type === 'network',
            links: { streaming: opt.url ?? undefined },
          }),
        ),
        countries: {},
        tvmaze: tvmazeResult,
      });
    }

    // Case C: TMDb has data — return it with optional TVMaze supplement
    if (tmdbResult) {
      // Merge TVMaze streaming options that aren't already in the TMDb list
      if (tvmazeResult && tvmazeResult.streamingOptions.length > 0) {
        const existingNames = new Set(
          tmdbResult.providers.map((p) => p.name.toLowerCase()),
        );

        for (const opt of tvmazeResult.streamingOptions) {
          if (!existingNames.has(opt.platform.toLowerCase())) {
            tmdbResult.providers.push({
              id: -Math.abs(opt.platform.charCodeAt(0) * 1000 + tvmazeResult.showId),
              name: opt.platform,
              logoUrl: '',
              flatrate: opt.type === 'streaming',
              rent: false,
              buy: false,
              free: opt.type === 'network',
              links: { streaming: opt.url ?? undefined },
            });
            existingNames.add(opt.platform.toLowerCase());
          }
        }
      }

      return NextResponse.json({
        ...tmdbResult,
        tvmaze: tvmazeResult ?? undefined,
      });
    }

    // Should not reach here, but fallback
    return NextResponse.json(
      { error: `Watch providers not found for movie with TMDb ID ${tmdbId}.` },
      { status: 404 },
    );
  } catch (error: any) {
    console.error('[API /watch-providers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get watch providers', details: error.message },
      { status: 500 },
    );
  }
}
