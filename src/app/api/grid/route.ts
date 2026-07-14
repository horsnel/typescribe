import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, getDailyGrid, upsertDailyGrid, recordGameResult, unlockAchievement } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/grid?date=YYYY-MM-DD
 * Returns today's grid (auto-creates one if missing).
 *
 * POST /api/grid
 * Body: { date, answers: { "0": movieId, "1": movieId, ... } }
 * Scores the answer and records result.
 */

// Curated pool of well-known movies per decade + genre — kept simple for now
const POOL = [
  { id: 278,    title: 'The Shawshank Redemption', poster: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', year: 1994, genres: ['Drama'] },
  { id: 238,    title: 'The Godfather',             poster: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', year: 1972, genres: ['Crime','Drama'] },
  { id: 240,    title: 'The Godfather Part II',     poster: '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg', year: 1974, genres: ['Crime','Drama'] },
  { id: 424,    title: "Schindler's List",          poster: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', year: 1993, genres: ['Drama','History'] },
  { id: 389,    title: '12 Angry Men',              poster: '/ow3wq89wM8qd5X7W5d0XQa6qo6r.jpg', year: 1957, genres: ['Drama'] },
  { id: 129,    title: 'Spirited Away',             poster: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', year: 2001, genres: ['Animation','Fantasy'] },
  { id: 497,    title: 'The Green Mile',            poster: '/velWPhVMQeQKcxggNuVeNm7v8Z3.jpg', year: 1999, genres: ['Drama','Fantasy'] },
  { id: 680,    title: 'Pulp Fiction',              poster: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', year: 1994, genres: ['Crime','Thriller'] },
  { id: 155,    title: 'The Dark Knight',           poster: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', year: 2008, genres: ['Action','Crime','Drama'] },
  { id: 496243, title: 'Parasite',                  poster: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', year: 2019, genres: ['Comedy','Thriller'] },
  { id: 13,     title: 'Forrest Gump',              poster: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', year: 1994, genres: ['Comedy','Drama'] },
  { id: 27205,  title: 'Inception',                 poster: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', year: 2010, genres: ['Action','Sci-Fi'] },
  { id: 157336, title: 'Interstellar',              poster: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', year: 2014, genres: ['Adventure','Drama','Sci-Fi'] },
  { id: 603,    title: 'The Matrix',                poster: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', year: 1999, genres: ['Action','Sci-Fi'] },
  { id: 510,    title: 'One Flew Over the Cuckoo\'s Nest', poster: '/3jcbDmRFiQ83drXNOvRDeKHxS0C.jpg', year: 1975, genres: ['Drama'] },
  { id: 11,     title: 'Star Wars',                 poster: '/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', year: 1977, genres: ['Adventure','Sci-Fi'] },
  { id: 769,    title: 'GoodFellas',                poster: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', year: 1990, genres: ['Crime','Drama'] },
  { id: 539,    title: 'Psycho',                    poster: '/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg', year: 1960, genres: ['Horror','Thriller'] },
];

const DECADES = ['Pre-80s', '80s', '90s', '2000s', '2010s+'];
const GENRES = ['Drama', 'Crime', 'Action', 'Sci-Fi', 'Comedy', 'Horror', 'Animation', 'Thriller'];

function decadeOf(year: number): string {
  if (year < 1980) return 'Pre-80s';
  if (year < 1990) return '80s';
  if (year < 2000) return '90s';
  if (year < 2010) return '2000s';
  return '2010s+';
}

function makeGridForDate(date: string) {
  // Deterministic seed based on date
  const seed = date.split('-').map(Number).reduce((a, b) => a + b * 31, 0);
  const rand = (i: number) => {
    const x = Math.sin(seed * (i + 1) * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };
  // Pick 3 distinct decades
  const shuffledDecades = [...DECADES].sort((a, b) => rand(DECADES.indexOf(a)) - rand(DECADES.indexOf(b)));
  const pickedDecades = shuffledDecades.slice(0, 3);
  // Pick 3 distinct genres
  const shuffledGenres = [...GENRES].sort((a, b) => rand(GENRES.indexOf(a) + 7) - rand(GENRES.indexOf(b) + 7));
  const pickedGenres = shuffledGenres.slice(0, 3);

  // For each (decade, genre) pair, find a movie in the pool that fits both
  const solution_ids: number[] = [];
  const solution_titles: string[] = [];
  const solution_posters: string[] = [];
  for (const g of pickedGenres) {
    for (const d of pickedDecades) {
      const matches = POOL.filter(m =>
        m.genres.includes(g) && decadeOf(m.year) === d
      );
      const pick = matches.length > 0
        ? matches[Math.floor(rand(g.length + d.length) * matches.length) % matches.length]
        : POOL[Math.floor(rand(g.length + d.length) * POOL.length) % POOL.length];
      solution_ids.push(pick.id);
      solution_titles.push(pick.title);
      solution_posters.push(`https://image.tmdb.org/t/p/w300${pick.poster}`);
    }
  }

  return {
    grid_date: date,
    criteria: { decades: pickedDecades, genres: pickedGenres },
    solution_ids,
    solution_titles,
    solution_posters,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  let grid = await getDailyGrid(date);
  if (!grid) {
    const g = makeGridForDate(date);
    grid = await upsertDailyGrid(g);
  }

  // Don't leak solution_ids — return only the criteria + count
  return NextResponse.json({
    date: grid!.grid_date,
    criteria: grid!.criteria,
    cell_count: grid!.solution_ids.length,
  });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { date, guesses } = await req.json();
  const grid = await getDailyGrid(date);
  if (!grid) return NextResponse.json({ error: 'Grid not found' }, { status: 404 });

  // Score: count correct cells. A guess is correct if the movieId matches the solution for that cell
  // AND the movie satisfies both the decade and genre criteria.
  // We accept partial credit: a movie that matches the decade but not the genre (or vice versa) is half-credit.
  let correct = 0;
  const details: Record<number, { guess: number; correct: boolean; partial: boolean }> = {};
  for (let i = 0; i < grid.solution_ids.length; i++) {
    const guess = guesses[String(i)];
    if (guess === undefined || guess === null) {
      details[i] = { guess: 0, correct: false, partial: false };
      continue;
    }
    const isCorrect = guess === grid.solution_ids[i];
    if (isCorrect) {
      correct += 1;
      details[i] = { guess, correct: true, partial: false };
    } else {
      // Check partial credit (we'd need movie metadata; for simplicity, only full correct counts)
      details[i] = { guess, correct: false, partial: false };
    }
  }

  const score = correct * 100 + (correct === 9 ? 200 : 0); // 9/9 bonus
  await recordGameResult(profile.id, 'grid', score, { date, correct, total: 9, details });

  if (correct >= 1) await unlockAchievement(profile.id, 'grid_first');
  if (correct === 9) await unlockAchievement(profile.id, 'grid_perfect');

  return NextResponse.json({
    score,
    correct,
    total: 9,
    details,
    solutions: {
      ids: grid.solution_ids,
      titles: grid.solution_titles,
      posters: grid.solution_posters,
    },
  });
}
