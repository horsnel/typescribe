/**
 * Pluto TV Free Streaming Source
 *
 * Curated catalog of free movies and shows available on Pluto TV.
 * Pluto TV is a free streaming service. Since we can't embed their
 * player, entries use videoType: 'linkout' with real Pluto TV URLs
 * that open in a new tab.
 */

import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface PlutoTVEntry {
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

const PLUTO_TV_CATALOG: PlutoTVEntry[] = [
  {
    slug: 'the-thing-1982',
    title: 'The Thing',
    description: 'In the frozen wastes of Antarctica, a research team encounters a shape-shifting alien that can assume the form of any living creature. John Carpenter\'s masterpiece of paranoia and practical effects remains one of the greatest horror films ever made.',
    year: 1982,
    durationMinutes: 109,
    genres: ['Horror', 'Sci-Fi', 'Thriller'],
    rating: 8.2,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/e/e3/The_thing_%281982%29_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/e/e3/The_thing_%281982%29_poster.png',
  },
  {
    slug: 'hellboy-2004',
    title: 'Hellboy',
    description: 'A demon raised by humans works as an investigator for the Bureau for Paranormal Research and Defense, battling supernatural threats while trying to find his place in the world. Guillermo del Toro\'s visionary comic book adaptation.',
    year: 2004,
    durationMinutes: 122,
    genres: ['Action', 'Sci-Fi', 'Fantasy'],
    rating: 6.8,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/6/63/Hellboy_movie.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/6/63/Hellboy_movie.jpg',
  },
  {
    slug: 'donnie-darko',
    title: 'Donnie Darko',
    description: 'A troubled teenager is plagued by visions of a large rabbit that manipulates him to commit crimes, after narrowly escaping a bizarre accident. A mind-bending cult classic that blends teen drama with science fiction.',
    year: 2001,
    durationMinutes: 113,
    genres: ['Drama', 'Sci-Fi', 'Thriller'],
    rating: 8.0,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/d/db/Donnie_Darko_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/d/db/Donnie_Darko_poster.jpg',
  },
  {
    slug: 'friday-the-13th',
    title: 'Friday the 13th',
    description: 'A group of camp counselors is stalked and murdered by an unknown assailant while trying to reopen a summer camp with a dark past. The slasher film that launched one of horror\'s most enduring franchises.',
    year: 1980,
    durationMinutes: 95,
    genres: ['Horror', 'Thriller'],
    rating: 6.4,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/7/76/Friday_the_13th_%281980%29_film_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/7/76/Friday_the_13th_%281980%29_film_poster.jpg',
  },
  {
    slug: 'spaceballs',
    title: 'Spaceballs',
    description: 'In a galaxy far, far away, a rogue pilot and his co-pilot must rescue a princess from the clutches of the evil Dark Helmet. Mel Brooks\' hilarious Star Wars spoof that parodies every sci-fi trope imaginable.',
    year: 1987,
    durationMinutes: 96,
    genres: ['Comedy', 'Sci-Fi'],
    rating: 7.1,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Spaceballs_movie.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Spaceballs_movie.jpg',
  },
  {
    slug: 'batman-1989',
    title: 'Batman',
    description: 'The Dark Knight of Gotham City battles the Joker, a criminal mastermind who terrorizes the city. Tim Burton\'s gothic vision redefined the superhero genre and proved comic book movies could be dark and artistic.',
    year: 1989,
    durationMinutes: 126,
    genres: ['Action', 'Crime', 'Fantasy'],
    rating: 7.5,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/5a/Batman_%281989%29_theatrical_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/5/5a/Batman_%281989%29_theatrical_poster.jpg',
  },
  {
    slug: 'attack-of-the-killer-tomatoes',
    title: 'Attack of the Killer Tomatoes',
    description: 'Mutant tomatoes go on a killing spree, and it\'s up to a government specialist to stop them. A deliberately campy B-movie parody that became a cult classic for its sheer absurdity and low-budget charm.',
    year: 1978,
    durationMinutes: 83,
    genres: ['Comedy', 'Horror', 'Sci-Fi'],
    rating: 4.7,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/e/e2/Attack_of_the_Killer_Tomatoes_movieposter.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/e/e2/Attack_of_the_Killer_Tomatoes_movieposter.jpg',
  },
  {
    slug: 'pet-sematary',
    title: 'Pet Sematary',
    description: 'A family moves to a rural home next to a mysterious burial ground that brings the dead back to life. But what comes back is never quite the same. Stephen King\'s terrifying tale of grief and the terrible price of resurrection.',
    year: 1989,
    durationMinutes: 103,
    genres: ['Horror', 'Drama', 'Thriller'],
    rating: 6.5,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/2/2c/Pet_sematary_%281989%29_theatrical_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/2/2c/Pet_sematary_%281989%29_theatrical_poster.png',
  },
  {
    slug: 'bill-and-teds-excellent-adventure',
    title: "Bill & Ted's Excellent Adventure",
    description: 'Two dim-witted but lovable high schoolers travel through time in a phone booth to gather historical figures for their history presentation. A totally bodacious comedy that defined a generation of 80s humor.',
    year: 1989,
    durationMinutes: 90,
    genres: ['Comedy', 'Sci-Fi', 'Adventure'],
    rating: 6.9,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/7/74/Bill_and_Ted_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/7/74/Bill_and_Ted_poster.jpg',
  },
  {
    slug: 'the-adventures-of-buckaroo-banzai',
    title: 'The Adventures of Buckaroo Banzai',
    description: 'A neurosurgeon, rock star, and physicist battles alien invaders from the 8th dimension with his team of adventurer-scientists. One of the most unique and quotable sci-fi films ever made.',
    year: 1984,
    durationMinutes: 103,
    genres: ['Sci-Fi', 'Action', 'Comedy'],
    rating: 6.4,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/4/45/Buckaroo_Banzai_movieposter.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/4/45/Buckaroo_Banzai_movieposter.jpg',
  },
  {
    slug: 'universal-soldier',
    title: 'Universal Soldier',
    description: 'Two soldiers killed in Vietnam are reanimated as part of a top-secret super-soldier program. When memories of their past conflict resurface, they turn on each other in an explosive battle. A classic 90s action film.',
    year: 1992,
    durationMinutes: 102,
    genres: ['Action', 'Sci-Fi'],
    rating: 6.1,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Universal_Soldier_%281992%29_film_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Universal_Soldier_%281992%29_film_poster.jpg',
  },
  {
    slug: 'blacula',
    title: 'Blacula',
    description: 'An African prince is turned into a vampire by Count Dracula and locked in a coffin for centuries. When he\'s freed in modern Los Angeles, he stalks the city while longing for his lost love. A landmark of Black horror cinema.',
    year: 1972,
    durationMinutes: 93,
    genres: ['Horror', 'Action', 'Drama'],
    rating: 6.1,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/3/3c/Blacula_film.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/3/3c/Blacula_film.jpg',
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

function toStreamableMovie(entry: PlutoTVEntry): StreamableMovie {
  const watchUrl = `https://pluto.tv/on-demand/movies/${entry.slug}`;

  return {
    id: `plutotv-${entry.slug}`,
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
    source: 'pluto-tv',
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
 * Fetch the curated catalog of Pluto TV movies.
 */
export async function fetchPlutoTVMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-plutotv-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const movies = PLUTO_TV_CATALOG.map(toStreamableMovie);
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:PlutoTV] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the Pluto TV catalog for movies matching a query.
 */
export async function searchPlutoTVMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-plutotv-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = PLUTO_TV_CATALOG
      .filter(entry => {
        const haystack = `${entry.title} ${entry.description} ${entry.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:PlutoTV] Search error:', err);
    return [];
  }
}
