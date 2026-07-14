import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/film-festival
 * F40 — Monthly Free Film Festival. Returns the curated monthly selection
 * of free-streaming films (one per day, 28-31 films). Auto-creates a new
 * festival on the 1st of each month if missing.
 */

interface FestivalFilm {
  id: number;
  title: string;
  poster: string;
  overview: string;
  genres: string[];
  year: number;
  duration: string;
}

// Curated pool of public-domain / CC films for the festival
const POOL: FestivalFilm[] = [
  { id: 1, title: 'Big Buck Bunny', poster: '', overview: 'A giant rabbit with a heart bigger than himself takes on three bullies.', genres: ['Animation','Comedy'], year: 2008, duration: '10m' },
  { id: 2, title: 'Sintel', poster: '', overview: 'A lonely young woman searches for the dragon she once raised.', genres: ['Animation','Fantasy'], year: 2010, duration: '15m' },
  { id: 3, title: 'Tears of Steel', poster: '', overview: 'In an apocalyptic future, a group of warriors and scientists gather to defeat the robots.', genres: ['Sci-Fi','Action'], year: 2012, duration: '12m' },
  { id: 4, title: 'Elephants Dream', poster: '', overview: 'Two characters explore a strange mechanical world.', genres: ['Animation','Sci-Fi'], year: 2006, duration: '11m' },
  { id: 5, title: 'Spring', poster: '', overview: 'A young shepherd and his dog face mysterious spirits in the mountains.', genres: ['Animation','Fantasy'], year: 2019, duration: '7m' },
  { id: 6, title: 'Night of the Living Dead', poster: '', overview: 'A group of people hide in a farmhouse from reanimated corpses.', genres: ['Horror'], year: 1968, duration: '1h 36m' },
  { id: 7, title: 'Nosferatu', poster: '', overview: 'A real-estate agent travels to Transylvania to meet a mysterious count.', genres: ['Horror'], year: 1922, duration: '1h 34m' },
  { id: 8, title: 'Metropolis', poster: '', overview: 'In a futuristic city, the son of a powerful man falls for a worker woman.', genres: ['Sci-Fi','Drama'], year: 1927, duration: '2h 33m' },
  { id: 9, title: 'The Cabinet of Dr. Caligari', poster: '', overview: 'A sinister hypnotist and his sleepwalker terrorize a German town.', genres: ['Horror'], year: 1920, duration: '1h 11m' },
  { id: 10, title: 'The General', poster: '', overview: 'A Confederate engineer pursues his stolen locomotive during the Civil War.', genres: ['Action','Comedy'], year: 1926, duration: '1h 18m' },
  { id: 11, title: 'Charade', poster: '', overview: 'A widow is pursued by men who want her late husband\'s fortune.', genres: ['Mystery','Romance'], year: 1963, duration: '1h 53m' },
  { id: 12, title: 'His Girl Friday', poster: '', overview: 'A newspaper editor tries to win back his ex-wife with one last story.', genres: ['Comedy','Romance'], year: 1940, duration: '1h 32m' },
];

function currentFestivalKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET() {
  const key = currentFestivalKey();
  const start = new Date();
  start.setDate(1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

  // Try fetching from DB
  const { data: existing } = await supabaseAdmin
    .from('monthly_festivals')
    .select('*')
    .eq('festival_key', key)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ festival: existing });
  }

  // Build a new festival — pick ~28 films deterministically
  const seed = key.split('-').map(Number).reduce((a, b) => a + b * 31, 0);
  const pickIdx = (i: number) => (Math.abs(Math.sin(seed * (i + 1) * 9301 + 49297)) * POOL.length) | 0;
  const picked: FestivalFilm[] = [];
  for (let i = 0; i < 28; i++) {
    picked.push(POOL[pickIdx(i) % POOL.length]);
  }

  const { data: created, error } = await supabaseAdmin
    .from('monthly_festivals')
    .insert({
      festival_key: key,
      title: `Free Film Festival — ${start.toLocaleDateString('en', { month: 'long', year: 'numeric' })}`,
      description: '28 hand-picked free, legal films — one per day this month.',
      movie_ids: picked.map(p => p.id),
      movie_titles: picked.map(p => p.title),
      movie_posters: picked.map(p => p.poster),
      starts_on: start.toISOString().slice(0, 10),
      ends_on: end.toISOString().slice(0, 10),
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ festival: created });
}
