import { NextResponse } from 'next/server';
import { mergeMovieData, ALL_SCRAPER_NAMES, type PipelineConfig } from '@/lib/pipeline/merger';
import * as Cache from '@/lib/pipeline/cache';
import { resetCircuit, resetAllCircuits } from '@/lib/pipeline/core/circuit-breaker';

/**
 * POST /api/scrape/movie
 * Scrape a single movie by TMDb ID using the full pipeline.
 *
 * Body: {
 *   tmdbId: number;
 *   scrapers?: string[];   // Optional: limit to specific scrapers
 *   forceRefresh?: boolean; // Skip cache and re-scrape
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tmdbId, scrapers, forceRefresh } = body;

    if (!tmdbId || typeof tmdbId !== 'number') {
      return NextResponse.json(
        { error: 'tmdbId is required and must be a number' },
        { status: 400 },
      );
    }

    // If force refresh, invalidate cache
    if (forceRefresh) {
      Cache.invalidateCachedMovie(`tmdb:${tmdbId}`);
    }

    const config: PipelineConfig = {};
    if (scrapers && Array.isArray(scrapers)) {
      config.scrapers = scrapers;
    }

    const result = await mergeMovieData(tmdbId, config);

    return NextResponse.json({
      success: true,
      movie: result.movie,
      sources: result.sources,
      completeness: result.completeness,
      warnings: result.warnings,
      durationMs: result.durationMs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Scrape failed', details: error.message },
      { status: 500 },
    );
  }
}
