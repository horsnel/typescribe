/**
 * GET /api/scrape/movie/[id]
 *
 * Runs the full data pipeline for a single movie by TMDb ID.
 * Returns the complete MergedMovieResult including all scraped + API data.
 *
 * Query params:
 *   enableScraping  – "true"/"false" to toggle scraper sources (default: true)
 *   enableAPIs      – "true"/"false" to toggle API sources (default: true)
 *   scrapers        – comma-separated list of scraper names to enable
 *   forceRefresh    – "true" to invalidate cache and re-fetch (default: false)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMovie } from '@/lib/pipeline';
import { invalidateCachedMovie } from '@/lib/pipeline/cache';
import type { PipelineConfig } from '@/lib/pipeline/merger';

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

    // ── Parse optional query params ──
    const { searchParams } = request.nextUrl;

    const enableScraping = searchParams.get('enableScraping');
    const enableAPIs = searchParams.get('enableAPIs');
    const scrapersParam = searchParams.get('scrapers');
    const forceRefresh = searchParams.get('forceRefresh');

    // Build pipeline config from query params
    const config: PipelineConfig = {};

    if (enableScraping !== null) {
      config.enableScraping = enableScraping === 'true';
    }
    if (enableAPIs !== null) {
      config.enableAPIs = enableAPIs === 'true';
    }
    if (scrapersParam) {
      config.scrapers = scrapersParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    // ── Force refresh: invalidate cache first ──
    if (forceRefresh === 'true') {
      invalidateCachedMovie(`tmdb:${tmdbId}`);
      invalidateCachedMovie(`slug:*`); // Slug cache handled by re-generation
      console.log(`[API /scrape/movie] Cache invalidated for tmdb:${tmdbId}`);
    }

    // ── Run the pipeline ──
    console.log(`[API /scrape/movie] Fetching movie tmdb:${tmdbId}`, {
      config: Object.keys(config).length > 0 ? config : 'default',
      forceRefresh: forceRefresh === 'true',
    });

    const result = await getMovie(tmdbId, config);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /scrape/movie] Error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape movie', details: error.message },
      { status: 500 },
    );
  }
}
