/**
 * GET /api/movies/[id]/ai-review
 *
 * Dedicated endpoint for generating an AI review for a movie.
 * This runs independently of the full enrichment pipeline,
 * so the AI review can load progressively without waiting
 * for all other enrichment steps (scrapers, etc.).
 *
 * Strategy:
 *   1. Check if movie already has a cached AI review
 *   2. If not, generate one via Gemini (or placeholder fallback)
 *   3. Return the review immediately
 *
 * This allows the movie detail page to show a loading skeleton
 * for the AI section while this endpoint generates the review
 * in parallel with other data loading.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as TMDb from '@/lib/pipeline/clients/tmdb';
import * as GeminiAI from '@/lib/pipeline/clients/gemini';
import { getCachedMovie, setCachedMovie } from '@/lib/pipeline/cache';

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json(
        { error: 'Valid movie ID is required.' },
        { status: 400 },
      );
    }

    // Step 1: Check if we already have a cached movie with AI review
    const cacheKey = `tmdb:${tmdbId}`;
    const cached = getCachedMovie(cacheKey);

    if (cached?.movie?.ai_review) {
      return NextResponse.json({
        ai_review: cached.movie.ai_review,
        model: cached.sources?.includes('Gemini') ? 'gemini-2.0-flash' : 'placeholder',
        cached: true,
      });
    }

    // Step 2: Fetch basic movie data from TMDb (needed for the prompt)
    let movie = await TMDb.getMovieDetails(tmdbId);
    let isTv = false;

    if (!movie) {
      movie = await TMDb.getTvDetails(tmdbId);
      isTv = true;
    }

    if (!movie) {
      return NextResponse.json(
        { error: `Movie with ID ${tmdbId} not found.` },
        { status: 404 },
      );
    }

    // Step 3: Generate AI review
    let aiReview: string;
    let model: string;

    if (GeminiAI.isGeminiConfigured()) {
      try {
        const result = await GeminiAI.generateAIReview({
          title: movie.title,
          overview: movie.overview,
          genres: movie.genres,
          director: movie.director,
          tagline: movie.tagline,
          release_date: movie.release_date,
          runtime: movie.runtime,
          vote_average: movie.vote_average,
          imdb_rating: movie.imdb_rating,
          rotten_tomatoes: movie.rotten_tomatoes,
          metascore: movie.metascore,
          rt_consensus: movie.rt_consensus,
          cast: movie.cast,
          origin_country: movie.origin_country,
          original_language: movie.original_language,
          media_type: isTv ? 'tv' : 'movie',
          episodes: movie.episodes,
          tmdb_id: tmdbId,
        });
        aiReview = result.review;
        model = result.model;
      } catch (err) {
        console.warn(`[AI Review] Gemini failed for ${tmdbId}, using placeholder`, err);
        aiReview = generateQuickPlaceholder(movie.title, movie.genres, movie.vote_average);
        model = 'placeholder';
      }
    } else {
      aiReview = generateQuickPlaceholder(movie.title, movie.genres, movie.vote_average);
      model = 'placeholder';
    }

    // Step 4: Update the cache with the new AI review
    if (cached?.movie) {
      cached.movie.ai_review = aiReview;
      const sources = cached.sources || ['TMDb'];
      if (model !== 'placeholder' && !sources.includes('Gemini')) {
        sources.push('Gemini');
      }
      setCachedMovie(cacheKey, cached.movie, sources, cached.completeness);
    }

    return NextResponse.json({
      ai_review: aiReview,
      model,
      cached: false,
    });
  } catch (error: any) {
    console.error('[AI Review API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI review', details: error.message },
      { status: 500 },
    );
  }
}

function generateQuickPlaceholder(
  title: string,
  genres: Array<{ id: number; name: string }>,
  vote_average: number,
): string {
  const genreStr = genres?.map(g => g.name).join('/') || 'film';
  let qualityNote = '';

  if (vote_average >= 7.5) {
    qualityNote = 'Critics and audiences have responded positively, with strong ratings across platforms suggesting a worthwhile viewing experience.';
  } else if (vote_average >= 6) {
    qualityNote = 'The film has received mixed-to-positive reviews, offering an experience that may resonate differently depending on personal taste.';
  } else if (vote_average > 0) {
    qualityNote = 'Reviews have been divided, with some finding merit in its ambitions while others feel it falls short of its potential.';
  }

  return `${title} is a ${genreStr} production that showcases the art of cinematic storytelling. ${qualityNote}`.trim();
}
