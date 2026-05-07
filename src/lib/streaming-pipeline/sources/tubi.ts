/**
 * Tubi Free Streaming Source
 *
 * Curated catalog of popular free movies and shows available on Tubi.
 * Tubi is a free ad-supported streaming service (FAST). Since we can't
 * embed their player, entries use videoType: 'linkout' with real Tubi
 * watch URLs that open in a new tab.
 */

import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface TubiEntry {
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

const TUBI_CATALOG: TubiEntry[] = [
  {
    slug: 'the-terminator',
    title: 'The Terminator',
    description: 'A cyborg assassin is sent back in time to kill Sarah Connor, whose unborn son will one day lead the human resistance against the machines. A relentless sci-fi action classic that launched a franchise and defined a genre.',
    year: 1984,
    durationMinutes: 107,
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    rating: 8.0,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/7/7f/The_Terminator_movie_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/7/7f/The_Terminator_movie_poster.jpg',
  },
  {
    slug: 'fargo',
    title: 'Fargo',
    description: 'A car salesman hires two criminals to kidnap his wife, but the scheme goes horribly wrong in this darkly comedic crime masterpiece from the Coen Brothers. A tale of greed, murder, and Midwestern manners.',
    year: 1996,
    durationMinutes: 98,
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 8.1,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/9/9b/Fargo_film_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/9/9b/Fargo_film_poster.png',
  },
  {
    slug: 'train-to-busan',
    title: 'Train to Busan',
    description: 'A father and daughter board a train to Busan just as a zombie outbreak sweeps across South Korea. They must fight for survival as the infected multiply and the train hurtles toward their only hope of safety.',
    year: 2016,
    durationMinutes: 118,
    genres: ['Action', 'Horror', 'Thriller'],
    rating: 7.6,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/7/78/Train_to_Busan_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/7/78/Train_to_Busan_poster.jpg',
  },
  {
    slug: 'dodgeball',
    title: 'Dodgeball: A True Underdog Story',
    description: 'A group of misfits enters a Las Vegas dodgeball tournament to save their beloved local gym from corporate takeover. Hilarious underdog comedy with an all-star cast.',
    year: 2004,
    durationMinutes: 92,
    genres: ['Comedy', 'Sports'],
    rating: 6.7,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Dodgeball_Poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Dodgeball_Poster.jpg',
  },
  {
    slug: 'apocalypse-now',
    title: 'Apocalypse Now',
    description: 'During the Vietnam War, Captain Willard is sent on a dangerous mission into Cambodia to assassinate a renegade colonel who has set himself up as a god among a local tribe. A visionary war epic.',
    year: 1979,
    durationMinutes: 147,
    genres: ['Drama', 'War', 'Action'],
    rating: 8.5,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/c/c2/Apocalypse_Now_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/c/c2/Apocalypse_Now_poster.jpg',
  },
  {
    slug: 'children-of-the-corn',
    title: 'Children of the Corn',
    description: 'A young couple stumbles upon a deserted Nebraska town where a religious cult of children has murdered all the adults in the name of a mysterious entity called "He Who Walks Behind the Rows."',
    year: 1984,
    durationMinutes: 93,
    genres: ['Horror', 'Thriller'],
    rating: 5.6,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/5a/Children_of_the_Corn_movie_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/5/5a/Children_of_the_Corn_movie_poster.jpg',
  },
  {
    slug: 'metropolis',
    title: 'Metropolis (1927)',
    description: 'In a futuristic city sharply divided between the working class and the city planners, the son of the city\'s mastermind falls in love with a working class prophet. A landmark of science fiction cinema and one of the greatest silent films ever made.',
    year: 1927,
    durationMinutes: 153,
    genres: ['Sci-Fi', 'Drama', 'Fantasy'],
    rating: 8.3,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Metropolis_film_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Metropolis_film_poster.jpg',
  },
  {
    slug: 'evil-dead',
    title: 'The Evil Dead',
    description: 'Five friends travel to a cabin in the woods and discover a mysterious book that unleashes demonic forces. Sam Raimi\'s low-budget horror classic that became a cult phenomenon and launched a beloved franchise.',
    year: 1981,
    durationMinutes: 85,
    genres: ['Horror'],
    rating: 7.4,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/2/2b/Evil_Dead_movie_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/2/2b/Evil_Dead_movie_poster.jpg',
  },
  {
    slug: 'super-size-me',
    title: 'Super Size Me',
    description: 'Filmmaker Morgan Spurlock subjects himself to a 30-day diet of only McDonald\'s food, documenting the dramatic effects on his physical and psychological health. A provocative documentary that changed fast food culture.',
    year: 2004,
    durationMinutes: 100,
    genres: ['Documentary', 'Comedy'],
    rating: 7.2,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/2/2a/Super_Size_Me_Poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/2/2a/Super_Size_Me_Poster.jpg',
  },
  {
    slug: 'zombieland',
    title: 'Zombieland',
    description: 'In a world overrun by zombies, a shy college student teams up with three eccentric survivors to cross the country. A witty horror-comedy that perfectly balances scares and laughs with memorable characters.',
    year: 2009,
    durationMinutes: 88,
    genres: ['Comedy', 'Horror', 'Action'],
    rating: 7.5,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/6/66/Zombieland_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/6/66/Zombieland_poster.jpg',
  },
  {
    slug: 'snatch',
    title: 'Snatch',
    description: 'In the London criminal underworld, a stolen diamond, a bare-knuckle fighter, and a colorful cast of gangsters collide in Guy Ritchie\'s fast-paced crime comedy. Sharp dialogue and intertwined storylines make this a cult classic.',
    year: 2000,
    durationMinutes: 104,
    genres: ['Crime', 'Comedy', 'Thriller'],
    rating: 8.0,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Snatch_ver2.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Snatch_ver2.jpg',
  },
  {
    slug: 'monsters',
    title: 'Monsters',
    description: 'Six years after a NASA probe crash-landed in Mexico, a journalist agrees to escort an American tourist through the "Infected Zone" to the safety of the US border. Gareth Edwards\' stunning low-budget sci-fi debut.',
    year: 2010,
    durationMinutes: 94,
    genres: ['Sci-Fi', 'Drama', 'Thriller'],
    rating: 6.4,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Monsters_2010_film_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Monsters_2010_film_poster.jpg',
  },
  {
    slug: 'the-babadook',
    title: 'The Babadook',
    description: 'A single mother and her child fall into a deep well of paranoia when an eerie children\'s book appears in their home. A psychological horror film that uses supernatural elements to explore grief and trauma.',
    year: 2014,
    durationMinutes: 93,
    genres: ['Horror', 'Drama', 'Thriller'],
    rating: 6.8,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/3/3a/The_Babadook_film_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/3/3a/The_Babadook_film_poster.png',
  },
  {
    slug: 'kung-fury',
    title: 'Kung Fury',
    description: 'A Miami cop travels back in time to kill the worst criminal of all time: Adolf Hitler, aka Kung Führer. A loving homage to 80s action movies with ridiculous over-the-top martial arts and laser dinosaurs.',
    year: 2015,
    durationMinutes: 30,
    genres: ['Action', 'Comedy', 'Sci-Fi'],
    rating: 8.0,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/5a/Kung_Fury_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/5/5a/Kung_Fury_poster.jpg',
  },
  {
    slug: 'memento',
    title: 'Memento',
    description: 'A man with short-term memory loss uses notes and tattoos to hunt for his wife\'s killer. Christopher Nolan\'s brilliant puzzle-box thriller told in reverse chronological order challenges everything you think you know.',
    year: 2000,
    durationMinutes: 113,
    genres: ['Mystery', 'Thriller', 'Drama'],
    rating: 8.4,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/c/c7/Memento_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/c/c7/Memento_poster.jpg',
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

function toStreamableMovie(entry: TubiEntry): StreamableMovie {
  const watchUrl = `https://tubitv.com/movies/${entry.slug}`;

  return {
    id: `tubi-${entry.slug}`,
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
    source: 'tubi',
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
 * Fetch the curated catalog of Tubi movies.
 */
export async function fetchTubiMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-tubi-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const movies = TUBI_CATALOG.map(toStreamableMovie);
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:Tubi] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the Tubi catalog for movies matching a query.
 */
export async function searchTubiMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-tubi-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = TUBI_CATALOG
      .filter(entry => {
        const haystack = `${entry.title} ${entry.description} ${entry.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:Tubi] Search error:', err);
    return [];
  }
}
