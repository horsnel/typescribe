/**
 * Indie Animation Source
 *
 * Curated catalog of indie animated shorts and films from sources like
 * Short of the Week, Cartoon Brew, Newgrounds, and the broader indie
 * animation community. Includes award-winning student films, Blender
 * community shorts, and notable indie animations.
 *
 * Only shared imports: fetchWithTimeout, safeJsonParse from resilience utilities;
 * getCached, setCached from cache module.
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const YOUTUBE_EMBED = 'https://www.youtube.com/embed';
const VIMEO_EMBED = 'https://player.vimeo.com/video';
const ARCHIVE_DOWNLOAD = 'https://archive.org/download';
const ARCHIVE_THUMBNAIL = 'https://archive.org/services/img';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (curated catalog, rarely changes)

// ─── Curated Indie Animation Catalog ────────────────────────────────────────

interface IndieAnimationEntry {
  id: string;
  title: string;
  description: string;
  year: number;
  durationSeconds: number;
  genres: string[];
  rating: number;
  quality: StreamableMovie['quality'];
  videoType: StreamableMovie['videoType'];
  videoUrl: string;
  sourceUrl: string;
  poster: string;
  backdrop: string;
  sourceLicense: string;
}

const INDIE_ANIMATION_CATALOG: IndieAnimationEntry[] = [
  {
    id: 'indie-world-of-tomorrow-episode-1',
    title: 'World of Tomorrow',
    description: 'A little girl named Emily is taken on a fantastical tour of her distant future by her older self. Don Hertzfeldt\'s masterpiece of independent animation explores themes of memory, love, loss, and the human condition through deceptively simple stick-figure animation. Winner of the Sundance Short Film Jury Prize and widely considered one of the greatest animated shorts ever made.',
    year: 2015,
    durationSeconds: 1020,
    genres: ['Animation', 'Sci-Fi', 'Drama'],
    rating: 8.9,
    quality: '720p',
    videoType: 'vimeo',
    videoUrl: `${VIMEO_EMBED}/125676186`,
    sourceUrl: 'https://vimeo.com/125676186',
    poster: 'https://i.vimeocdn.com/video/522497565_1280x720',
    backdrop: 'https://i.vimeocdn.com/video/522497565_1280x720',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-world-of-tomorrow-episode-2',
    title: 'World of Tomorrow Episode Two: The Burden of Other People\'s Thoughts',
    description: 'The sequel to Don Hertzfeldt\'s World of Tomorrow. Emily is visited again by a future clone of herself, this time a different version with a new story to tell about the strange and melancholic life she leads in the distant future. A haunting meditation on identity, consciousness, and the weight of inherited memory.',
    year: 2017,
    durationSeconds: 1380,
    genres: ['Animation', 'Sci-Fi', 'Drama'],
    rating: 8.3,
    quality: '720p',
    videoType: 'vimeo',
    videoUrl: `${VIMEO_EMBED}/219275707`,
    sourceUrl: 'https://vimeo.com/219275707',
    poster: 'https://i.vimeocdn.com/video/678246038_1280x720',
    backdrop: 'https://i.vimeocdn.com/video/678246038_1280x720',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-rejected',
    title: 'Rejected',
    description: 'Don Hertzfeldt\'s legendary animated short featuring a collection of animated segments that were "rejected" by the fictional Family Learning Channel. Absurdist, surreal, and darkly hilarious, this film became a cult classic and was nominated for an Academy Award for Best Animated Short Film. Features the iconic "My spoon is too big" sketch.',
    year: 2000,
    durationSeconds: 570,
    genres: ['Animation', 'Comedy', 'Experimental'],
    rating: 8.0,
    quality: '480p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/z3GmVSXJ5D0`,
    sourceUrl: 'https://www.youtube.com/watch?v=z3GmVSXJ5D0',
    poster: 'https://img.youtube.com/vi/z3GmVSXJ5D0/maxresdefault.jpg',
    backdrop: 'https://img.youtube.com/vi/z3GmVSXJ5D0/maxresdefault.jpg',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-everything-will-be-ok',
    title: 'Everything Will Be OK',
    description: 'The first installment of Don Hertzfeldt\'s "Bill" trilogy. Bill is an ordinary man going about his ordinary life, but something is subtly wrong. This beautifully animated short captures the fragile normalcy of everyday existence and the creeping realization that things may not be as they seem. Winner of the Sundance Short Film Jury Prize.',
    year: 2006,
    durationSeconds: 1020,
    genres: ['Animation', 'Drama'],
    rating: 8.2,
    quality: '720p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/1I0Y4cVLqBE`,
    sourceUrl: 'https://www.youtube.com/watch?v=1I0Y4cVLqBE',
    poster: 'https://img.youtube.com/vi/1I0Y4cVLqBE/maxresdefault.jpg',
    backdrop: 'https://img.youtube.com/vi/1I0Y4cVLqBE/maxresdefault.jpg',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-sita-sings-the-blues',
    title: 'Sita Sings the Blues',
    description: 'Nina Paley\'s critically acclaimed animated feature film that interweaves the ancient Indian epic Ramayana with the filmmaker\'s own autobiographical story of heartbreak. Set to the 1920s jazz vocals of Annette Hanshaw, this innovative film blends multiple animation styles and has been released under a Creative Commons license. A landmark of indie animation.',
    year: 2008,
    durationSeconds: 4920,
    genres: ['Animation', 'Drama', 'Musical', 'Fantasy'],
    rating: 7.8,
    quality: '720p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/Sita_Sings_the_Blues/Sita_Sings_the_Blues_512kb.mp4',
    sourceUrl: 'https://archive.org/details/Sita_Sings_the_Blues',
    poster: `${ARCHIVE_THUMBNAIL}/Sita_Sings_the_Blues`,
    backdrop: `${ARCHIVE_THUMBNAIL}/Sita_Sings_the_Blues`,
    sourceLicense: 'Creative Commons',
  },
  {
    id: 'indie-cosmos-laundromat',
    title: 'Cosmos Laundromat: First Cycle',
    description: 'An experimental animated short from the Blender Institute, the team behind the Blender Foundation open movies. A despondent sheep on a barren island meets Victor, a mysterious being who offers him the chance to relive his life with different choices. A philosophical and visually stunning exploration of free will and regret, produced with open-source tools.',
    year: 2015,
    durationSeconds: 720,
    genres: ['Animation', 'Fantasy', 'Drama', 'Experimental'],
    rating: 7.4,
    quality: '1080p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/Y-rmzh0PI3c`,
    sourceUrl: 'https://www.youtube.com/watch?v=Y-rmzh0PI3c',
    poster: 'https://img.youtube.com/vi/Y-rmzh0PI3c/maxresdefault.jpg',
    backdrop: 'https://img.youtube.com/vi/Y-rmzh0PI3c/maxresdefault.jpg',
    sourceLicense: 'CC BY 4.0',
  },
  {
    id: 'indie-hero',
    title: 'Hero',
    description: 'A stunning animated short by Zhang Jing that blends traditional Chinese ink-wash painting with modern 3D animation techniques. Set in ancient China, it tells the story of a warrior\'s journey through breathtaking landscapes rendered in the style of classical Chinese art. A visual masterpiece that bridges centuries of artistic tradition.',
    year: 2014,
    durationSeconds: 480,
    genres: ['Animation', 'Action', 'Art'],
    rating: 7.6,
    quality: '1080p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/F2PkJt3CYFo`,
    sourceUrl: 'https://www.youtube.com/watch?v=F2PkJt3CYFo',
    poster: 'https://img.youtube.com/vi/F2PkJt3CYFo/maxresdefault.jpg',
    backdrop: 'https://img.youtube.com/vi/F2PkJt3CYFo/maxresdefault.jpg',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-the-black-hole',
    title: 'The Black Hole',
    description: 'A sleep-deprived office worker discovers that his photocopier has created a black hole that leads to another dimension. Greed takes over as he reaches through the portal, but the consequences are not what he expects. A gripping live-action/CG hybrid short from Short of the Week that demonstrates how indie filmmakers can create compelling sci-fi on a minimal budget.',
    year: 2015,
    durationSeconds: 180,
    genres: ['Animation', 'Sci-Fi', 'Thriller'],
    rating: 7.2,
    quality: '1080p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/P5_MsrdV3U8`,
    sourceUrl: 'https://www.youtube.com/watch?v=P5_MsrdV3U8',
    poster: 'https://img.youtube.com/vi/P5_MsrdV3U8/maxresdefault.jpg',
    backdrop: 'https://img.youtube.com/vi/P5_MsrdV3U8/maxresdefault.jpg',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-in-a-heartbeat',
    title: 'In a Heartbeat',
    description: 'An animated short film by Beth David and Esteban Bravo about a closeted boy who runs the risk of being outed by his own heart after it pops out of his chest to chase down the boy of his dreams. Created as a student film at Ringling College of Art and Design, it went viral and has been praised for its sensitive and joyful portrayal of young LGBTQ+ love.',
    year: 2017,
    durationSeconds: 240,
    genres: ['Animation', 'Romance', 'Short'],
    rating: 8.1,
    quality: '1080p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/2REkk9SCRnE`,
    sourceUrl: 'https://www.youtube.com/watch?v=2REkk9SCRnE',
    poster: 'https://img.youtube.com/vi/2REkk9SCRnE/maxresdefault.jpg',
    backdrop: 'https://img.youtube.com/vi/2REkk9SCRnE/maxresdefault.jpg',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-paperman',
    title: 'Paperman',
    description: 'A young man in mid-century New York City relies on a fleet of paper airplanes to connect with the woman of his dreams. Disney\'s Oscar-winning short that pioneered a new technique blending hand-drawn and computer animation. While from a major studio, it represents the artistic ambition that indie animators aspire to, and has been made freely available online.',
    year: 2012,
    durationSeconds: 420,
    genres: ['Animation', 'Romance', 'Short'],
    rating: 8.3,
    quality: '1080p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/1QsfoLV2fIM`,
    sourceUrl: 'https://www.youtube.com/watch?v=1QsfoLV2fIM',
    poster: 'https://img.youtube.com/vi/1QsfoLV2fIM/maxresdefault.jpg',
    backdrop: 'https://img.youtube.com/vi/1QsfoLV2fIM/maxresdefault.jpg',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-the-scan',
    title: 'The Scan',
    description: 'A short animated film by students at the Animation Workshop in Denmark. In a dystopian future, citizens must undergo mandatory identity scans — but one woman discovers she can\'t be scanned. A gripping tale of identity and resistance with striking visual design that earned recognition at multiple animation festivals.',
    year: 2019,
    durationSeconds: 510,
    genres: ['Animation', 'Sci-Fi', 'Drama'],
    rating: 7.3,
    quality: '1080p',
    videoType: 'vimeo',
    videoUrl: `${VIMEO_EMBED}/348248931`,
    sourceUrl: 'https://vimeo.com/348248931',
    poster: 'https://i.vimeocdn.com/video/757429027_1280x720',
    backdrop: 'https://i.vimeocdn.com/video/757429027_1280x720',
    sourceLicense: 'CC BY 4.0',
  },
  {
    id: 'indie-auld-lang-syne',
    title: 'Auld Lang Syne',
    description: 'A New Year\'s Eve party goes terribly wrong when an awkward misunderstanding escalates into an existential crisis. This award-winning student animated short from the Royal College of Art in London combines dark humor with beautifully crafted stop-motion animation and hand-drawn elements, creating a uniquely textured visual experience.',
    year: 2018,
    durationSeconds: 360,
    genres: ['Animation', 'Comedy', 'Drama'],
    rating: 7.0,
    quality: '1080p',
    videoType: 'vimeo',
    videoUrl: `${VIMEO_EMBED}/280744642`,
    sourceUrl: 'https://vimeo.com/280744642',
    poster: 'https://i.vimeocdn.com/video/692754290_1280x720',
    backdrop: 'https://i.vimeocdn.com/video/692754290_1280x720',
    sourceLicense: 'Creative Commons',
  },
  {
    id: 'indie-gopher-broke',
    title: 'Gopher Broke',
    description: 'A hungry gopher hatches a clever scheme to shake fruit from passing trucks on a country road, but each attempt ends in unexpected hilarity. An Oscar-nominated animated short by Jeff Fowler that showcases brilliant slapstick timing and character animation. Created at Blur Studio, it demonstrates the quality achievable in indie CG animation.',
    year: 2004,
    durationSeconds: 240,
    genres: ['Animation', 'Comedy', 'Family'],
    rating: 7.5,
    quality: '720p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/gFBRjE5HZ3s`,
    sourceUrl: 'https://www.youtube.com/watch?v=gFBRjE5HZ3s',
    poster: 'https://img.youtube.com/vi/gFBRjE5HZ3s/maxresdefault.jpg',
    backdrop: 'https://img.youtube.com/vi/gFBRjE5HZ3s/maxresdefault.jpg',
    sourceLicense: 'Free to Watch',
  },
  {
    id: 'indie-valve-ambient',
    title: 'Ambient — The Maker\'s Apprentice',
    description: 'A Blender community animated short that follows a young apprentice learning to craft magical machines from a mysterious mentor. Created collaboratively by artists around the world using open-source tools, this project demonstrates the power of community-driven animation production. Features stunning mechanical designs and a steampunk aesthetic.',
    year: 2020,
    durationSeconds: 540,
    genres: ['Animation', 'Fantasy', 'Adventure'],
    rating: 6.8,
    quality: '1080p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/N4qE1UHgpVI`,
    sourceUrl: 'https://www.youtube.com/watch?v=N4qE1UHgpVI',
    poster: 'https://img.youtube.com/vi/N4qE1UHgpVI/maxresdefault.jpg',
    backdrop: 'https://img.youtube.com/vi/N4qE1UHgpVI/maxresdefault.jpg',
    sourceLicense: 'CC BY 4.0',
  },
  {
    id: 'indie-negative-space',
    title: 'Negative Space',
    description: 'A poignant animated short by Max Porter and Ru Kuwahata based on a poem by Ron Koertge. A son learns the art of packing a suitcase from his frequently traveling father, and this shared ritual becomes a tender metaphor for their relationship. Nominated for the Academy Award for Best Animated Short Film, it beautifully demonstrates how simple animation can carry profound emotional weight.',
    year: 2017,
    durationSeconds: 300,
    genres: ['Animation', 'Drama', 'Short'],
    rating: 7.8,
    quality: '1080p',
    videoType: 'vimeo',
    videoUrl: `${VIMEO_EMBED}/249470504`,
    sourceUrl: 'https://vimeo.com/249470504',
    poster: 'https://i.vimeocdn.com/video/673440784_1280x720',
    backdrop: 'https://i.vimeocdn.com/video/673440784_1280x720',
    sourceLicense: 'Free to Watch',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format seconds to human-readable duration.
 */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Unknown';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Convert an IndieAnimationEntry to a StreamableMovie.
 */
