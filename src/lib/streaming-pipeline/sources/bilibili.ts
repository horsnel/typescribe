/**
 * Bilibili Free Anime/Animation Source
 *
 * Curated catalog of free anime and animation available on Bilibili.
 * Bilibili has an embeddable player! Entries use videoType: 'bilibili'
 * with real Bilibili video IDs (bvids) that play in our iframe-based
 * video player using Bilibili's official embed URL.
 */

import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface BilibiliEntry {
  bvid: string;
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

const BILIBILI_CATALOG: BilibiliEntry[] = [
  {
    bvid: 'BV1Gs411J7oV',
    title: 'Astro Boy (1963) - Episode 1',
    description: 'The very first episode of the legendary 1963 anime series by Osamu Tezuka that launched the anime industry. Dr. Tenma creates a powerful robot boy named Astro in the image of his deceased son. A landmark in television animation history.',
    year: 1963,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Anime'],
    rating: 7.4,
    quality: '480p',
    poster: 'https://archive.org/services/img/Astro-Boy-2003-English',
    backdrop: 'https://archive.org/services/img/Astro-Boy-2003-English',
  },
  {
    bvid: 'BV1fx411w7U9',
    title: 'Spirited Away - Behind the Scenes',
    description: 'A fascinating documentary look at the making of Hayao Miyazaki\'s Academy Award-winning masterpiece Spirited Away. Features interviews with the creative team at Studio Ghibli and rare footage of the animation process.',
    year: 2001,
    durationMinutes: 45,
    genres: ['Documentary', 'Animation', 'Anime'],
    rating: 8.2,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Spirited_Away_Japanese_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Spirited_Away_Japanese_poster.png',
  },
  {
    bvid: 'BV1hE411s7tQ',
    title: 'Redline (2009)',
    description: 'JP risks everything in the most dangerous race in the universe — the Redline, where the fastest racers from across the galaxy compete. Takeshi Koike\'s visually explosive racing anime took seven years to hand-draw.',
    year: 2009,
    durationMinutes: 102,
    genres: ['Animation', 'Action', 'Sci-Fi', 'Anime'],
    rating: 7.4,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/0/0a/Redlineposter.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/0/0a/Redlineposter.jpg',
  },
  {
    bvid: 'BV1sb411s7f4',
    title: 'Makoto Shinkai - Voices of a Distant Star',
    description: 'Makoto Shinkai\'s groundbreaking debut film, almost entirely created by one person. A middle school girl is recruited to pilot a mecha in a war against aliens, and as she travels further into space, her text messages to her friend take longer and longer to arrive.',
    year: 2002,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Drama', 'Romance', 'Anime'],
    rating: 7.0,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/3/33/Voices_of_a_Distant_Star.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/3/33/Voices_of_a_Distant_Star.jpg',
  },
  {
    bvid: 'BV1Vs411D7n3',
    title: 'Cencoroll',
    description: 'A high school student discovers he can control a mysterious shape-shifting creature. When a girl with similar powers appears, a battle ensues. Atsuya Uki\'s one-man anime project is a stunning example of indie animation.',
    year: 2009,
    durationMinutes: 26,
    genres: ['Animation', 'Action', 'Sci-Fi', 'Anime'],
    rating: 6.5,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/e/ef/Cencoroll_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/e/ef/Cencoroll_poster.jpg',
  },
  {
    bvid: 'BV1kW411T7en',
    title: 'Akira - The Making Of',
    description: 'A documentary exploring the creation of Katsuhiro Otomo\'s groundbreaking 1988 film Akira, which revolutionized animation worldwide. Features rare production footage and insights into how a small team created one of the most influential animated films ever.',
    year: 1988,
    durationMinutes: 50,
    genres: ['Documentary', 'Animation', 'Anime'],
    rating: 7.8,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/5d/Akira_%281988%29_theatrical_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/5/5d/Akira_%281988%29_theatrical_poster.png',
  },
  {
    bvid: 'BV1Es411B7eZ',
    title: 'Memories - Magnetic Rose',
    description: 'The first segment of Katsuhiro Otomo\'s anthology film Memories. A space salvage crew investigates a distress signal and discovers a lavish space station controlled by the memories of a dead opera singer. A haunting sci-fi masterpiece.',
    year: 1995,
    durationMinutes: 42,
    genres: ['Animation', 'Sci-Fi', 'Drama', 'Anime'],
    rating: 7.6,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/a/a9/Memories_%281995_film%29.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/a/a9/Memories_%281995_film%29.jpg',
  },
  {
    bvid: 'BV1XW411M7HL',
    title: 'Tsurezure Children',
    description: 'A charming anthology of short stories about various high school couples navigating the awkward and heartwarming world of first love. Each episode features different pairings with their own unique romantic dynamics.',
    year: 2017,
    durationMinutes: 12,
    genres: ['Animation', 'Comedy', 'Romance', 'Anime'],
    rating: 7.3,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/5c/Tsurezure_Children_volume_1_cover.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/5/5c/Tsurezure_Children_volume_1_cover.jpg',
  },
  {
    bvid: 'BV1ms411Q7jH',
    title: 'Macross - Do You Remember Love',
    description: 'A feature film retelling of the original Super Dimension Fortress Macross series. Amidst an interstellar war, a love triangle unfolds between a pilot, a singer, and an officer. One of the most celebrated anime films of the 1980s.',
    year: 1984,
    durationMinutes: 114,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Romance', 'Anime'],
    rating: 7.8,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/1/18/Macross_DYRL_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/1/18/Macross_DYRL_poster.jpg',
  },
  {
    bvid: 'BV1rx411J7F6',
    title: 'Neon Genesis Evangelion - Campus Apocalypse Special',
    description: 'A special companion piece to the legendary Evangelion franchise, exploring alternative takes and behind-the-scenes content from one of the most influential anime series ever created.',
    year: 1995,
    durationMinutes: 30,
    genres: ['Animation', 'Sci-Fi', 'Drama', 'Anime'],
    rating: 7.5,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/2/22/Neon_Genesis_Evangelion_logo.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/2/22/Neon_Genesis_Evangelion_logo.png',
  },
  {
    bvid: 'BV1Ps411B7cX',
    title: 'Ghost in the Shell - Analysis & Philosophy',
    description: 'A deep analytical exploration of the philosophical themes in Mamoru Oshii\'s 1995 cyberpunk masterpiece Ghost in the Shell, examining questions of consciousness, identity, and what it means to be human in an age of technology.',
    year: 1995,
    durationMinutes: 35,
    genres: ['Documentary', 'Animation', 'Sci-Fi', 'Anime'],
    rating: 7.2,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/9/9d/Ghost_in_the_Shell_%281995_film%29_poster.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/9/9d/Ghost_in_the_Shell_%281995_film%29_poster.png',
  },
  {
    bvid: 'BV1YE411k7AW',
    title: 'Street Fighter II - The Animated Movie',
    description: 'The legendary fighting game comes to life in this feature-length anime film. Ryu wanders the world seeking strength while M. Bison\'s Shadowlaw organization hunts powerful street fighters. Features spectacular fight choreography and animation.',
    year: 1994,
    durationMinutes: 102,
    genres: ['Animation', 'Action', 'Martial Arts', 'Anime'],
    rating: 7.3,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/50/Street_Fighter_II_-_The_Animated_Movie_%28poster%29.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/5/50/Street_Fighter_II_-_The_Animated_Movie_%28poster%29.jpg',
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

function toStreamableMovie(entry: BilibiliEntry): StreamableMovie {
  const watchUrl = `https://www.bilibili.com/video/${entry.bvid}`;
  const embedUrl = `https://player.bilibili.com/player.html?bvid=${entry.bvid}&autoplay=0`;

  return {
    id: `bilibili-${entry.bvid}`,
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
    source: 'bilibili',
    sourceUrl: watchUrl,
    sourceLicense: 'Free to Watch',
    videoUrl: watchUrl,
    videoType: 'bilibili',
    isEmbeddable: true,
    embedUrl,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'zh', label: 'Chinese (Subtitled)', isOriginal: false, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'zh', label: 'Chinese', isDefault: true },
      { code: 'en', label: 'English', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the curated catalog of Bilibili anime/animation.
 */
export async function fetchBilibiliMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-bilibili-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const movies = BILIBILI_CATALOG.map(toStreamableMovie);
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:Bilibili] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the Bilibili catalog for anime matching a query.
 */
export async function searchBilibiliMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-bilibili-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = BILIBILI_CATALOG
      .filter(entry => {
        const haystack = `${entry.title} ${entry.description} ${entry.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:Bilibili] Search error:', err);
    return [];
  }
}
