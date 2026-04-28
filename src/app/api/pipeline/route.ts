import { NextRequest, NextResponse } from 'next/server';
import { processBatch } from '@/lib/pipeline';

/**
 * POST /api/pipeline
 * Batch process movies by TMDb IDs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmdbIds } = body;

    if (!Array.isArray(tmdbIds) || tmdbIds.length === 0) {
      return NextResponse.json(
        { error: 'tmdbIds must be a non-empty array of numbers' },
        { status: 400 }
      );
    }

    if (tmdbIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 IDs per batch' },
        { status: 400 }
      );
    }

    const result = await processBatch(tmdbIds);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /pipeline POST] Error:', error);
    return NextResponse.json(
      { error: 'Batch processing failed', details: error.message },
      { status: 500 }
    );
  }
}
