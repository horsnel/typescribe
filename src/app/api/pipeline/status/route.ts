import { NextResponse } from 'next/server';
import { getPipelineStatus, getCacheStats, getAllCachedMovies } from '@/lib/pipeline';

export async function GET() {
  try {
    const status = await getPipelineStatus();
    const cache = await getCacheStats();
    const cachedMovies = await getAllCachedMovies();

    return NextResponse.json({
      status,
      cache,
      cachedMovies,
    });
  } catch (error) {
    console.error('[API /pipeline/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get pipeline status' },
      { status: 500 }
    );
  }
}
