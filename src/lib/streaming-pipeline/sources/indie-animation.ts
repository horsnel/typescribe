/**
 * Indie Animation Shorts Source
 *
 * Curated catalog of notable indie animated shorts from various sources.
 * Some entries are YouTube embeds (videoType: 'youtube', isEmbeddable: true),
 * while others are link-outs to various platforms (videoType: 'linkout',
 * isEmbeddable: false).
 */

import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface IndieAnimationEntry {
  id: string;
  title: string;
  description: string;
  year: number;
  durationMinutes: number;
  genres: string[];
  rating: number;
  quality: StreamableMovie['quality'];
  poster: string;
  backdrop: string;
  videoType: 'youtube' | 'linkout';
  videoUrl: string;
  embedUrl?: string;
  sourceUrl: string;
  sourceLicense: string;
}

const INDIE_ANIMATION_CATALOG: IndieAnimationEntry[] = [
  {
    id: 'indie-alma',
    title: 'Alma',
    description: 'A young girl wanders into a mysterious doll shop and finds a doll that looks exactly like her. As she reaches for it, she discovers the terrifying secret of the shop. Rodrigo Blaas\'s chilling animated short that launched his career at Pixar.',
    year: 2009,
    durationMinutes: 6,
    genres: ['Animation', 'Horror', 'Short'],
    rating: 7.5,
    quality: '1080p',
    poster: 'https://i.vimeocdn.com/video/67377425_640x360.jpg',
    backdrop: 'https://i.vimeocdn.com/video/67377425_1280x720.jpg',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/embed/YoHBnMej4YI',
    embedUrl: 'https://www.youtube.com/embed/YoHBnMej4YI',
    sourceUrl: 'https://www.youtube.com/watch?v=YoHBnMej4YI',
    sourceLicense: 'CC BY-NC-ND 3.0',
  },
  {
    id: 'indie-paperman',
    title: 'Paperman',
    description: 'A young man in mid-century New York relies on paper airplanes to connect with the woman of his dreams after a chance encounter. Disney\'s Oscar-winning short blends hand-drawn and computer animation in an innovative technique.',
    year: 2012,
    durationMinutes: 7,
    genres: ['Animation', 'Romance', 'Short'],
    rating: 8.0,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/3/3f/Paperman_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/3/3f/Paperman_poster.jpg',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/embed/R1UwLp_t8v0',
    embedUrl: 'https://www.youtube.com/embed/R1UwLp_t8v0',
    sourceUrl: 'https://www.youtube.com/watch?v=R1UwLp_t8v0',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-feast',
    title: 'Feast',
    description: 'A Boston terrier named Winston shares meals with his owner, until a new girlfriend changes everything. Disney\'s Oscar-winning short is a delightful love story told entirely through a dog\'s dinners.',
    year: 2014,
    durationMinutes: 6,
    genres: ['Animation', 'Comedy', 'Romance', 'Short'],
    rating: 7.6,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/8/8f/Feast_%282014_film%29_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/8/8f/Feast_%282014_film%29_poster.jpg',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/embed/HtfRAmMIkAQ',
    embedUrl: 'https://www.youtube.com/embed/HtfRAmMIkAQ',
    sourceUrl: 'https://www.youtube.com/watch?v=HtfRAmMIkAQ',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-piper',
    title: 'Piper',
    description: 'A hungry sandpiper hatchling ventures from her nest for the first time and must overcome her fear of the ocean waves. Pixar\'s Oscar-winning short features groundbreaking animation technology and a heartwarming story.',
    year: 2016,
    durationMinutes: 6,
    genres: ['Animation', 'Family', 'Short'],
    rating: 8.3,
    quality: '4K',
    poster: 'https://upload.wikimedia.org/wikipedia/en/c/c4/Piper_film_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/c/c4/Piper_film_poster.jpg',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/embed/dX3k_QDnzHE',
    embedUrl: 'https://www.youtube.com/embed/dX3k_QDnzHE',
    sourceUrl: 'https://www.youtube.com/watch?v=dX3k_QDnzHE',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-lou',
    title: 'Lou',
    description: 'A creature made of lost items in a school playground takes on a playground bully. Pixar\'s charming short about kindness and transformation, featuring creative character design and emotional storytelling.',
    year: 2017,
    durationMinutes: 6,
    genres: ['Animation', 'Comedy', 'Family', 'Short'],
    rating: 7.2,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/b/bb/Lou_%282017_film%29_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/b/bb/Lou_%282017_film%29_poster.jpg',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/embed/VNtTM_2I3YM',
    embedUrl: 'https://www.youtube.com/embed/VNtTM_2I3YM',
    sourceUrl: 'https://www.youtube.com/watch?v=VNtTM_2I3YM',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-day-and-night',
    title: 'Day & Night',
    description: 'Two characters — Day and Night — meet and discover what makes each of them special. Pixar\'s innovative short combines 2D and 3D animation, with each character\'s body showing the world during their respective time of day.',
    year: 2010,
    durationMinutes: 6,
    genres: ['Animation', 'Experimental', 'Short'],
    rating: 7.4,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/3/37/Day_%26_Night_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/3/37/Day_%26_Night_poster.jpg',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/embed/Z4LWn0-yvac',
    embedUrl: 'https://www.youtube.com/embed/Z4LWn0-yvac',
    sourceUrl: 'https://www.youtube.com/watch?v=Z4LWn0-yvac',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-world-of-tomorrow',
    title: 'World of Tomorrow',
    description: 'A little girl is taken on a mind-bending tour of the future by her older clone. Don Hertzfeldt\'s Oscar-nominated masterpiece explores memory, loss, and the human condition through a child\'s innocent perspective.',
    year: 2015,
    durationMinutes: 17,
    genres: ['Animation', 'Sci-Fi', 'Drama', 'Short'],
    rating: 8.5,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/6/69/World_of_Tomorrow_%28film%29.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/6/69/World_of_Tomorrow_%28film%29.png',
    videoType: 'linkout',
    videoUrl: 'https://www.vimeo.com/160618913',
    sourceUrl: 'https://www.vimeo.com/160618913',
    sourceLicense: 'Rent/Buy',
  },
  {
    id: 'indie-rejected',
    title: 'Rejected',
    description: 'A series of increasingly surreal animated "commercials" that were supposedly rejected by various corporate clients. Don Hertzfeldt\'s cult classic that became one of the most viral animated shorts of the early internet era.',
    year: 2000,
    durationMinutes: 10,
    genres: ['Animation', 'Comedy', 'Experimental', 'Short'],
    rating: 7.8,
    quality: '480p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/9/99/Rejected_%28film%29.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/9/99/Rejected_%28film%29.png',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/embed/hfsVccIMoSU',
    embedUrl: 'https://www.youtube.com/embed/hfsVccIMoSU',
    sourceUrl: 'https://www.youtube.com/watch?v=hfsVccIMoSU',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-everything-will-be-ok',
    title: 'Everything Will Be OK',
    description: 'The first chapter of Don Hertzfeldt\'s acclaimed trilogy follows Bill, a man whose daily routine becomes increasingly disrupted by strange visions. A haunting and deeply personal exploration of mental health and existence.',
    year: 2006,
    durationMinutes: 17,
    genres: ['Animation', 'Drama', 'Experimental', 'Short'],
    rating: 8.0,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Everything_Will_Be_OK_%28film%29.png',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Everything_Will_Be_OK_%28film%29.png',
    videoType: 'linkout',
    videoUrl: 'https://www.vimeo.com/94953575',
    sourceUrl: 'https://www.vimeo.com/94953575',
    sourceLicense: 'Rent/Buy',
  },
  {
    id: 'indie-in-a-heartbeat',
    title: 'In a Heartbeat',
    description: 'A closeted boy runs the risk of being outed by his own heart after it pops out of his chest to chase down the boy of his dreams. Beth David and Esteban Bravo\'s viral animated short about first love and acceptance.',
    year: 2017,
    durationMinutes: 4,
    genres: ['Animation', 'Romance', 'Short'],
    rating: 8.0,
    quality: '1080p',
    poster: 'https://i.vimeocdn.com/video/653945928_640x360.jpg',
    backdrop: 'https://i.vimeocdn.com/video/653945928_1280x720.jpg',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/embed/2REkk9SCRn0',
    embedUrl: 'https://www.youtube.com/embed/2REkk9SCRn0',
    sourceUrl: 'https://www.youtube.com/watch?v=2REkk9SCRn0',
    sourceLicense: 'CC BY 4.0',
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

function toStreamableMovie(entry: IndieAnimationEntry): StreamableMovie {
  return {
    id: entry.id,
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
    source: 'indie-animation',
    sourceUrl: entry.sourceUrl,
    sourceLicense: entry.sourceLicense,
    videoUrl: entry.videoUrl,
    videoType: entry.videoType,
    isEmbeddable: entry.videoType === 'youtube',
    embedUrl: entry.embedUrl,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: entry.quality === '4K',
    isFree: true,
    addedAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the curated catalog of indie animation shorts.
 */
export async function fetchIndieAnimationMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-indie-animation-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const movies = INDIE_ANIMATION_CATALOG.map(toStreamableMovie);
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:IndieAnimation] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the indie animation catalog for shorts matching a query.
 */
export async function searchIndieAnimationMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-indie-animation-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = INDIE_ANIMATION_CATALOG
      .filter(entry => {
        const haystack = `${entry.title} ${entry.description} ${entry.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:IndieAnimation] Search error:', err);
    return [];
  }
}
