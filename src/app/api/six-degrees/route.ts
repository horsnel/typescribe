import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, recordGameResult, unlockAchievement } from '@/lib/db';

/**
 * GET /api/six-degrees
 * Returns a fresh puzzle: { start_actor, end_actor, hint }.
 *
 * POST /api/six-degrees
 *   body: { start_actor, end_actor, chain: [{actor, movie}] }
 * Scores the chain (1 point per link, lower is better).
 */

const ACTORS = [
  'Kevin Bacon', 'Meryl Streep', 'Leonardo DiCaprio', 'Tom Hanks', 'Scarlett Johansson',
  'Robert De Niro', 'Denzel Washington', 'Cate Blanchett', 'Christian Bale', 'Natalie Portman',
  'Brad Pitt', 'Jennifer Lawrence', 'Samuel L. Jackson', 'Charlize Theron', 'Idris Elba',
  'Viola Davis', 'Mahershala Ali', 'Tilda Swinton', 'Michael Fassbender', 'Gary Oldman',
];

export async function GET() {
  // Pick two random actors — make sure they differ
  const a = ACTORS[Math.floor(Math.random() * ACTORS.length)];
  let b = a;
  while (b === a) b = ACTORS[Math.floor(Math.random() * ACTORS.length)];

  return NextResponse.json({
    start_actor: a,
    end_actor: b,
    hint: 'Use movies as bridges — name an actor in a movie with the previous one, repeat until you reach the target.',
    max_links: 6,
  });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { chain } = await req.json();
  if (!Array.isArray(chain)) return NextResponse.json({ error: 'chain required' }, { status: 400 });

  // Each entry in chain is { actor, movie }. The number of links is chain.length - 1 (the number of movie-bridges).
  // For now, score simply: fewer links = higher score.
  const links = Math.max(0, chain.length - 1);
  const score = Math.max(0, 600 - links * 100); // 6 links = 0, 1 link = 500

  await recordGameResult(profile.id, 'six_degrees', score, { chain, links });

  if (links <= 3) await unlockAchievement(profile.id, 'personality'); // reuse an existing achievement for now

  return NextResponse.json({ score, links, max_links: 6 });
}
