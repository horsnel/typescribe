import { NextRequest, NextResponse } from 'next/server';
import { getMoviesWithFallback, isPipelineConfigured } from '@/lib/pipeline';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const source = (searchParams.get('source') as 'trending' | 'top_rated' | 'now_playing') || 'trending';
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Validate source param
    const validSources = ['trending', 'top_rated', 'now_playing'] as const;
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate page param
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Page must be a positive integer' },
        { status: 400 }
      );
    }

    const result = await getMoviesWithFallback(source, page);

    return NextResponse.json({
      movies: result.movies,
      fromAPI: result.fromAPI,
      page,
    });
  } catch (error) {
    console.error('[API /movies] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 }
    );
  }
}
