/**
 * GET /api/people/[id]/related
 *
 * Get "People Also Viewed" — co-stars and collaborators from the person's top movies.
 * Returns the most frequent co-stars ranked by shared movie count and popularity.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as TMDb from '@/lib/pipeline/clients/tmdb';

export const maxDuration = 30;

interface RelatedPerson {
  id: number;
  name: string;
  profile_path: string;
  known_for_department: string;
  shared_credits: number;
  shared_movies: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const personId = parseInt(id, 10);

    if (isNaN(personId) || personId <= 0) {
      return NextResponse.json({ error: 'Invalid person ID.' }, { status: 400 });
    }

    // Get the person's combined credits
    const credits = await TMDb.getPersonCredits(personId);
    if (!credits) {
      return NextResponse.json({ results: [] });
    }

    // Take the person's top 8 most popular cast credits
    const topCastCredits = credits.cast
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 8);

    // For each movie, fetch the movie's credits to find co-stars
    const coStarMap = new Map<number, RelatedPerson>();

    await Promise.all(
      topCastCredits.map(async (credit) => {
        try {
          // Fetch movie credits from the API
          const movieCredits = await TMDb.getMovieCredits(credit.id);
          if (!movieCredits) return;

          // Process cast
          for (const coStar of (movieCredits.cast as any[]).slice(0, 10)) {
            if (coStar.id === personId) continue; // Skip self

            const existing = coStarMap.get(coStar.id);
            if (existing) {
              existing.shared_credits++;
              existing.shared_movies.push(credit.title || credit.original_title);
            } else {
              coStarMap.set(coStar.id, {
                id: coStar.id,
                name: coStar.name,
                profile_path: TMDb.tmdbImageUrl(coStar.profile_path, 'w185') || '',
                known_for_department: coStar.known_for_department ?? 'Acting',
                shared_credits: 1,
                shared_movies: [credit.title || credit.original_title],
              });
            }
          }

          // Process key crew (Director, Producer, Writer)
          for (const crewMember of (movieCredits.crew as any[]).slice(0, 6)) {
            if (crewMember.id === personId) continue;
            if (!['Director', 'Producer', 'Writer', 'Executive Producer'].includes(crewMember.job ?? '')) continue;

            const existing = coStarMap.get(crewMember.id);
            if (existing) {
              existing.shared_credits++;
              existing.shared_movies.push(credit.title || credit.original_title);
            } else {
              coStarMap.set(crewMember.id, {
                id: crewMember.id,
                name: crewMember.name,
                profile_path: TMDb.tmdbImageUrl(crewMember.profile_path, 'w185') || '',
                known_for_department: (crewMember as any).known_for_department ?? crewMember.department ?? 'Crew',
                shared_credits: 1,
                shared_movies: [credit.title || credit.original_title],
              });
            }
          }
        } catch {
          // Skip failed movie credit lookups
        }
      })
    );

    // Sort by shared credits (most collaborations first), then by popularity
    const results = Array.from(coStarMap.values())
      .sort((a, b) => {
        if (b.shared_credits !== a.shared_credits) return b.shared_credits - a.shared_credits;
        return b.shared_movies.length - a.shared_movies.length;
      })
      .slice(0, 12); // Return top 12 related people

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[API /people/related] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related people', details: error.message },
      { status: 500 },
    );
  }
}
