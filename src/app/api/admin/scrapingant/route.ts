import { NextResponse } from 'next/server';
import { getScrapingAntStats } from '@/lib/pipeline/core/scraping-ant';

/**
 * GET /api/admin/scrapingant
 *
 * Returns ScrapingAnt usage stats including per-key usage,
 * success rate, and remaining quota.
 */
export async function GET() {
  try {
    const stats = getScrapingAntStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get ScrapingAnt stats', details: error.message },
      { status: 500 },
    );
  }
}