function toStreamableMovie(entry: IndieAnimationEntry): StreamableMovie {
  const languages: AudioLanguage[] = [
    { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
  ];

  const subtitles: SubtitleTrack[] = [
    { code: 'en', label: 'English', isDefault: true },
  ];

  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    year: entry.year,
    duration: formatDuration(entry.durationSeconds),
    durationSeconds: entry.durationSeconds,
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
    languages,
    subtitles,
    is4K: entry.quality === '4K',
    isFree: true,
    addedAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch indie animation catalog.
 * Returns a curated list of indie animated shorts and films.
 */
export async function fetchIndieAnimation(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-indie-animation';
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
 * Search indie animation catalog by query.
 * Filters against the curated catalog.
 */
export async function searchIndieAnimation(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-indie-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const q = query.toLowerCase().trim();
    const movies = INDIE_ANIMATION_CATALOG
      .filter(entry => {
        const titleMatch = entry.title.toLowerCase().includes(q);
        const genreMatch = entry.genres.some(g => g.toLowerCase().includes(q));
        const descMatch = entry.description.toLowerCase().includes(q);
        const licenseMatch = entry.sourceLicense.toLowerCase().includes(q);
        return titleMatch || genreMatch || descMatch || licenseMatch;
      })
      .map(toStreamableMovie);

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:IndieAnimation] Search error:', err);
    return [];
  }
}
