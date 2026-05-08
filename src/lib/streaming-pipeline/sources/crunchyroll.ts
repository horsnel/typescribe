/**
 * Crunchyroll Source — Anime linkout source
 *
 * Crunchyroll doesn't offer a free public API. This source provides
 * curated anime entries that link out to Crunchyroll for watching.
 * Entries use videoType: 'linkout'.
 */

import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Curated popular anime available for free on Crunchyroll
const CURATED_ANIME: StreamableMovie[] = [
  {
    id: 'crunchyroll-naruto',
    title: 'Naruto',
    description: 'A young ninja strives for greatness while harboring the spirit of a fearsome nine-tailed fox. One of the most iconic anime series ever created, following Naruto Uzumaki\'s journey from outcast to hero.',
    year: 2002,
    duration: '24m per ep',
    durationSeconds: 1440,
    genres: ['Anime', 'Action', 'Adventure', 'Martial Arts'],
    rating: 8.3,
    quality: '1080p',
    poster: 'https://img1.ak.crunchyroll.com/i/spire1/0bd6e09b8d0090c379e5e5d5c6a2265c1652427594_full.jpg',
    backdrop: 'https://img1.ak.crunchyroll.com/i/spire1/0bd6e09b8d0090c379e5e5d5c6a2265c1652427594_full.jpg',
    source: 'crunchyroll',
    sourceUrl: 'https://www.crunchyroll.com/series/GY9P48X6R/naruto',
    sourceLicense: 'Free with Ads',
    videoUrl: 'https://www.crunchyroll.com/series/GY9P48X6R/naruto',
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2002-10-03T00:00:00Z',
  },
  {
    id: 'crunchyroll-one-piece',
    title: 'One Piece',
    description: 'Monkey D. Luffy sets off on an adventure to find the fabled treasure One Piece and become the King of the Pirates. The longest-running anime series with over 1000 episodes.',
    year: 1999,
    duration: '24m per ep',
    durationSeconds: 1440,
    genres: ['Anime', 'Action', 'Adventure', 'Comedy'],
    rating: 8.7,
    quality: '1080p',
    poster: 'https://img1.ak.crunchyroll.com/i/spire4/3c4dd78da0f7e9167a0c6d0b4520a3ae1643234082_full.jpg',
    backdrop: 'https://img1.ak.crunchyroll.com/i/spire4/3c4dd78da0f7e9167a0c6d0b4520a3ae1643234082_full.jpg',
    source: 'crunchyroll',
    sourceUrl: 'https://www.crunchyroll.com/series/GRMH648VR/one-piece',
    sourceLicense: 'Free with Ads',
    videoUrl: 'https://www.crunchyroll.com/series/GRMH648VR/one-piece',
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1999-10-20T00:00:00Z',
  },
  {
    id: 'crunchyroll-dragon-ball',
    title: 'Dragon Ball',
    description: 'The classic anime following Goku\'s journey from a young boy with a tail to the strongest fighter in the universe. A foundational anime that defined the shonen genre.',
    year: 1986,
    duration: '24m per ep',
    durationSeconds: 1440,
    genres: ['Anime', 'Action', 'Adventure', 'Martial Arts'],
    rating: 8.5,
    quality: '720p',
    poster: 'https://img1.ak.crunchyroll.com/i/spire2/e9e97e3eb4b0b3e9a0494f1585117c7b1643234196_full.jpg',
    backdrop: 'https://img1.ak.crunchyroll.com/i/spire2/e9e97e3eb4b0b3e9a0494f1585117c7b1643234196_full.jpg',
    source: 'crunchyroll',
    sourceUrl: 'https://www.crunchyroll.com/series/GY5P48X6R/dragon-ball',
    sourceLicense: 'Free with Ads',
    videoUrl: 'https://www.crunchyroll.com/series/GY5P48X6R/dragon-ball',
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [{ code: 'en', label: 'English', isDefault: true }],
    is4K: false,
    isFree: true,
    addedAt: '1986-02-26T00:00:00Z',
  },
  {
    id: 'crunchyroll-attack-on-titan',
    title: 'Attack on Titan',
    description: 'In a world where humanity lives within enormous walled cities to protect themselves from Titans, gigantic humanoid creatures, a young boy named Eren vows to destroy them all after a Titan brings about the destruction of his hometown.',
    year: 2013,
    duration: '24m per ep',
    durationSeconds: 1440,
    genres: ['Anime', 'Action', 'Drama', 'Dark Fantasy'],
    rating: 9.0,
    quality: '1080p',
    poster: 'https://img1.ak.crunchyroll.com/i/spire1/40a6e148f0f0d4a2e38c2a8fd8e458ca1643234007_full.jpg',
    backdrop: 'https://img1.ak.crunchyroll.com/i/spire1/40a6e148f0f0d4a2e38c2a8fd8e458ca1643234007_full.jpg',
    source: 'crunchyroll',
    sourceUrl: 'https://www.crunchyroll.com/series/GY8VEQ95Y/attack-on-titan',
    sourceLicense: 'Free with Ads',
    videoUrl: 'https://www.crunchyroll.com/series/GY8VEQ95Y/attack-on-titan',
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2013-04-07T00:00:00Z',
  },
  {
    id: 'crunchyroll-demon-slayer',
    title: 'Demon Slayer',
    description: 'After his family is slaughtered by demons and his sister is turned into one, Tanjiro Kamado embarks on a journey to become a demon slayer and find a cure for his sister. Stunning animation by ufotable.',
    year: 2019,
    duration: '24m per ep',
    durationSeconds: 1440,
    genres: ['Anime', 'Action', 'Fantasy', 'Supernatural'],
    rating: 8.9,
    quality: '1080p',
    poster: 'https://img1.ak.crunchyroll.com/i/spire1/3c5f39e2c4c0f26e5e4a5a4a5a5a5a5a5a5a5a5a_full.jpg',
    backdrop: 'https://img1.ak.crunchyroll.com/i/spire1/3c5f39e2c4c0f26e5e4a5a4a5a5a5a5a5a5a5a5a_full.jpg',
    source: 'crunchyroll',
    sourceUrl: 'https://www.crunchyroll.com/series/GY5P48XEY/demon-slayer-kimetsu-no-yaiba',
    sourceLicense: 'Free with Ads',
    videoUrl: 'https://www.crunchyroll.com/series/GY5P48XEY/demon-slayer-kimetsu-no-yaiba',
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [{ code: 'en', label: 'English', isDefault: true }],
    is4K: false,
    isFree: true,
    addedAt: '2019-04-06T00:00:00Z',
  },
  {
    id: 'crunchyroll-jujutsu-kaisen',
    title: 'Jujutsu Kaisen',
    description: 'A boy swallows a cursed talisman and becomes host to a powerful curse. He enrolls in a school of sorcerers to locate and consume the remaining fingers of the curse, allowing himself to be exorcised along with it.',
    year: 2020,
    duration: '24m per ep',
    durationSeconds: 1440,
    genres: ['Anime', 'Action', 'Supernatural', 'Dark Fantasy'],
    rating: 8.7,
    quality: '1080p',
    poster: 'https://img1.ak.crunchyroll.com/i/spire2/45c5c5e2c4c0f26e5e4a5a4a5a5a5a5a5a5a5a5a_full.jpg',
    backdrop: 'https://img1.ak.crunchyroll.com/i/spire2/45c5c5e2c4c0f26e5e4a5a4a5a5a5a5a5a5a5a5a_full.jpg',
    source: 'crunchyroll',
    sourceUrl: 'https://www.crunchyroll.com/series/GY5P48XEY/jujutsu-kaisen',
    sourceLicense: 'Free with Ads',
    videoUrl: 'https://www.crunchyroll.com/series/GY5P48XEY/jujutsu-kaisen',
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [{ code: 'en', label: 'English', isDefault: true }],
    is4K: false,
    isFree: true,
    addedAt: '2020-10-03T00:00:00Z',
  },
  {
    id: 'crunchyroll-my-hero-academia',
    title: 'My Hero Academia',
    description: 'In a world where most people have super powers called "Quirks", a boy born without them dreams of becoming a superhero. He is scouted by the world\'s greatest hero who shares his power with him.',
    year: 2016,
    duration: '24m per ep',
    durationSeconds: 1440,
    genres: ['Anime', 'Action', 'Superhero', 'School'],
    rating: 8.4,
    quality: '1080p',
    poster: 'https://img1.ak.crunchyroll.com/i/spire3/55c5c5e2c4c0f26e5e4a5a4a5a5a5a5a5a5a5a5a_full.jpg',
    backdrop: 'https://img1.ak.crunchyroll.com/i/spire3/55c5c5e2c4c0f26e5e4a5a4a5a5a5a5a5a5a5a5a_full.jpg',
    source: 'crunchyroll',
    sourceUrl: 'https://www.crunchyroll.com/series/GY5P48XEY/my-hero-academia',
    sourceLicense: 'Free with Ads',
    videoUrl: 'https://www.crunchyroll.com/series/GY5P48XEY/my-hero-academia',
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [{ code: 'en', label: 'English', isDefault: true }],
    is4K: false,
    isFree: true,
    addedAt: '2016-04-03T00:00:00Z',
  },
  {
    id: 'crunchyroll-death-note',
    title: 'Death Note',
    description: 'A high school student discovers a supernatural notebook that allows him to kill anyone whose name he writes in it. He begins a crusade against criminals, but a genius detective pursues him.',
    year: 2006,
    duration: '24m per ep',
    durationSeconds: 1440,
    genres: ['Anime', 'Thriller', 'Mystery', 'Supernatural'],
    rating: 9.0,
    quality: '1080p',
    poster: 'https://img1.ak.crunchyroll.com/i/spire4/65c5c5e2c4c0f26e5e4a5a4a5a5a5a5a5a5a5a5a_full.jpg',
    backdrop: 'https://img1.ak.crunchyroll.com/i/spire4/65c5c5e2c4c0f26e5e4a5a4a5a5a5a5a5a5a5a5a_full.jpg',
    source: 'crunchyroll',
    sourceUrl: 'https://www.crunchyroll.com/series/GY5P48XEY/death-note',
    sourceLicense: 'Free with Ads',
    videoUrl: 'https://www.crunchyroll.com/series/GY5P48XEY/death-note',
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [{ code: 'en', label: 'English', isDefault: true }],
    is4K: false,
    isFree: true,
    addedAt: '2006-10-04T00:00:00Z',
  },
];

export async function fetchCrunchyrollMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-crunchyroll-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const movies = [...CURATED_ANIME];
  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}

export async function searchCrunchyrollMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  return CURATED_ANIME.filter(m =>
    m.title.toLowerCase().includes(q) ||
    m.genres.some(g => g.toLowerCase().includes(q)) ||
    m.description.toLowerCase().includes(q)
  );
}
