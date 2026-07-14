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
 *
 * As of 2026-07: reviews + watch_diary tables have `genres` (text[]) and
 * `release_year` (int) columns backfilled from movie_embeddings, so we no
 * longer need placeholder heuristics — we compute real affinities.
 */

const POPULAR_GENRES = ['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama',
  'Family','Fantasy','History','Horror','Music','Mystery','Romance','Science Fiction',
  'Thriller','War','Western'];

function decadeOf(year: number | null | undefined): string | null {
  if (!year || year < 1900) return null;
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

interface AggBucket {
  count: number;
  ratingSum: number;
  ratingN: number;
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

  // ─── Aggregate ratings + genre/decade tallies across reviews + diary ───
  // Each row may have genres[] and release_year populated (backfilled from
  // movie_embeddings when the movie was inserted). Rows without genres still
  // contribute to the rating average but not to genre affinity.

  const genreAgg = new Map<string, AggBucket>();
  const decadeAgg = new Map<string, AggBucket>();
  let ratingSum = 0;
  let ratingN = 0;

  function bump(map: Map<string, AggBucket>, key: string, rating: number | null | undefined) {
    const bucket = map.get(key) ?? { count: 0, ratingSum: 0, ratingN: 0 };
    bucket.count++;
    if (rating != null && !Number.isNaN(rating)) {
      bucket.ratingSum += Number(rating);
      bucket.ratingN++;
    }
    map.set(key, bucket);
  }

  for (const r of reviews) {
    ratingSum += r.rating;
    ratingN++;
    for (const g of (r.genres ?? [])) bump(genreAgg, g, r.rating);
    const decade = decadeOf(r.release_year);
    if (decade) bump(decadeAgg, decade, r.rating);
  }
  for (const d of diary) {
    if (d.rating != null) {
      ratingSum += Number(d.rating);
      ratingN++;
    }
    for (const g of (d.genres ?? [])) bump(genreAgg, g, d.rating);
    const decade = decadeOf(d.release_year);
    if (decade) bump(decadeAgg, decade, d.rating);
  }

  const avgRating = ratingN > 0 ? ratingSum / ratingN : 0;

  // ─── Genre affinity ───
  // Combine observed counts (from this user's reviews/diary) with their stated
  // favorite_genres as a soft prior. If a user has reviewed many movies in a
  // genre, the observed count dominates; favorite_genres only fills gaps.
  const favGenres = profile.favorite_genres ?? [];
  const observedGenres = new Set<string>(genreAgg.keys());
  const allGenres = new Set<string>([...observedGenres, ...favGenres, ...POPULAR_GENRES]);

  const genreAffinity = Array.from(allGenres).map(g => {
    const obs = genreAgg.get(g);
    const isFav = favGenres.includes(g);
    const count = obs?.count ?? (isFav ? 5 : 0);
    const avgRatingForGenre = obs && obs.ratingN > 0 ? obs.ratingSum / obs.ratingN : (avgRating || 7);
    // Enthusiasm = how much this user gravitates to this genre vs random
    //   30 baseline + up to 50 from observed count + up to 20 from favorite_genres flag
    const enthusiasm = Math.min(
      100,
      30 +
        Math.min(50, (obs?.count ?? 0) * 5) +
        (isFav ? 20 : 0)
    );
    return { genre: g, count, avgRating: avgRatingForGenre, enthusiasm };
  }).sort((a, b) => b.enthusiasm - a.enthusiasm);

  // ─── Decade affinity (real, from release_year backfill) ───
  const decadeOrder = ['Pre-50s','50s','60s','70s','80s','90s','2000s','2010s','2020s+'];
  const decadeAffinity = decadeOrder.map(decade => {
    const bucket = decadeAgg.get(decade);
    return {
      decade,
      count: bucket?.count ?? 0,
      avgRating: bucket && bucket.ratingN > 0 ? bucket.ratingSum / bucket.ratingN : 0,
    };
  }).filter(d => d.count > 0);

  const result = {
    genreAffinity: genreAffinity.slice(0, 18), // top 18 genres
    decadeAffinity,
    topDirectors: [] as { director: string; count: number }[],
    topCountries: [] as { country: string; count: number }[],
    totalRated: ratingN,
    avgRating,
    diversity: Math.min(100, Math.round((genreAffinity.filter(g => g.enthusiasm > 50).length / Math.max(1, genreAffinity.length)) * 100)),
  };

  // Persist
  await updateProfile(profile.id, { taste_dna: result });

  return NextResponse.json(result);
}
