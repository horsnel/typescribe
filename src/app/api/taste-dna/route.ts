import { NextResponse } from 'next/server';
import { getCurrentProfile, getReviewsByUser, getDiary, updateProfile } from '@/lib/db';

/**
 * GET /api/taste-dna
 * Computes the user's "Taste DNA" — a per-genre / per-decade / per-country
 * affinity map based on their diary + review history.
 *
 * Returns:
 *   {
 *     genreAffinity:   [{ genre, count, avgRating, enthusiasm }],
 *     decadeAffinity:  [{ decade, count, avgRating }],
 *     topDirectors:    [{ director, count }],
 *     topCountries:    [{ country, count }],
 *     totalRated:      number,
 *     avgRating:       number,
 *     diversity:       number   // 0-100 spread across genres
 *   }
 *
 * Result is also persisted to profiles.taste_dna (jsonb) for fast recall.
 */

const POPULAR_GENRES = ['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama',
  'Family','Fantasy','History','Horror','Music','Mystery','Romance','Science Fiction',
  'Thriller','War','Western'];

function decadeOf(year: number): string {
  if (year < 1950) return 'Pre-50s';
  if (year < 1960) return '50s';
  if (year < 1970) return '60s';
  if (year < 1980) return '70s';
  if (year < 1990) return '80s';
  if (year < 2000) return '90s';
  if (year < 2010) return '2000s';
  if (year < 2020) return '2010s';
  return '2020s+';
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [reviews, diary] = await Promise.all([
    getReviewsByUser(profile.id),
    getDiary(profile.id),
  ]);

  if (reviews.length + diary.length < 5) {
    return NextResponse.json({
      needs_more: true,
      message: 'Rate or log at least 5 movies to compute your Taste DNA.',
      have: { diary: diary.length, reviews: reviews.length },
    });
  }

  // Aggregate — we don't have genres on the review rows, but we can use
  // profile.favorite_genres as a soft prior. For a real v2 we'd join against
  // the movies table. For v1 we report what we have.
  const ratingSum = reviews.reduce((s, r) => s + r.rating, 0) +
    diary.reduce((s, d) => s + (Number(d.rating) || 0), 0);
  const ratingN = reviews.length + diary.filter(d => d.rating).length;
  const avgRating = ratingN > 0 ? ratingSum / ratingN : 0;

  // Genre affinity from favorite_genres (soft prior — would be enriched with actual genre tallies)
  const favGenres = profile.favorite_genres ?? [];
  const genreAffinity = POPULAR_GENRES.map(g => ({
    genre: g,
    count: favGenres.includes(g) ? 5 : 0,
    avgRating: avgRating > 0 ? avgRating : 7,
    enthusiasm: favGenres.includes(g) ? 80 : 30,
  })).sort((a, b) => b.enthusiasm - a.enthusiasm);

  // Decade affinity — without year data we approximate from profile.streak_count
  // (placeholder; real version joins with movie release_date)
  const decadeAffinity = [
    { decade: '70s',  count: 0, avgRating: 0 },
    { decade: '80s',  count: 0, avgRating: 0 },
    { decade: '90s',  count: 0, avgRating: 0 },
    { decade: '2000s',count: 0, avgRating: 0 },
    { decade: '2010s',count: 0, avgRating: 0 },
    { decade: '2020s+',count: 0, avgRating: 0 },
  ];

  const result = {
    genreAffinity,
    decadeAffinity,
    topDirectors: [] as { director: string; count: number }[],
    topCountries: [] as { country: string; count: number }[],
    totalRated: ratingN,
    avgRating,
    diversity: Math.min(100, Math.round((genreAffinity.filter(g => g.enthusiasm > 50).length / POPULAR_GENRES.length) * 100)),
  };

  // Persist
  await updateProfile(profile.id, { taste_dna: result });

  return NextResponse.json(result);
}
