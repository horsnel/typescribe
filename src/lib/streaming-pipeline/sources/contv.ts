/**
 * CONtv Free Streaming Source
 *
 * Curated catalog of free movies and shows available on CONtv.
 * CONtv is a free streaming service for comic, sci-fi, and horror fans.
 * Since we can't embed their player, entries use videoType: 'linkout'
 * with real CONtv URLs that open in a new tab.
 */

import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface CONtvEntry {
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

const CONTV_CATALOG: CONtvEntry[] = [
  {
    slug: 'plan-9-from-outer-space',
    title: 'Plan 9 from Outer Space',
    description: 'Aliens resurrect dead humans as zombies and vampires to stop humanity from creating the Solaranite bomb. Ed Wood\'s infamous "worst movie ever made" has become a beloved cult classic for its charming ineptitude and earnest ambition.',
    year: 1957,
    durationMinutes: 79,
    genres: ['Sci-Fi', 'Horror', 'Comedy'],
    rating: 4.0,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Plan_nine_from_outer_space.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Plan_nine_from_outer_space.jpg',
  },
  {
    slug: 'the-little-shop-of-horrors',
    title: 'The Little Shop of Horrors',
    description: 'A clumsy florist discovers that his unusual plant feeds on human blood. As the plant grows larger and more demanding, he must find increasingly desperate ways to satisfy its appetite. Roger Corman\'s darkly comic B-movie classic.',
    year: 1960,
    durationMinutes: 72,
    genres: ['Comedy', 'Horror', 'Sci-Fi'],
    rating: 6.6,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Little_Shop_of_Horrors_movieposter.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Little_Shop_of_Horrors_movieposter.jpg',
  },
  {
    slug: 'the-brain-that-wouldnt-die',
    title: 'The Brain That Wouldn\'t Die',
    description: 'A surgeon keeps his fiancée\'s severed head alive while he searches for a new body to attach it to. A delightfully macabre sci-fi horror film that exemplifies the wild creativity of 1960s B-movies.',
    year: 1962,
    durationMinutes: 82,
    genres: ['Sci-Fi', 'Horror'],
    rating: 4.8,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/5c/The_Brain_That_Wouldn%27t_Die.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/5/5c/The_Brain_That_Wouldn%27t_Die.jpg',
  },
  {
    slug: 'carnival-of-souls',
    title: 'Carnival of Souls',
    description: 'After a traumatic accident, a woman is drawn to a mysterious abandoned carnival. Her eerie experiences blur the line between reality and the supernatural in this atmospheric indie horror gem that influenced generations of filmmakers.',
    year: 1962,
    durationMinutes: 78,
    genres: ['Horror', 'Drama', 'Mystery'],
    rating: 7.1,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/2/29/Carnival_of_Souls_movieposter.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/2/29/Carnival_of_Souls_movieposter.jpg',
  },
  {
    slug: 'the-last-man-on-earth',
    title: 'The Last Man on Earth',
    description: 'Dr. Robert Morgan is the sole survivor of a plague that has turned everyone else into vampire-like creatures. By day he hunts them; by night he barricades himself in his home. The first adaptation of Richard Matheson\'s "I Am Legend."',
    year: 1964,
    durationMinutes: 86,
    genres: ['Sci-Fi', 'Horror', 'Drama'],
    rating: 6.9,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/8/85/TheLastManOnEarth.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/8/85/TheLastManOnEarth.jpg',
  },
  {
    slug: 'the-house-on-haunted-hill',
    title: 'The House on Haunted Hill',
    description: 'An eccentric millionaire offers five strangers $10,000 each to spend the night in a haunted house. As the night progresses, the guests discover the house holds terrifying secrets. Vincent Price shines in this William Castle classic.',
    year: 1959,
    durationMinutes: 75,
    genres: ['Horror', 'Mystery', 'Thriller'],
    rating: 6.9,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/House_on_Haunted_Hill_%281959%29_film_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/House_on_Haunted_Hill_%281959%29_film_poster.jpg',
  },
  {
    slug: 'white-zombie',
    title: 'White Zombie',
    description: 'A young couple in Haiti is ensnared by a sinister voodoo master who turns the bride into a zombie slave. Bela Lugosi delivers a mesmerizing performance in this 1932 classic — the first feature-length zombie film ever made.',
    year: 1932,
    durationMinutes: 69,
    genres: ['Horror', 'Fantasy'],
    rating: 6.2,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/White_zombie_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/White_zombie_poster.jpg',
  },
  {
    slug: 'the-phantom-of-the-opera',
    title: 'The Phantom of the Opera (1925)',
    description: 'A deformed composer living beneath the Paris Opera House falls in love with a beautiful singer and will stop at nothing to make her a star. Lon Chaney\'s iconic performance and the stunning Technicolor masquerade sequence make this a silent film masterpiece.',
    year: 1925,
    durationMinutes: 93,
    genres: ['Horror', 'Drama', 'Romance'],
    rating: 7.6,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Phantom_of_the_Opera_%281925%29_film_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Phantom_of_the_Opera_%281925%29_film_poster.jpg',
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

function toStreamableMovie(entry: CONtvEntry): StreamableMovie {
  const watchUrl = `https://www.contv.com/watch/${entry.slug}`;

  return {
    id: `contv-${entry.slug}`,
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
    source: 'contv',
    sourceUrl: watchUrl,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: watchUrl,
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
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
 * Fetch the curated catalog of CONtv movies.
 */
export async function fetchCONtvMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-contv-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const movies = CONTV_CATALOG.map(toStreamableMovie);
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:CONtv] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the CONtv catalog for movies matching a query.
 */
export async function searchCONtvMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-contv-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = CONTV_CATALOG
      .filter(entry => {
        const haystack = `${entry.title} ${entry.description} ${entry.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:CONtv] Search error:', err);
    return [];
  }
}
