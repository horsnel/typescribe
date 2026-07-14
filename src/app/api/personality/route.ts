import { NextResponse } from 'next/server';
import { getCurrentProfile, getReviewsByUser, getDiary, updateProfile, unlockAchievement, getFollowingCount, getFollowerCount } from '@/lib/db';

/**
 * GET /api/personality
 * Computes the user's Movie Personality archetype + 12 trait scores
 * based on their review + diary history.
 *
 * 12 archetypes, each mapped from genre affinity, decade preference,
 * rating behavior, and diary cadence:
 *
 *  1. The Cinephile         — diverse, classic-leaning, highbrow
 *  2. The Blockbuster Fan   — popular, action/adventure, recent
 *  3. The Anime Adept       — animation, fantasy, late-night
 *  4. The Horror Hound      — horror, thriller, late 20th c.
 *  5. The Indie Darling     — low-budget, drama, recent
 *  6. The Romantic          — romance, comedy, 90s-2000s
 *  7. The Sci-Fi Visionary  — sci-fi, mystery, 2000s+
 *  8. The Documentary Devotee — non-fiction, slow burn
 *  9. The Animation Aficionado — animation, family
 *  10. The Crime Solver     — crime, mystery, neo-noir
 *  11. The Comedy Connoisseur — comedy, light, frequent rewatch
 *  12. The World Cinema Traveler — international, subtitled, diverse
 *
 * As of 2026-07: reviews + watch_diary have `genres` + `release_year`
 * columns backfilled from movie_embeddings, so we now compute archetype
 * from real observed genre tallies instead of placeholder heuristics.
 */

interface Trait { name: string; score: number; description: string }

interface PersonalityResult {
  archetype: string;
  emoji: string;
  description: string;
  traits: Trait[];
  topGenres: { genre: string; count: number; avgRating: number }[];
  topDecades: { decade: string; count: number }[];
  totalWatched: number;
  avgRating: number;
}

const ARCHETYPES = [
  { code: 'cinephile',       name: 'The Cinephile',           emoji: '🎬', desc: 'You treat film as art — wide-ranging, classic-leaning, generous but discerning.' },
  { code: 'blockbuster',     name: 'The Blockbuster Fan',     emoji: '💥', desc: 'You love the spectacle — big budgets, big action, big emotions.' },
  { code: 'anime_adept',     name: 'The Anime Adept',         emoji: '🌸', desc: 'You know your MAPPA from your Ufotable, your shonen from your shoujo.' },
  { code: 'horror_hound',    name: 'The Horror Hound',        emoji: '👻', desc: 'The darker the better — you live for the slow-burn dread.' },
  { code: 'indie_darling',   name: 'The Indie Darling',       emoji: '🎭', desc: 'Small films, big feelings. You find the human in the intimate.' },
  { code: 'romantic',        name: 'The Romantic',            emoji: '💕', desc: 'You believe in love — on screen and off.' },
  { code: 'scifi_visionary', name: 'The Sci-Fi Visionary',    emoji: '🚀', desc: 'Future-curious. You want ideas as big as the cosmos.' },
  { code: 'doc_devotee',     name: 'The Documentary Devotee', emoji: '📽️', desc: 'Truth is stranger than fiction, and you prefer it that way.' },
  { code: 'animation',       name: 'The Animation Aficionado',emoji: '🎨', desc: 'You know animation is a medium, not a genre.' },
  { code: 'crime_solver',    name: 'The Crime Solver',        emoji: '🔍', desc: 'Noir, mystery, and the moral grey — your trifecta.' },
  { code: 'comedy',          name: 'The Comedy Connoisseur',  emoji: '😂', desc: 'You take your comedy seriously.' },
  { code: 'world_cinema',    name: 'The World Cinema Traveler',emoji: '🌍', desc: 'Passports in subtitles — you travel via cinema.' },
];

