/**
 * POST /api/scrape/batch
 *
 * Batch-processes multiple movies by TMDb IDs through the full pipeline.
 * Returns a BatchMergeResult with individual results per movie.
 *
 * Body:
 *   tmdbIds        – number[] (required, max 50)
 *   enableScraping – boolean  (optional, default true)
 *   enableAPIs     – boolean  (optional, default true)
 *   scrapers       – string[] (optional, list of scraper names)
 */
import { NextRequest, NextResponse } from 'next/server';
import { processBatch } from '@/lib/pipeline';
import type { PipelineConfig } from '@/lib/pipeline/merger';

const MAX_BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  try {
    // ── Parse request body ──
    const body = await request.json();
    const { tmdbIds, enableScraping, enableAPIs, scrapers } = body;

    // ── Validate tmdbIds ──
    if (!Array.isArray(tmdbIds) || tmdbIds.length === 0) {
      return NextResponse.json(
        { error: 'tmdbIds must be a non-empty array of numbers.' },
        { status: 400 },
      );
    }

    if (tmdbIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} IDs per batch request.` },
        { status: 400 },
      );
    }

    // Validate each ID is a valid number
    const invalidIds = tmdbIds.filter(
      (id: unknown) => typeof id !== 'number' || !Number.isInteger(id) || id <= 0,
    );
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'All tmdbIds must be positive integers.', invalidIds },
        { status: 400 },
      );
    }

    // ── Build pipeline config ──
    const config: PipelineConfig = {};

    if (typeof enableScraping === 'boolean') {
      config.enableScraping = enableScraping;
    }
    if (typeof enableAPIs === 'boolean') {
      config.enableAPIs = enableAPIs;
    }
    if (Array.isArray(scrapers) && scrapers.length > 0) {
      config.scrapers = scrapers.filter((s: unknown) => typeof s === 'string');
    }

    // ── Run batch processing ──
    console.log(`[API /scrape/batch] Processing ${tmdbIds.length} movies`, {
      config: Object.keys(config).length > 0 ? config : 'default',
    });

    const result = await processBatch(tmdbIds, config);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /scrape/batch] Error:', error);
    return NextResponse.json(
      { error: 'Batch processing failed', details: error.message },
      { status: 500 },
    );
  }
}
