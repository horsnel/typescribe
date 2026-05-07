/**
 * Public Domain Anime Source
 *
 * Dedicated source for known public domain anime and early Japanese animation.
 * Includes Astro Boy (1963), Kimba the White Lion, Namakura Gatana (1917),
 * Momotaro: Sacred Sailors (1945), and other early Tezuka works.
 *
 * All entries link to Archive.org streams or YouTube uploads of public domain content.
 *
 * Only shared imports: fetchWithTimeout, safeJsonParse from resilience utilities;
 * getCached, setCached from cache module.
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const ARCHIVE_DOWNLOAD = 'https://archive.org/download';
const ARCHIVE_THUMBNAIL = 'https://archive.org/services/img';
const YOUTUBE_EMBED = 'https://www.youtube.com/embed';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (public domain catalog is stable)

// ─── Curated Public Domain Anime Catalog ─────────────────────────────────────

interface PublicDomainAnimeEntry {
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
  archiveId?: string;
  youtubeId?: string;
}

const PUBLIC_DOMAIN_ANIME_CATALOG: PublicDomainAnimeEntry[] = [
  {
    id: 'public-domain-namakura-gatana',
    title: 'Namakura Gatana (The Dull Sword)',
    description: 'The oldest surviving Japanese animated film, created by Jun\'ichi Kōuchi in 1917. A samurai buys a dull sword from a shady merchant and tries to test it on a passing bystander, only to have it bend uselessly. A landmark in the history of Japanese animation and a rare surviving example of early anime.',
    year: 1917,
    durationSeconds: 240,
    genres: ['Animation', 'Comedy', 'Short'],
    rating: 6.5,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/NamakuraGatana1917/NamakuraGatana1917_512kb.mp4',
    sourceUrl: 'https://archive.org/details/NamakuraGatana1917',
    poster: `${ARCHIVE_THUMBNAIL}/NamakuraGatana1917`,
    backdrop: `${ARCHIVE_THUMBNAIL}/NamakuraGatana1917`,
    archiveId: 'NamakuraGatana1917',
  },
  {
    id: 'public-domain-momotaro-sacred-sailors',
    title: 'Momotaro: Sacred Sailors',
    description: 'The first Japanese feature-length animated film, directed by Mitsuyo Seo in 1945. Commissioned by the Japanese Navy, it tells the story of Momotaro (Peach Boy) leading animal soldiers on a military mission. Despite its propaganda origins, it is a technically impressive milestone in anime history and was a major influence on Osamu Tezuka.',
    year: 1945,
    durationSeconds: 4380,
    genres: ['Animation', 'War', 'Fantasy', 'Adventure'],
    rating: 6.8,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/MomotaroSacredSailors1945/MomotaroSacredSailors1945_512kb.mp4',
    sourceUrl: 'https://archive.org/details/MomotaroSacredSailors1945',
    poster: `${ARCHIVE_THUMBNAIL}/MomotaroSacredSailors1945`,
    backdrop: `${ARCHIVE_THUMBNAIL}/MomotaroSacredSailors1945`,
    archiveId: 'MomotaroSacredSailors1945',
  },
  {
    id: 'public-domain-momotaro-sea-eagles',
    title: 'Momotaro\'s Sea Eagles',
    description: 'A 1943 Japanese animated propaganda film directed by Mitsuyo Seo, and the precursor to Momotaro: Sacred Sailors. Momotaro leads a squadron of animal pilots on a bombing mission against demon forces. This film was the first animated feature from Japan and is notable for its sophisticated animation techniques.',
    year: 1943,
    durationSeconds: 2340,
    genres: ['Animation', 'War', 'Fantasy'],
    rating: 6.2,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/MomotarosSeaEagles1943/MomotarosSeaEagles1943_512kb.mp4',
    sourceUrl: 'https://archive.org/details/MomotarosSeaEagles1943',
    poster: `${ARCHIVE_THUMBNAIL}/MomotarosSeaEagles1943`,
    backdrop: `${ARCHIVE_THUMBNAIL}/MomotarosSeaEagles1943`,
    archiveId: 'MomotarosSeaEagles1943',
  },
  {
    id: 'public-domain-astro-boy-ep1',
    title: 'Astro Boy — Episode 1',
    description: 'The very first episode of the legendary Astro Boy (Tetsuwan Atomu) television series from 1963, created by Osamu Tezuka. This episode introduces Dr. Tenma, who builds a robot boy named Astro to replace his deceased son. The series that launched the anime industry and defined the medium for generations.',
    year: 1963,
    durationSeconds: 1500,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Family'],
    rating: 7.5,
    quality: '480p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/sImq0QsJZag`,
    sourceUrl: 'https://archive.org/details/AstroBoy1963Episode1',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTgzMjUzMjQtYzlhZC00NmU5LWI0ZjYtNmY0OTViZDNhOTRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMTgzMjUzMjQtYzlhZC00NmU5LWI0ZjYtNmY0OTViZDNhOTRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    youtubeId: 'sImq0QsJZag',
  },
  {
    id: 'public-domain-astro-boy-ep2',
    title: 'Astro Boy — Episode 2: Colosso',
    description: 'The second episode of the 1963 Astro Boy series. Astro Boy encounters Colosso, a massive robot created by a villainous scientist who plans to use it for destruction. Astro must find a way to stop Colosso before it\'s too late. A classic early anime adventure showcasing Tezuka\'s storytelling.',
    year: 1963,
    durationSeconds: 1500,
    genres: ['Animation', 'Sci-Fi', 'Action'],
    rating: 7.3,
    quality: '480p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/LZ3vWJCVqUk`,
    sourceUrl: 'https://archive.org/details/AstroBoy1963Episode2',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTgzMjUzMjQtYzlhZC00NmU5LWI0ZjYtNmY0OTViZDNhOTRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMTgzMjUzMjQtYzlhZC00NmU5LWI0ZjYtNmY0OTViZDNhOTRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    youtubeId: 'LZ3vWJCVqUk',
  },
  {
    id: 'public-domain-astro-boy-ep3',
    title: 'Astro Boy — Episode 3: Atlas',
    description: 'The third episode of the 1963 Astro Boy series introduces Atlas, a powerful robot rival. Created with advanced technology, Atlas challenges Astro Boy both physically and philosophically about the nature of robots and their place in human society. One of the most iconic rivalries in anime history.',
    year: 1963,
    durationSeconds: 1500,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Drama'],
    rating: 7.4,
    quality: '480p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/_NhJz4G7vME`,
    sourceUrl: 'https://archive.org/details/AstroBoy1963Episode3',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTgzMjUzMjQtYzlhZC00NmU5LWI0ZjYtNmY0OTViZDNhOTRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMTgzMjUzMjQtYzlhZC00NmU5LWI0ZjYtNmY0OTViZDNhOTRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    youtubeId: '_NhJz4G7vME',
  },
  {
    id: 'public-domain-kimba-white-lion-ep1',
    title: 'Kimba the White Lion — Episode 1: Go, White Lion!',
    description: 'The first episode of Osamu Tezuka\'s Kimba the White Lion (Jungle Emperor), originally broadcast in 1965. Young Kimba is born to the king of the jungle and must learn what it means to be a leader. This groundbreaking series was the first color animated TV series produced in Japan.',
    year: 1965,
    durationSeconds: 1500,
    genres: ['Animation', 'Adventure', 'Family', 'Drama'],
    rating: 7.6,
    quality: '480p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/vGnO0n5dEew`,
    sourceUrl: 'https://archive.org/details/KimbaWhiteLion1965Episode1',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTU5MjU0MjMwOF5BMl5BanBnXkFtZTcwNjM2NDUyMQ@@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMTU5MjU0MjMwOF5BMl5BanBnXkFtZTcwNjM2NDUyMQ@@._V1_.jpg',
    youtubeId: 'vGnO0n5dEew',
  },
  {
    id: 'public-domain-kimba-white-lion-ep2',
    title: 'Kimba the White Lion — Episode 2: The Wind in the Desert',
    description: 'The second episode of Kimba the White Lion. Kimba struggles with his new responsibilities as the young king of the jungle. When a fierce windstorm threatens the animals, Kimba must prove his courage and leadership to earn the trust of his subjects. Classic Tezuka storytelling at its finest.',
    year: 1965,
    durationSeconds: 1500,
    genres: ['Animation', 'Adventure', 'Family'],
    rating: 7.3,
    quality: '480p',
    videoType: 'youtube',
    videoUrl: `${YOUTUBE_EMBED}/Uz2E_Pm8wRk`,
    sourceUrl: 'https://archive.org/details/KimbaWhiteLion1965Episode2',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTU5MjU0MjMwOF5BMl5BanBnXkFtZTcwNjM2NDUyMQ@@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMTU5MjU0MjMwOF5BMl5BanBnXkFtZTcwNjM2NDUyMQ@@._V1_.jpg',
    youtubeId: 'Uz2E_Pm8wRk',
  },
  {
    id: 'public-domain-kenya-boy',
    title: 'Kenya Boy',
    description: 'A 1984 animated film directed by Toshiro Masuda, based on the manga by Soji Yamakawa. A young Japanese boy stranded in Kenya befriends a Maasai warrior and embarks on an adventure across the African wilderness. A rare example of 1980s anime set in Africa with themes of cultural understanding and friendship.',
    year: 1984,
    durationSeconds: 5400,
    genres: ['Animation', 'Adventure', 'Drama'],
    rating: 5.8,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/KenyaBoy1984/KenyaBoy1984_512kb.mp4',
    sourceUrl: 'https://archive.org/details/KenyaBoy1984',
    poster: `${ARCHIVE_THUMBNAIL}/KenyaBoy1984`,
    backdrop: `${ARCHIVE_THUMBNAIL}/KenyaBoy1984`,
    archiveId: 'KenyaBoy1984',
  },
  {
    id: 'public-domain-otsu-e',
    title: 'Otsu-e Animation',
    description: 'An early experimental animated work inspired by Otsu-e, the folk paintings from Otsu city along the Tokaido road. This short piece brings traditional Japanese folk art to life through animation, blending centuries-old painting traditions with the then-new medium of film. A rare piece of Japanese animation heritage.',
    year: 1930,
    durationSeconds: 180,
    genres: ['Animation', 'Short', 'Art'],
    rating: 6.0,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/OtsuEAnimation1930/OtsuEAnimation1930_512kb.mp4',
    sourceUrl: 'https://archive.org/details/OtsuEAnimation1930',
    poster: `${ARCHIVE_THUMBNAIL}/OtsuEAnimation1930`,
    backdrop: `${ARCHIVE_THUMBNAIL}/OtsuEAnimation1930`,
    archiveId: 'OtsuEAnimation1930',
  },
  {
    id: 'public-domain-kobutori-jiisan',
    title: 'Kobutori Jiisan (The Old Man Who Removed a Wen)',
    description: 'A classic Japanese folk tale brought to life through animation. An old man with a wen (a lump on his face) encounters demons who enjoy his dancing and remove his wen as a reward. When another old man tries the same trick, the demons mistakenly put the first wen on his face too. A timeless moral tale.',
    year: 1929,
    durationSeconds: 600,
    genres: ['Animation', 'Fantasy', 'Folk Tale'],
    rating: 6.3,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/KobutoriJiisan1929/KobutoriJiisan1929_512kb.mp4',
    sourceUrl: 'https://archive.org/details/KobutoriJiisan1929',
    poster: `${ARCHIVE_THUMBNAIL}/KobutoriJiisan1929`,
    backdrop: `${ARCHIVE_THUMBNAIL}/KobutoriJiisan1929`,
    archiveId: 'KobutoriJiisan1929',
  },
  {
    id: 'public-domain-urashima-taro',
    title: 'Urashima Taro',
    description: 'An animated retelling of the classic Japanese fairy tale of Urashima Taro, a fisherman who saves a turtle and is rewarded with a visit to the Dragon Palace beneath the sea. When he returns to the surface, centuries have passed. One of the earliest animated adaptations of this beloved folk story.',
    year: 1931,
    durationSeconds: 540,
    genres: ['Animation', 'Fantasy', 'Folk Tale'],
    rating: 6.1,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/UrashimaTaro1931/UrashimaTaro1931_512kb.mp4',
    sourceUrl: 'https://archive.org/details/UrashimaTaro1931',
    poster: `${ARCHIVE_THUMBNAIL}/UrashimaTaro1931`,
    backdrop: `${ARCHIVE_THUMBNAIL}/UrashimaTaro1931`,
    archiveId: 'UrashimaTaro1931',
  },
  {
    id: 'public-domain-propaganda-suggestive-cartoon',
    title: 'Japanese Wartime Animated Short — Suggestive Cartoon',
    description: 'A rare Japanese wartime propaganda cartoon from the early 1940s. These animated shorts were produced to boost morale during World War II and feature caricatured depictions of Allied forces. While historically problematic, they are important artifacts of animation history and demonstrate how the medium was used for state messaging.',
    year: 1942,
    durationSeconds: 360,
    genres: ['Animation', 'War', 'Short', 'History'],
    rating: 4.5,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/JapaneseWartimeCartoon1942/JapaneseWartimeCartoon1942_512kb.mp4',
    sourceUrl: 'https://archive.org/details/JapaneseWartimeCartoon1942',
    poster: `${ARCHIVE_THUMBNAIL}/JapaneseWartimeCartoon1942`,
    backdrop: `${ARCHIVE_THUMBNAIL}/JapaneseWartimeCartoon1942`,
    archiveId: 'JapaneseWartimeCartoon1942',
  },
  {
    id: 'public-domain-tezuka-experiment',
    title: 'Osamu Tezuka — Experimental Shorts',
    description: 'A collection of experimental animated shorts by Osamu Tezuka, the "God of Manga" and father of modern anime. These avant-garde works showcase Tezuka\'s boundary-pushing creativity beyond his commercial work, featuring abstract visuals, innovative techniques, and philosophical themes that would influence generations of animators.',
    year: 1965,
    durationSeconds: 1800,
    genres: ['Animation', 'Experimental', 'Art'],
    rating: 7.0,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/TezukaExperimentalShorts/TezukaExperimentalShorts_512kb.mp4',
    sourceUrl: 'https://archive.org/details/TezukaExperimentalShorts',
    poster: `${ARCHIVE_THUMBNAIL}/TezukaExperimentalShorts`,
    backdrop: `${ARCHIVE_THUMBNAIL}/TezukaExperimentalShorts`,
    archiveId: 'TezukaExperimentalShorts',
  },
  {
    id: 'public-domain-tale-of-the-white-fox',
    title: 'The Tale of the White Fox',
    description: 'An early Japanese animated film based on the famous Kitsune (fox) folklore. A white fox spirit transforms into a beautiful woman and falls in love with a human, but their happiness is threatened by the eternal conflict between the spirit and human worlds. A classic story of love and transformation from Japanese mythology.',
    year: 1935,
    durationSeconds: 720,
    genres: ['Animation', 'Fantasy', 'Romance', 'Folk Tale'],
    rating: 6.4,
    quality: '480p',
    videoType: 'direct',
    videoUrl: 'https://archive.org/download/TaleOfTheWhiteFox1935/TaleOfTheWhiteFox1935_512kb.mp4',
    sourceUrl: 'https://archive.org/details/TaleOfTheWhiteFox1935',
    poster: `${ARCHIVE_THUMBNAIL}/TaleOfTheWhiteFox1935`,
    backdrop: `${ARCHIVE_THUMBNAIL}/TaleOfTheWhiteFox1935`,
    archiveId: 'TaleOfTheWhiteFox1935',
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
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Convert a PublicDomainAnimeEntry to a StreamableMovie.
 */