// Genre → archetype code (weighted)
const GENRE_MAP: Record<string, { code: string; weight: number }[]> = {
  'Action':          [{ code: 'blockbuster', weight: 2 }],
  'Adventure':       [{ code: 'blockbuster', weight: 1 }, { code: 'scifi_visionary', weight: 1 }],
  'Animation':       [{ code: 'anime_adept', weight: 1 }, { code: 'animation', weight: 2 }],
  'Comedy':          [{ code: 'comedy', weight: 2 }, { code: 'romantic', weight: 1 }],
  'Crime':           [{ code: 'crime_solver', weight: 2 }, { code: 'cinephile', weight: 1 }],
  'Documentary':     [{ code: 'doc_devotee', weight: 3 }],
  'Drama':           [{ code: 'cinephile', weight: 1 }, { code: 'indie_darling', weight: 2 }],
  'Family':          [{ code: 'animation', weight: 1 }],
  'Fantasy':         [{ code: 'anime_adept', weight: 1 }, { code: 'scifi_visionary', weight: 1 }],
  'History':         [{ code: 'cinephile', weight: 1 }, { code: 'doc_devotee', weight: 1 }],
  'Horror':          [{ code: 'horror_hound', weight: 3 }],
  'Music':           [{ code: 'indie_darling', weight: 1 }, { code: 'comedy', weight: 1 }],
  'Mystery':         [{ code: 'crime_solver', weight: 2 }, { code: 'scifi_visionary', weight: 1 }],
  'Romance':         [{ code: 'romantic', weight: 3 }],
  'Science Fiction': [{ code: 'scifi_visionary', weight: 3 }],
  'Thriller':        [{ code: 'horror_hound', weight: 1 }, { code: 'crime_solver', weight: 1 }],
  'War':             [{ code: 'cinephile', weight: 1 }, { code: 'doc_devotee', weight: 1 }],
  'Western':         [{ code: 'cinephile', weight: 2 }],
};

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

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [reviews, diary] = await Promise.all([
    getReviewsByUser(profile.id),
    getDiary(profile.id),
  ]);

  if (diary.length < 5 && reviews.length < 3) {
    return NextResponse.json({
      needs_more: true,
      message: 'Rate or log at least 5 movies to discover your personality.',
      have: { diary: diary.length, reviews: reviews.length },
    });
  }

  // ─── Aggregate real genre + decade counts from the now-enriched rows ───
  interface GenreBucket { count: number; ratingSum: number; ratingN: number }
  const genreAgg = new Map<string, GenreBucket>();
  const decadeAgg = new Map<string, number>();
  let ratingSum = 0;
  let ratingN = 0;
  let genresObservedCount = 0;

  function bumpGenre(g: string, rating: number | null | undefined) {
    const bucket = genreAgg.get(g) ?? { count: 0, ratingSum: 0, ratingN: 0 };
    bucket.count++;
    if (rating != null && !Number.isNaN(rating)) {
      bucket.ratingSum += Number(rating);
      bucket.ratingN++;
    }
    genreAgg.set(g, bucket);
  }

  for (const r of reviews) {
    ratingSum += r.rating;
    ratingN++;
    for (const g of (r.genres ?? [])) { bumpGenre(g, r.rating); genresObservedCount++; }
    const decade = decadeOf(r.release_year);
    if (decade) decadeAgg.set(decade, (decadeAgg.get(decade) ?? 0) + 1);
  }
  for (const d of diary) {
    if (d.rating != null) {
      ratingSum += Number(d.rating);
      ratingN++;
    }
    for (const g of (d.genres ?? [])) { bumpGenre(g, d.rating); genresObservedCount++; }
    const decade = decadeOf(d.release_year);
    if (decade) decadeAgg.set(decade, (decadeAgg.get(decade) ?? 0) + 1);
  }

  const avgRating = ratingN > 0 ? ratingSum / ratingN : 0;

  // Compute top genres sorted by count
  const topGenres = Array.from(genreAgg.entries())
    .map(([genre, bucket]) => ({
      genre,
      count: bucket.count,
      avgRating: bucket.ratingN > 0 ? bucket.ratingSum / bucket.ratingN : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topDecades = Array.from(decadeAgg.entries())
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => b.count - a.count);

  // ─── Pick archetype based on observed genre weights ───
  // Each genre contributes weighted votes to one or more archetype codes.
  // If we have no observed genres, fall back to old heuristics.
  const archetypeVotes = new Map<string, number>();
  if (genresObservedCount > 0) {
    for (const [genre, bucket] of genreAgg.entries()) {
      const archetypes = GENRE_MAP[genre];
      if (!archetypes) continue;
      for (const { code, weight } of archetypes) {
        archetypeVotes.set(code, (archetypeVotes.get(code) ?? 0) + bucket.count * weight);
      }
    }
  }

  let archetypeCode: string;
  if (archetypeVotes.size > 0) {
    archetypeCode = Array.from(archetypeVotes.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  } else {
    // Fallback heuristics (used when user has rated movies but none had genre data)
    if (avgRating >= 8) archetypeCode = 'romantic';
    else if (reviews.length > 20) archetypeCode = 'cinephile';
    else if (profile.streak_count > 14) archetypeCode = 'blockbuster';
    else if (profile.streak_count > 0) archetypeCode = 'indie_darling';
    else archetypeCode = 'cinephile';
  }
  const archetype = ARCHETYPES.find(a => a.code === archetypeCode) ?? ARCHETYPES[0];

  // ─── Trait scores — combine behavior metrics with genre-based signals ───
  const totalActivity = reviews.length + diary.length;
  const followingCount = await getFollowingCount(profile.id);
  const followerCount = await getFollowerCount(profile.id);
  const distinctGenres = genreAgg.size;
  const decadeSpread = topDecades.length;

  // Adventurism = how many distinct genres this user has explored (capped at 18 = 100%)
  const adventurismScore = Math.min(100, Math.round((distinctGenres / 18) * 100));

  // Curation (placeholder — no list count yet in this iteration)
  const curationScore = 50;

  // Consistency — how many distinct decades? proxy for varied watching
  const consistencyScore = Math.min(100, 30 + decadeSpread * 12);

  const traits: Trait[] = [
    { name: 'Curiosity',     score: Math.min(100, Math.round((totalActivity / 50) * 100)), description: 'How much cinema you explore' },
    { name: 'Discernment',   score: avgRating > 0 ? Math.min(100, Math.round((10 - Math.abs(avgRating - 7)) * 20)) : 50, description: 'Tightness of your rating distribution' },
    { name: 'Generosity',    score: avgRating > 0 ? Math.min(100, Math.round((avgRating / 10) * 100)) : 50, description: 'How positively you rate on average' },
    { name: 'Prolificacy',   score: Math.min(100, Math.round((reviews.length / 30) * 100)), description: 'How often you write reviews' },
    { name: 'Devotion',      score: profile.streak_count > 0 ? Math.min(100, profile.streak_count * 3) : 0, description: 'Your daily check-in streak' },
    { name: 'Social Spirit', score: Math.min(100, Math.round(followingCount * 5)), description: 'How many people you follow' },
    { name: 'Influence',     score: Math.min(100, Math.round(followerCount * 5)), description: 'How many people follow you' },
    { name: 'Curation',      score: curationScore, description: 'How many lists you curate (TBD)' },
    { name: 'Depth',         score: Math.min(100, Math.round((reviews.filter(r => r.body && r.body.length > 200).length / 10) * 100)), description: 'How often you write long-form reviews' },
    { name: 'Adventurism',   score: adventurismScore, description: `Genre diversity (${distinctGenres} distinct genres)` },
    { name: 'Consistency',   score: consistencyScore, description: `Era diversity (${decadeSpread} decades)` },
    { name: 'Critic Eye',    score: avgRating > 0 ? Math.min(100, Math.round(Math.abs(avgRating - 5) * 20)) : 50, description: 'Tendency to diverge from the median' },
  ];

  const result: PersonalityResult = {
    archetype: archetype.name,
    emoji: archetype.emoji,
    description: archetype.desc,
    traits,
    topGenres,
    topDecades,
    totalWatched: diary.length,
    avgRating,
  };

  // Persist
  await updateProfile(profile.id, { personality_type: archetype.code });
  await unlockAchievement(profile.id, 'personality');

  return NextResponse.json(result);
}
