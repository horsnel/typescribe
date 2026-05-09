/**
 * RetroCrush Free Anime Streaming Source
 *
 * Curated catalog of classic anime available on RetroCrush.
 * RetroCrush is a free anime streaming service. Since we can't
 * embed their player, entries use videoType: 'linkout' with real
 * RetroCrush URLs that open in a new tab.
 */

import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface RetroCrushEntry {
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

const RETROCRUSH_CATALOG: RetroCrushEntry[] = [
  {
    slug: 'astro-boy-1963',
    title: 'Astro Boy (1963)',
    description: 'The anime that started it all. Dr. Tenma creates a powerful robot boy named Astro in the image of his deceased son, but soon rejects him. Astro must find his own path in a world that fears robots, fighting for justice and the coexistence of humans and machines.',
    year: 1963,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Anime'],
    rating: 7.4,
    quality: '480p',
    poster: 'https://archive.org/services/img/Astro-Boy-2003-English',
    backdrop: 'https://archive.org/services/img/Astro-Boy-2003-English',
  },
  {
    slug: 'kimba-the-white-lion',
    title: 'Kimba the White Lion',
    description: 'The classic 1965 anime by Osamu Tezuka follows the white lion cub Kimba as he grows up and learns to rule his jungle kingdom with wisdom and compassion, advocating for peace between predators and prey.',
    year: 1965,
    durationMinutes: 25,
    genres: ['Animation', 'Adventure', 'Drama', 'Anime'],
    rating: 7.2,
    quality: '480p',
    poster: 'https://archive.org/services/img/jungletaitei',
    backdrop: 'https://archive.org/services/img/jungletaitei',
  },
  {
    slug: 'speed-racer',
    title: 'Speed Racer (Mach GoGoGo)',
    description: 'Young Speed Racer drives the incredible Mach 5 in death-defying races around the world, while investigating the mysterious Racer X. A pioneering anime series that introduced generations of Western audiences to Japanese animation.',
    year: 1967,
    durationMinutes: 25,
    genres: ['Animation', 'Action', 'Sports', 'Anime'],
    rating: 7.0,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/4/4d/Speed_Racer_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/4/4d/Speed_Racer_poster.jpg',
  },
  {
    slug: 'gigantor',
    title: 'Gigantor',
    description: 'A boy named Jimmy Sparks controls a giant flying robot called Gigantor, using it to fight crime and protect the world from various threats. One of the earliest anime series to be broadcast in the United States.',
    year: 1963,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Anime'],
    rating: 6.5,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/53/Gigantor.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/5/53/Gigantor.jpg',
  },
  {
    slug: 'marine-boy',
    title: 'Marine Boy',
    description: 'A young boy who works as an underwater agent for the Ocean Patrol, using his special oxy-gum to breathe underwater and fighting villains with the help of his dolphin friend Splasher. A classic 1960s anime adventure.',
    year: 1966,
    durationMinutes: 25,
    genres: ['Animation', 'Action', 'Adventure', 'Anime'],
    rating: 6.3,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/6/6c/Marine_Boy.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/6/6c/Marine_Boy.jpg',
  },
  {
    slug: 'prince-planet',
    title: 'Prince Planet',
    description: 'A young alien prince from the planet Radion comes to Earth to study human behavior and protect the planet from evil forces using his special pendant that converts energy into any form he needs. A beloved 1960s anime series.',
    year: 1965,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Anime'],
    rating: 6.2,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Prince_Planet.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Prince_Planet.jpg',
  },
  {
    slug: 'star-blazers',
    title: 'Star Blazers (Space Battleship Yamato)',
    description: 'In the year 2199, Earth is under attack from an alien race. The crew of the space battleship Yamato embarks on a desperate mission to retrieve a device that can save humanity. A landmark anime series that redefined space opera.',
    year: 1974,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Anime'],
    rating: 8.1,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/e/e8/Starblazers.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/e/e8/Starblazers.jpg',
  },
  {
    slug: 'voltron-defender-of-the-universe',
    title: 'Voltron: Defender of the Universe',
    description: 'Five space explorers pilot robotic lions that combine to form the mighty Voltron, defending the galaxy from the evil King Zarkon and his forces. One of the most iconic mecha anime series in Western pop culture.',
    year: 1984,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Anime'],
    rating: 7.6,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/a/a1/Voltron_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/a/a1/Voltron_poster.jpg',
  },
  {
    slug: 'robotech',
    title: 'Robotech',
    description: 'Humanity discovers alien technology and must use it to defend Earth against multiple waves of alien invasion. A groundbreaking anime adaptation that wove three separate Japanese series into one epic narrative for Western audiences.',
    year: 1985,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Romance', 'Anime'],
    rating: 7.9,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/1/10/Robotech.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/1/10/Robotech.jpg',
  },
  {
    slug: 'universe-soldier-dangaioh',
    title: 'Dangaioh',
    description: 'Four psychic teenagers are brought together to pilot the giant robot Dangaioh against the tyrannical Captain Galimos and his intergalactic empire. A classic 1980s mecha OVA with stunning animation and explosive action.',
    year: 1987,
    durationMinutes: 50,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Anime'],
    rating: 6.4,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/0/0e/Dangaioh.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/0/0e/Dangaioh.jpg',
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

function toStreamableMovie(entry: RetroCrushEntry): StreamableMovie {
  const watchUrl = `https://www.retrocrush.tv/watch/${entry.slug}`;

  return {
    id: `retrocrush-${entry.slug}`,
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
    source: 'retrocrush',
    sourceUrl: watchUrl,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: watchUrl,
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Mono' },
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
 * Fetch the curated catalog of RetroCrush anime.
 */
export async function fetchRetroCrushMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-retrocrush-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const movies = RETROCRUSH_CATALOG.map(toStreamableMovie);
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:RetroCrush] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the RetroCrush catalog for anime matching a query.
 */
export async function searchRetroCrushMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-retrocrush-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = RETROCRUSH_CATALOG
      .filter(entry => {
        const haystack = `${entry.title} ${entry.description} ${entry.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:RetroCrush] Search error:', err);
    return [];
  }
}
