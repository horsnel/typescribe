import { NextResponse } from 'next/server';
import { getPipelineHealthReport } from '@/lib/pipeline/core/health-monitor';

/**
 * GET /api/scrape/health
 * Returns the health status of all scrapers and the pipeline.
 */
export async function GET() {
  try {
    const report = getPipelineHealthReport();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get health report', details: error.message },
      { status: 500 },
    );
  }
}
