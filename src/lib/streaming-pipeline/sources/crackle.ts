/**
 * Crackle Free Streaming Source
 *
 * Curated catalog of free movies and shows available on Crackle.
 * Crackle is a free ad-supported streaming service. Since we can't
 * embed their player, entries use videoType: 'linkout' with real
 * Crackle URLs that open in a new tab.
 */

import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface CrackleEntry {
  slug: string;
  title: string;
  description: string;
  year: number;
  durationMinutes: number;
  genres: string[];
  rating: number;
  quality: StreamableMovie['quality'];
  poster: string;
  backdrop: string;
}

const CRACKLE_CATALOG: CrackleEntry[] = [
  {
    slug: 'the-grudge',
    title: 'The Grudge',
    description: 'An American nurse working in Tokyo is exposed to a mysterious curse that locks a person in a powerful rage before claiming their life and spreading to others. A terrifying remake of the Japanese horror classic.',
    year: 2004,
    durationMinutes: 91,
    genres: ['Horror', 'Thriller'],
    rating: 5.9,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/4/43/The_Grudge_%282004%29_film_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/4/43/The_Grudge_%282004%29_film_poster.png',
  },
  {
    slug: 'the-transporter',
    title: 'The Transporter',
    description: 'A former Special Forces operative works as a courier for hire, delivering packages without questions. When he breaks his own rules and opens a package, he finds himself in a deadly game. High-octane Jason Statham action.',
    year: 2002,
    durationMinutes: 92,
    genres: ['Action', 'Thriller', 'Crime'],
    rating: 6.7,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/4/49/The_Transporter_film.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/4/49/The_Transporter_film.jpg',
  },
  {
    slug: 'vacancy',
    title: 'Vacancy',
    description: 'A married couple whose relationship is on the rocks check into a remote motel and discover that the low-budget slasher movies they find in their room were filmed right there — and they\'re next. A tense, claustrophobic thriller.',
    year: 2007,
    durationMinutes: 85,
    genres: ['Horror', 'Thriller'],
    rating: 6.2,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/e/ea/Vacancyfilm.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/e/ea/Vacancyfilm.jpg',
  },
  {
    slug: 'hellraiser',
    title: 'Hellraiser',
    description: 'A man discovers a mysterious puzzle box that opens a portal to a nightmarish dimension ruled by the Cenobites — beings who can\'t distinguish between pleasure and pain. Clive Barker\'s visceral and disturbing horror classic.',
    year: 1987,
    durationMinutes: 94,
    genres: ['Horror', 'Fantasy'],
    rating: 7.0,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/6/6c/Hellraiser_%281987%29_film_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/6/6c/Hellraiser_%281987%29_film_poster.png',
  },
  {
    slug: 'snakes-on-a-plane',
    title: 'Snakes on a Plane',
    description: 'An FBI agent is escorting a witness on a flight when hundreds of venomous snakes are released mid-air to eliminate the witness. The internet-famous action thriller that delivers exactly what its title promises.',
    year: 2006,
    durationMinutes: 105,
    genres: ['Action', 'Thriller', 'Horror'],
    rating: 5.5,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/e/e2/Snakes_on_a_plane.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/e/e2/Snakes_on_a_plane.jpg',
  },
  {
    slug: 'starship-troopers',
    title: 'Starship Troopers',
    description: 'Young soldiers join the Mobile Infantry to fight an interstellar war against an alien species of giant insects. Paul Verhoeven\'s satirical sci-fi action film that doubles as a razor-sharp critique of militarism and fascism.',
    year: 1997,
    durationMinutes: 129,
    genres: ['Sci-Fi', 'Action', 'War'],
    rating: 7.3,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/e/e3/Starship_troopers_movie.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/e/e3/Starship_troopers_movie.jpg',
  },
  {
    slug: 'charlie-countryman',
    title: 'Charlie Countryman',
    description: 'A young American travels to Bucharest and falls for a mysterious woman whose violent ex-boyfriend is a dangerous gangster. A stylish, adrenaline-fueled romantic thriller set against the gritty backdrop of Romania.',
    year: 2013,
    durationMinutes: 103,
    genres: ['Drama', 'Action', 'Romance'],
    rating: 6.3,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/4/4b/Charlie_Countryman_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/4/4b/Charlie_Countryman_poster.jpg',
  },
  {
    slug: 'the-phantom',
    title: 'The Phantom',
    description: 'The legendary comic strip hero leaps from the pages to the screen in this action-adventure. The Phantom must stop a ruthless businessman from obtaining three magical skulls that would give him ultimate power.',
    year: 1996,
    durationMinutes: 100,
    genres: ['Action', 'Adventure', 'Comedy'],
    rating: 5.0,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/59/The_Phantom_movie.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/5/59/The_Phantom_movie.jpg',
  },
  {
    slug: 'a-nightmare-on-elm-street',
    title: 'A Nightmare on Elm Street',
    description: 'Teenagers in a suburban neighborhood are stalked in their dreams by the disfigured killer Freddy Krueger, who kills them in their sleep. Wes Craven\'s genre-defining horror masterpiece that spawned an entire franchise.',
    year: 1984,
    durationMinutes: 91,
    genres: ['Horror', 'Thriller'],
    rating: 7.5,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/3/3c/A_Nightmare_on_Elm_Street_%281984%29_film_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/3/3c/A_Nightmare_on_Elm_Street_%281984%29_film_poster.png',
  },
  {
    slug: 'robocop',
    title: 'RoboCop',
    description: 'In a dystopian Detroit, a brutally murdered police officer is resurrected as a cyborg law enforcement officer. As he cleans up the crime-ridden city, fragments of his former life begin to surface. Paul Verhoeven\'s sci-fi satire classic.',
    year: 1987,
    durationMinutes: 102,
    genres: ['Sci-Fi', 'Action', 'Thriller'],
    rating: 7.5,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/a/a6/Robocop_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/a/a6/Robocop_poster.jpg',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'Unknown';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function toStreamableMovie(entry: CrackleEntry): StreamableMovie {
  const watchUrl = `https://www.crackle.com/watch/${entry.slug}`;

  return {
    id: `crackle-${entry.slug}`,
    title: entry.title,
    description: entry.description,
    year: entry.year,
    duration: formatDuration(entry.durationMinutes),
    durationSeconds: entry.durationMinutes * 60,
    genres: entry.genres,
    rating: entry.rating,
    quality: entry.quality,
    poster: entry.poster,
    backdrop: entry.backdrop,
    source: 'crackle',
    sourceUrl: watchUrl,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: watchUrl,
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the curated catalog of Crackle movies.
 */
export async function fetchCrackleMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-crackle-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const movies = CRACKLE_CATALOG.map(toStreamableMovie);
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:Crackle] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the Crackle catalog for movies matching a query.
 */
export async function searchCrackleMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-crackle-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = CRACKLE_CATALOG
      .filter(entry => {
        const haystack = `${entry.title} ${entry.description} ${entry.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:Crackle] Search error:', err);
    return [];
  }
}
