import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, getReviewsByUser } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/compromise
 * Body: { userIds: string[], limit?: number }
 *
 * Group Compromise Engine: given 2-6 user IDs, finds movies that ALL of them
 * rated highly (or that are in ALL of their watchlists / diary). Returns
 * movies sorted by the lowest rating in the group (maximin — nobody gets
 * a movie they'd hate).
 */

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userIds, limit = 10 } = await req.json();
  if (!Array.isArray(userIds) || userIds.length < 2 || userIds.length > 6) {
    return NextResponse.json({ error: 'userIds must be 2-6 users' }, { status: 400 });
  }

  // Include the caller if not already in
  const allIds = Array.from(new Set([profile.id, ...userIds]));

  // Fetch each user's reviews
  const perUserReviews = await Promise.all(allIds.map(id => getReviewsByUser(id)));

  // For each movie, gather ratings from each user
  const movieRatings = new Map<number, { title: string; ratings: number[] }>();
  for (const reviews of perUserReviews) {
    for (const r of reviews) {
      if (!movieRatings.has(r.movie_id)) {
        movieRatings.set(r.movie_id, { title: r.movie_title, ratings: [] });
      }
      movieRatings.get(r.movie_id)!.ratings.push(Number(r.rating));
    }
  }

  // Filter to movies that ALL users have rated
  const compromised = Array.from(movieRatings.entries())
    .filter(([_, info]) => info.ratings.length === allIds.length)
    .map(([movieId, info]) => ({
      movie_id: movieId,
      movie_title: info.title,
      ratings: info.ratings,
      min_rating: Math.min(...info.ratings),
      avg_rating: info.ratings.reduce((a, b) => a + b, 0) / info.ratings.length,
      spread: Math.max(...info.ratings) - Math.min(...info.ratings),
    }))
    .sort((a, b) => b.min_rating - a.min_rating || a.spread - b.spread)
    .slice(0, limit);

  // Fetch posters from movie_embeddings (best-effort)
  const ids = compromised.map(c => c.movie_id);
  let posters: Record<number, string> = {};
  if (ids.length > 0) {
    const { data } = await supabaseAdmin
      .from('movie_embeddings')
      .select('movie_id, poster_path')
      .in('movie_id', ids);
    if (data) {
      for (const d of data) posters[d.movie_id] = d.poster_path ?? '';
    }
  }

  return NextResponse.json({
    results: compromised.map(c => ({
      ...c,
      poster_path: posters[c.movie_id] ?? '',
    })),
    user_count: allIds.length,
  });
}
