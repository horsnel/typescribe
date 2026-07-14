import { NextResponse } from 'next/server';
import { getCurrentProfile, getDiary, getReviewsByUser, getFollowingCount, getFollowerCount } from '@/lib/db';

/**
 * GET /api/wrapped?year=YYYY
 * Generates the user's "Year in Review" — Spotify-Wrapped style annual summary.
 */

export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get('year') ?? String(new Date().getFullYear()), 10);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [diary, reviews] = await Promise.all([
    getDiary(profile.id, 500),
    getReviewsByUser(profile.id, 500),
  ]);

  const yearDiary = diary.filter(d => d.watched_on >= yearStart && d.watched_on <= yearEnd);
  const yearReviews = reviews.filter(r => r.created_at >= yearStart && r.created_at <= yearEnd);

  if (yearDiary.length === 0 && yearReviews.length === 0) {
    return NextResponse.json({
      needs_more: true,
      message: `No activity in ${year}. Watch and log some movies!`,
    });
  }

  // Stats
  const totalWatched = yearDiary.length;
  const totalReviews = yearReviews.length;
  const ratings = yearReviews.map(r => Number(r.rating)).concat(yearDiary.filter(d => d.rating).map(d => Number(d.rating)));
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const totalRuntimeMin = yearDiary.length * 110; // ~1h50 avg, estimate

  // Top 5 movies of the year (highest rated)
  const topMovies = [...yearReviews]
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, 5)
    .map(r => ({ id: r.movie_id, title: r.movie_title, rating: Number(r.rating) }));

  // Monthly breakdown
  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 }));
  for (const d of yearDiary) {
    const m = new Date(d.watched_on).getMonth() + 1;
    monthly[m - 1].count++;
  }
  const peakMonth = monthly.reduce((best, m) => m.count > best.count ? m : best, monthly[0]);

  // Following/followers
  const [following, followers] = await Promise.all([getFollowingCount(profile.id), getFollowerCount(profile.id)]);

  // Streak stats
  const longestStreak = profile.longest_streak;
  const currentStreak = profile.streak_count;

  return NextResponse.json({
    year,
    displayName: profile.display_name,
    avatar: profile.avatar,
    personalityType: profile.personality_type,
    totalWatched,
    totalReviews,
    avgRating: avgRating.toFixed(1),
    totalRuntimeHours: Math.round(totalRuntimeMin / 60),
    topMovies,
    monthly,
    peakMonth: peakMonth.month,
    peakMonthCount: peakMonth.count,
    longestStreak,
    currentStreak,
    following,
    followers,
    xp: profile.xp,
  });
}
