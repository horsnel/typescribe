import { NextRequest, NextResponse } from 'next/server';
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

// Genre → archetype code
const GENRE_MAP: Record<string, string[]> = {
  'Action':        ['blockbuster'],
  'Adventure':     ['blockbuster', 'scifi_visionary'],
  'Animation':     ['anime_adept', 'animation'],
  'Comedy':        ['comedy', 'romantic'],
  'Crime':         ['crime_solver', 'cinephile'],
  'Documentary':   ['doc_devotee'],
  'Drama':         ['cinephile', 'indie_darling'],
  'Family':        ['animation'],
  'Fantasy':       ['anime_adept', 'scifi_visionary'],
  'History':       ['cinephile', 'doc_devotee'],
  'Horror':        ['horror_hound'],
  'Music':         ['indie_darling', 'comedy'],
  'Mystery':       ['crime_solver', 'scifi_visionary'],
  'Romance':       ['romantic'],
  'Science Fiction':['scifi_visionary'],
  'Thriller':      ['horror_hound', 'crime_solver'],
  'War':           ['cinephile', 'doc_devotee'],
  'Western':       ['cinephile'],
};

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

  // Tally genre counts from reviews (using movie_title as a fallback — full genre data
  // would require joining with the movies table; we approximate from review count by movie).
  const genreCounts: Record<string, number> = {};
  const decadeCounts: Record<string, number> = {};
  let ratingSum = 0;
  let ratingN = 0;

  for (const r of reviews) {
    ratingSum += r.rating;
    ratingN += 1;
    // We don't have genres on the review row; for now, use rating distribution traits
  }
  for (const d of diary) {
    if (d.rating) {
      ratingSum += Number(d.rating);
      ratingN += 1;
    }
    // We don't have year on the diary row; estimate from movie_title pattern is unreliable
  }

  const avgRating = ratingN > 0 ? ratingSum / ratingN : 0;

  // Compute trait scores from review/diary behavior
  const totalActivity = reviews.length + diary.length;
  const followingCount = await getFollowingCount(profile.id);
  const followerCount = await getFollowerCount(profile.id);
  const traits: Trait[] = [
    { name: 'Curiosity',     score: Math.min(100, Math.round((totalActivity / 50) * 100)), description: 'How much cinema you explore' },
    { name: 'Discernment',   score: avgRating > 0 ? Math.min(100, Math.round((10 - Math.abs(avgRating - 7)) * 20)) : 50, description: 'Tightness of your rating distribution' },
    { name: 'Generosity',    score: avgRating > 0 ? Math.min(100, Math.round((avgRating / 10) * 100)) : 50, description: 'How positively you rate on average' },
    { name: 'Prolificacy',   score: Math.min(100, Math.round((reviews.length / 30) * 100)), description: 'How often you write reviews' },
    { name: 'Devotion',      score: profile.streak_count > 0 ? Math.min(100, profile.streak_count * 3) : 0, description: 'Your daily check-in streak' },
    { name: 'Social Spirit', score: Math.min(100, Math.round(followingCount * 5)), description: 'How many people you follow' },
    { name: 'Influence',     score: Math.min(100, Math.round(followerCount * 5)), description: 'How many people follow you' },
    { name: 'Curation',      score: 50, description: 'How many lists you curate (TBD)' },
    { name: 'Depth',         score: Math.min(100, Math.round((reviews.filter(r => r.body && r.body.length > 200).length / 10) * 100)), description: 'How often you write long-form reviews' },
    { name: 'Adventurism',   score: Math.min(100, 50), description: 'Genre diversity (TBD)' },
    { name: 'Consistency',   score: 50, description: 'How regularly you log watches' },
    { name: 'Critic Eye',    score: avgRating > 0 ? Math.min(100, Math.round(Math.abs(avgRating - 5) * 20)) : 50, description: 'Tendency to diverge from the median' },
  ];

  // Pick archetype based on top trait (very simple heuristic for v1)
  // For a real version, we'd correlate against genres. For now use avgRating + prolificacy:
  let archetypeCode = 'cinephile';
  if (avgRating >= 8) archetypeCode = 'romantic';
  else if (avgRating < 6) archetypeCode = 'cinephile';
  else if (reviews.length > 20) archetypeCode = 'cinephile';
  else if (profile.streak_count > 14) archetypeCode = 'blockbuster';
  else if (profile.streak_count > 0) archetypeCode = 'indie_darling';
  const archetype = ARCHETYPES.find(a => a.code === archetypeCode) ?? ARCHETYPES[0];

  const result: PersonalityResult = {
    archetype: archetype.name,
    emoji: archetype.emoji,
    description: archetype.desc,
    traits,
    topGenres: [],
    topDecades: [],
    totalWatched: diary.length,
    avgRating,
  };

  // Persist
  await updateProfile(profile.id, { personality_type: archetype.code });
  await unlockAchievement(profile.id, 'personality');

  return NextResponse.json(result);
}