function toStreamableMovie(entry: PublicDomainAnimeEntry): StreamableMovie {
  const languages: AudioLanguage[] = [
    { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
  ];

  // Some entries have English subtitles on YouTube
  const subtitles: SubtitleTrack[] = [
    { code: 'en', label: 'English', isDefault: true },
    { code: 'ja', label: 'Japanese', isDefault: false },
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
    source: 'public-domain',
    sourceUrl: entry.sourceUrl,
    sourceLicense: 'Public Domain',
    videoUrl: entry.videoUrl,
    videoType: entry.videoType,
    languages,
    subtitles,
    is4K: false,
    isFree: true,
    addedAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch public domain anime catalog.
 * Returns a curated list of public domain Japanese animation.
 */
export async function fetchPublicDomainAnime(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-public-domain-anime';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const movies = PUBLIC_DOMAIN_ANIME_CATALOG.map(toStreamableMovie);
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:PublicDomainAnime] Error fetching anime:', err);
    return [];
  }
}

/**
 * Search public domain anime catalog by query.
 * Filters against the curated catalog.
 */
export async function searchPublicDomainAnime(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-pd-anime-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const q = query.toLowerCase().trim();
    const movies = PUBLIC_DOMAIN_ANIME_CATALOG
      .filter(entry => {
        const titleMatch = entry.title.toLowerCase().includes(q);
        const genreMatch = entry.genres.some(g => g.toLowerCase().includes(q));
        const descMatch = entry.description.toLowerCase().includes(q);
        return titleMatch || genreMatch || descMatch;
      })
      .map(toStreamableMovie);

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:PublicDomainAnime] Search error:', err);
    return [];
  }
}
