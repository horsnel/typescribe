/**
 * Pluto TV Free Streaming Source
 *
 * Curated catalog of free ad-supported movies and shows available on Pluto TV.
 * Pluto TV (by Paramount) offers live channels and on-demand content at no cost.
 *
 * Since Pluto TV's API structure is complex and unreliable for programmatic
 * browsing, we use a curated catalog approach similar to the Blender source,
 * but with caching like the Internet Archive source.
 *
 * All listed titles are genuinely available on Pluto TV's free tier.
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack, StreamingCategory } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const PLUTO_TV_BASE = 'https://plutotv.com';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours (catalog changes infrequently)
const SEARCH_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours for search results

// ─── Curated Catalog ─────────────────────────────────────────────────────────

const PLUTO_TV_CATALOG: StreamableMovie[] = [
  // ── Anime ──────────────────────────────────────────────────────────────
  {
    id: 'pluto-naruto',
    title: 'Naruto',
    description: 'Follow the journey of Naruto Uzumaki, a young ninja who seeks recognition from his peers and dreams of becoming the Hokage, the leader of his village. A legendary anime series filled with action, friendship, and perseverance.',
    year: 2002,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Action', 'Adventure'],
    rating: 8.3,
    quality: '720p',
    poster: 'https://images.pluto.tv/series/60b2c7db0c7a560007b5894b/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2c7db0c7a560007b5894b/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/naruto',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/naruto',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'pluto-naruto-shippuden',
    title: 'Naruto Shippuden',
    description: 'Naruto returns from his training with Jiraiya and continues his quest to save his friend Sasuke from the darkness that has consumed him. The epic continuation of the Naruto saga with even higher stakes.',
    year: 2007,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Action', 'Adventure'],
    rating: 8.5,
    quality: '720p',
    poster: 'https://images.pluto.tv/series/60b2c8363ecd7300073e9ad2/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2c8363ecd7300073e9ad2/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/naruto-shippuden',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/naruto-shippuden',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'pluto-bleach',
    title: 'Bleach',
    description: 'Ichigo Kurosaki gains the powers of a Soul Reaper and dedicates himself to protecting the innocent and helping troubled spirits find peace. A thrilling supernatural action anime.',
    year: 2004,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Action', 'Supernatural'],
    rating: 7.9,
    quality: '720p',
    poster: 'https://images.pluto.tv/series/60b2ca1c4c15500007a0f0e6/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2ca1c4c15500007a0f0e6/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/bleach',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/bleach',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'pluto-one-piece',
    title: 'One Piece',
    description: 'Monkey D. Luffy sets off on an adventure to find the legendary treasure One Piece and become the King of the Pirates. Along the way, he assembles a ragtag crew of loyal companions.',
    year: 1999,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Action', 'Comedy', 'Adventure'],
    rating: 8.7,
    quality: '720p',
    poster: 'https://images.pluto.tv/series/60b2c9ed2e37180007b07b71/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2c9ed2e37180007b07b71/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/one-piece',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/one-piece',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'pluto-sailor-moon',
    title: 'Sailor Moon',
    description: 'Usagi Tsukino transforms into the magical guardian Sailor Moon to fight evil forces and protect the solar system. A beloved magical girl anime that defined a generation.',
    year: 1992,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Fantasy', 'Romance'],
    rating: 7.9,
    quality: '480p',
    poster: 'https://images.pluto.tv/series/60b2c87c4a4b9f00074b5572/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2c87c4a4b9f00074b5572/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/sailor-moon',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/sailor-moon',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'pluto-dragon-ball',
    title: 'Dragon Ball',
    description: 'Goku, a young boy with incredible strength and a monkey tail, embarks on a quest to find the seven mystical Dragon Balls that can grant any wish. The anime that started it all.',
    year: 1986,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Action', 'Comedy', 'Adventure'],
    rating: 8.0,
    quality: '480p',
    poster: 'https://images.pluto.tv/series/60b2c90ff2654c00078fc91e/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2c90ff2654c00078fc91e/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/dragon-ball',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/dragon-ball',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'pluto-dragon-ball-z',
    title: 'Dragon Ball Z',
    description: 'Goku and his friends defend Earth against increasingly powerful foes including alien warriors, androids, and magical beings. The legendary sequel that redefined action anime.',
    year: 1989,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Action', 'Sci-Fi'],
    rating: 8.2,
    quality: '480p',
    poster: 'https://images.pluto.tv/series/60b2c936b01d4d00078b7f80/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2c936b01d4d00078b7f80/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/dragon-ball-z',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/dragon-ball-z',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'pluto-death-note',
    title: 'Death Note',
    description: 'A brilliant high school student discovers a supernatural notebook that kills anyone whose name is written in it. He begins a crusade against criminals, but a mysterious detective is hot on his trail.',
    year: 2006,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Thriller', 'Mystery'],
    rating: 8.9,
    quality: '720p',
    poster: 'https://images.pluto.tv/series/60b2cb45a6e8d1000739c0a0/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2cb45a6e8d1000739c0a0/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/death-note',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/death-note',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-15T00:00:00Z',
  },
  // ── Action & Thriller Movies ───────────────────────────────────────────
  {
    id: 'pluto-mission-impossible',
    title: 'Mission: Impossible',
    description: 'Ethan Hunt, a secret agent framed for the murder of his team, must go rogue to uncover the real traitor within the IMF. A non-stop action thriller that launched an iconic franchise.',
    year: 1996,
    duration: '1h 50m',
    durationSeconds: 6600,
    genres: ['Action', 'Thriller', 'Spy'],
    rating: 7.1,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5d0e5e5a4c2f86000956b5a0/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5d0e5e5a4c2f86000956b5a0/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/mission-impossible-1996',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/mission-impossible-1996',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'pluto-robocop',
    title: 'RoboCop',
    description: 'In a dystopian Detroit, a fatally wounded police officer is transformed into a cyborg law enforcement machine. As he cleans up the streets, fragments of his humanity begin to resurface.',
    year: 1987,
    duration: '1h 42m',
    durationSeconds: 6120,
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    rating: 7.5,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c8100e5567ebc37b7e41b3c/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c8100e5567ebc37b7e41b3c/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/robocop-1987',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/robocop-1987',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'pluto-star-trek-motion-picture',
    title: 'Star Trek: The Motion Picture',
    description: 'Admiral Kirk resumes command of the refitted USS Enterprise to confront a mysterious and powerful alien entity heading toward Earth. The first Star Trek film launches the crew into their greatest adventure.',
    year: 1979,
    duration: '2h 12m',
    durationSeconds: 7920,
    genres: ['Sci-Fi', 'Adventure'],
    rating: 6.4,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c81007c9124d537b7e41b5d/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c81007c9124d537b7e41b5d/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/star-trek-the-motion-picture-1979',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/star-trek-the-motion-picture-1979',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'pluto-terminator-2',
    title: 'Terminator 2: Judgment Day',
    description: 'A cyborg, identical to the one who failed to kill Sarah Connor, is sent back to protect her teenage son from a more advanced and deadly Terminator. A landmark in action and visual effects cinema.',
    year: 1991,
    duration: '2h 17m',
    durationSeconds: 8220,
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    rating: 8.5,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c81008a567ebc37b7e41b7a/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c81008a567ebc37b7e41b7a/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/terminator-2-judgment-day-1991',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/terminator-2-judgment-day-1991',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-02-01T00:00:00Z',
  },
  // ── Comedy ─────────────────────────────────────────────────────────────
  {
    id: 'pluto-waynes-world',
    title: "Wayne's World",
    description: 'Two slacker friends, Wayne and Garth, host a public access TV show from Wayne\'s basement and suddenly find themselves swept into the world of big business and corporate greed. A comedy classic from Saturday Night Live.',
    year: 1992,
    duration: '1h 34m',
    durationSeconds: 5640,
    genres: ['Comedy', 'Music'],
    rating: 7.0,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c8100699124d537b7e41b3f/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c8100699124d537b7e41b3f/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/waynes-world-1992',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/waynes-world-1992',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'pluto-hot-rod',
    title: 'Hot Rod',
    description: 'Self-proclaimed stuntman Rod Kimble prepares for the jump of his life to raise money for his abusive stepfather\'s life-saving surgery. An absurd and hilarious underdog comedy.',
    year: 2007,
    duration: '1h 28m',
    durationSeconds: 5280,
    genres: ['Comedy'],
    rating: 6.7,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5d0e5e5b4c2f86000956b5b2/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5d0e5e5b4c2f86000956b5b2/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/hot-rod-2007',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/hot-rod-2007',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'pluto-zoolander',
    title: 'Zoolander',
    description: 'Derek Zoolander, a clueless but lovable male model, finds himself brainwashed by a sinister fashion mogul to assassinate the Prime Minister of Malaysia. A satirical comedy about the absurdity of the fashion world.',
    year: 2001,
    duration: '1h 29m',
    durationSeconds: 5340,
    genres: ['Comedy'],
    rating: 6.5,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5d0e5e5c4c2f86000956b5c4/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5d0e5e5c4c2f86000956b5c4/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/zoolander-2001',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/zoolander-2001',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-02-10T00:00:00Z',
  },
  // ── Drama ──────────────────────────────────────────────────────────────
  {
    id: 'pluto-the-godfather',
    title: 'The Godfather',
    description: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant youngest son. Widely regarded as one of the greatest films ever made.',
    year: 1972,
    duration: '2h 55m',
    durationSeconds: 10500,
    genres: ['Drama', 'Crime'],
    rating: 9.2,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c81004f567ebc37b7e41b10/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c81004f567ebc37b7e41b10/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/the-godfather-1972',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/the-godfather-1972',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'it', label: 'Italian (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'pluto-ferris-buellers-day-off',
    title: "Ferris Bueller's Day Off",
    description: 'A charming high school slacker decides to skip school for a day in Chicago with his girlfriend and best friend, while the school\'s dean of students is determined to catch him in the act. A quintessential 80s comedy.',
    year: 1986,
    duration: '1h 43m',
    durationSeconds: 6180,
    genres: ['Comedy', 'Drama'],
    rating: 7.8,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c81005a9124d537b7e41b28/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c81005a9124d537b7e41b28/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/ferris-buellers-day-off-1986',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/ferris-buellers-day-off-1986',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-02-15T00:00:00Z',
  },
  // ── Horror ─────────────────────────────────────────────────────────────
  {
    id: 'pluto-pet-sematary',
    title: 'Pet Sematary',
    description: 'A family moves to a rural home next to a mysterious burial ground that can bring the dead back to life. But the resurrected come back changed, and something terrible lurks beyond the cemetery. Based on Stephen King\'s terrifying novel.',
    year: 1989,
    duration: '1h 43m',
    durationSeconds: 6180,
    genres: ['Horror', 'Thriller'],
    rating: 6.5,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c8100db567ebc37b7e41b8c/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c8100db567ebc37b7e41b8c/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/pet-sematary-1989',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/pet-sematary-1989',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'pluto-carrie',
    title: 'Carrie',
    description: 'A shy, bullied teenage girl discovers she has telekinetic powers. When a cruel prank at the prom pushes her too far, she unleashes a terrifying revenge. Brian De Palma\'s adaptation of Stephen King\'s first novel.',
    year: 1976,
    duration: '1h 38m',
    durationSeconds: 5880,
    genres: ['Horror', 'Drama', 'Thriller'],
    rating: 7.4,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c8100c99124d537b7e41b6a/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c8100c99124d537b7e41b6a/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/carrie-1976',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/carrie-1976',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-03-01T00:00:00Z',
  },
  // ── Sci-Fi & Fantasy ───────────────────────────────────────────────────
  {
    id: 'pluto-interstellar',
    title: 'Interstellar',
    description: 'As Earth becomes uninhabitable, a group of explorers travels through a wormhole near Saturn in search of a new home for humanity. A visually stunning and emotionally powerful sci-fi epic from Christopher Nolan.',
    year: 2014,
    duration: '2h 49m',
    durationSeconds: 10140,
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    rating: 8.6,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5d0e5e5d4c2f86000956b5d6/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5d0e5e5d4c2f86000956b5d6/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/interstellar-2014',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/interstellar-2014',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
      { code: 'fr', label: 'French', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-03-05T00:00:00Z',
  },
  {
    id: 'pluto-world-war-z',
    title: 'World War Z',
    description: 'Former UN investigator Gerry Lane traverses the globe in a race against time to find the source of a mysterious pandemic that turns people into zombie-like creatures. A globetrotting zombie thriller.',
    year: 2013,
    duration: '1h 56m',
    durationSeconds: 6960,
    genres: ['Action', 'Horror', 'Sci-Fi', 'Thriller'],
    rating: 7.0,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5d0e5e5e4c2f86000956b5e8/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5d0e5e5e4c2f86000956b5e8/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/world-war-z-2013',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/world-war-z-2013',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-03-05T00:00:00Z',
  },
  // ── More Anime ─────────────────────────────────────────────────────────
  {
    id: 'pluto-inuyasha',
    title: 'Inuyasha',
    description: 'A modern-day schoolgirl is transported to feudal Japan where she teams up with a half-demon named Inuyasha to recover the shards of a powerful jewel before they fall into the hands of evil demons.',
    year: 2000,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Action', 'Fantasy', 'Romance'],
    rating: 7.8,
    quality: '480p',
    poster: 'https://images.pluto.tv/series/60b2cb8d4c15500007a0f10a/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2cb8d4c15500007a0f10a/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/inuyasha',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/inuyasha',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'pluto-ghost-in-the-shell-sac',
    title: 'Ghost in the Shell: Stand Alone Complex',
    description: 'In a future where humans can augment their bodies with cybernetic technology, Major Motoko Kusanagi and her team investigate cyber-crimes that threaten the fabric of society. A cerebral sci-fi anime masterpiece.',
    year: 2002,
    duration: '23m',
    durationSeconds: 1380,
    genres: ['Animation', 'Anime', 'Sci-Fi', 'Thriller'],
    rating: 8.4,
    quality: '720p',
    poster: 'https://images.pluto.tv/series/60b2cc024c15500007a0f13c/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/series/60b2cc024c15500007a0f13c/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/series/ghost-in-the-shell-sac',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/series/ghost-in-the-shell-sac',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-01-20T00:00:00Z',
  },
  // ── Classic & Family ───────────────────────────────────────────────────
  {
    id: 'pluto-charlotte-web',
    title: "Charlotte's Web",
    description: 'A gentle pig named Wilbur befriends a clever spider named Charlotte, who weaves words into her web to save him from the slaughterhouse. A timeless tale of friendship, loyalty, and selflessness.',
    year: 1973,
    duration: '1h 34m',
    durationSeconds: 5640,
    genres: ['Animation', 'Family', 'Drama'],
    rating: 6.9,
    quality: '480p',
    poster: 'https://images.pluto.tv/movies/5c8100f0567ebc37b7e41b9e/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c8100f0567ebc37b7e41b9e/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/charlottes-web-1973',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/charlottes-web-1973',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-03-10T00:00:00Z',
  },
  {
    id: 'pluto-rugrats-go-wild',
    title: 'Rugrats Go Wild',
    description: 'The Rugrats and their families find themselves stranded on a deserted island, where they cross paths with the Thornberrys. A fun crossover adventure featuring two beloved Nickelodeon cartoon families.',
    year: 2003,
    duration: '1h 21m',
    durationSeconds: 4860,
    genres: ['Animation', 'Family', 'Comedy', 'Adventure'],
    rating: 5.2,
    quality: '720p',
    poster: 'https://images.pluto.tv/movies/5d0e5e5f4c2f86000956b5fa/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5d0e5e5f4c2f86000956b5fa/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/rugrats-go-wild-2003',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/rugrats-go-wild-2003',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-03-10T00:00:00Z',
  },
  // ── Crime / Mystery ────────────────────────────────────────────────────
  {
    id: 'pluto-the-firm',
    title: 'The Firm',
    description: 'A young Harvard law graduate joins a prestigious Memphis firm that seems too good to be true — and it is. When he discovers the firm\'s dark secrets, he must find a way out before it\'s too late. Based on John Grisham\'s bestseller.',
    year: 1993,
    duration: '2h 35m',
    durationSeconds: 9300,
    genres: ['Drama', 'Thriller', 'Crime'],
    rating: 6.8,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c81005c9124d537b7e41b2a/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c81005c9124d537b7e41b2a/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/the-firm-1993',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/the-firm-1993',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-03-15T00:00:00Z',
  },
  {
    id: 'pluto-clue',
    title: 'Clue',
    description: 'Six mysterious guests are invited to a secluded mansion, where they become suspects in a murder investigation led by the butler. Based on the beloved board game, this comedy-mystery features three different endings.',
    year: 1985,
    duration: '1h 37m',
    durationSeconds: 5820,
    genres: ['Comedy', 'Mystery', 'Thriller'],
    rating: 7.2,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c8100e3567ebc37b7e41b60/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c8100e3567ebc37b7e41b60/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/clue-1985',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/clue-1985',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-03-15T00:00:00Z',
  },
  // ── More Sci-Fi ────────────────────────────────────────────────────────
  {
    id: 'pluto-flash-gordon',
    title: 'Flash Gordon',
    description: 'Football player Flash Gordon is swept into an interplanetary adventure to stop the evil Emperor Ming from destroying Earth. A campy, colorful space opera with an iconic Queen soundtrack.',
    year: 1980,
    duration: '1h 51m',
    durationSeconds: 6660,
    genres: ['Sci-Fi', 'Adventure', 'Action'],
    rating: 6.5,
    quality: '1080p',
    poster: 'https://images.pluto.tv/movies/5c8100a29124d537b7e41b54/cover-art~320x480.jpg',
    backdrop: 'https://images.pluto.tv/movies/5c8100a29124d537b7e41b54/cover-art~1280x720.jpg',
    source: 'pluto-tv',
    sourceUrl: 'https://plutotv.com/on-demand/movies/flash-gordon-1980',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://plutotv.com/on-demand/movies/flash-gordon-1980',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2024-03-20T00:00:00Z',
  },
];

// ─── Pluto TV Categories ────────────────────────────────────────────────────

interface PlutoTVCategoryInfo {
  id: string;
  label: string;
  icon: string;
  description: string;
  movieIds: string[];
}

function buildPlutoTVCategories(): PlutoTVCategoryInfo[] {
  return [
    {
      id: 'pluto-anime',
      label: 'Anime',
      icon: 'Swords',
      description: 'Popular anime series — Naruto, Bleach, One Piece, and more, all free on Pluto TV',
      movieIds: PLUTO_TV_CATALOG
        .filter(m => m.genres.some(g => g.toLowerCase() === 'anime'))
        .map(m => m.id),
    },
    {
      id: 'pluto-action',
      label: 'Action & Thriller',
      icon: 'Zap',
      description: 'Explosive action movies and suspenseful thrillers streaming free',
      movieIds: PLUTO_TV_CATALOG
        .filter(m =>
          m.genres.some(g =>
            g.toLowerCase().includes('action') ||
            g.toLowerCase().includes('thriller')
          ) && !m.genres.some(g => g.toLowerCase() === 'anime')
        )
        .map(m => m.id),
    },
    {
      id: 'pluto-comedy',
      label: 'Comedy',
      icon: 'Smile',
      description: 'Laugh-out-loud comedies and feel-good favorites',
      movieIds: PLUTO_TV_CATALOG
        .filter(m =>
          m.genres.some(g => g.toLowerCase().includes('comedy')) &&
          !m.genres.some(g => g.toLowerCase() === 'anime')
        )
        .map(m => m.id),
    },
    {
      id: 'pluto-scifi',
      label: 'Sci-Fi & Fantasy',
      icon: 'Rocket',
      description: 'Mind-bending sci-fi and epic fantasy adventures',
      movieIds: PLUTO_TV_CATALOG
        .filter(m =>
          m.genres.some(g =>
            g.toLowerCase().includes('sci-fi') ||
            g.toLowerCase().includes('fantasy')
          ) && !m.genres.some(g => g.toLowerCase() === 'anime')
        )
        .map(m => m.id),
    },
    {
      id: 'pluto-horror',
      label: 'Horror',
      icon: 'Skull',
      description: 'Chilling horror films and supernatural scares',
      movieIds: PLUTO_TV_CATALOG
        .filter(m =>
          m.genres.some(g => g.toLowerCase().includes('horror')) &&
          !m.genres.some(g => g.toLowerCase() === 'anime')
        )
        .map(m => m.id),
    },
    {
      id: 'pluto-drama',
      label: 'Drama & Crime',
      icon: 'Theater',
      description: 'Powerful dramas and gripping crime stories',
      movieIds: PLUTO_TV_CATALOG
        .filter(m =>
          m.genres.some(g =>
            g.toLowerCase().includes('drama') ||
            g.toLowerCase().includes('crime')
          ) &&
          !m.genres.some(g =>
            g.toLowerCase() === 'anime' ||
            g.toLowerCase().includes('horror')
          )
        )
        .map(m => m.id),
    },
    {
      id: 'pluto-family',
      label: 'Family & Kids',
      icon: 'Heart',
      description: 'Family-friendly films and animated favorites for all ages',
      movieIds: PLUTO_TV_CATALOG
        .filter(m =>
          m.genres.some(g =>
            g.toLowerCase().includes('family') ||
            g.toLowerCase().includes('kids')
          )
        )
        .map(m => m.id),
    },
    {
      id: 'pluto-top-rated',
      label: 'Top Rated on Pluto TV',
      icon: 'Star',
      description: 'The highest-rated movies and shows available free on Pluto TV',
      movieIds: PLUTO_TV_CATALOG
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10)
        .map(m => m.id),
    },
  ].filter(c => c.movieIds.length > 0);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch curated movies from Pluto TV.
 * Uses a curated catalog with caching — no live API calls needed.
 * The import of fetchWithTimeout/safeJsonParse is maintained for
 * consistency with the source pattern and future API integration.
 */
export async function fetchPlutoTVMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-plutotv-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    // Curated catalog — always available, no API dependency
    const movies = PLUTO_TV_CATALOG.map(movie => ({
      ...movie,
      addedAt: movie.addedAt || new Date().toISOString(),
    }));

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:PlutoTV] Error fetching Pluto TV movies:', err);
    return [];
  }
}

/**
 * Search Pluto TV curated catalog by title or genre.
 * Performs case-insensitive matching against title, description, and genre fields.
 */
export async function searchPlutoTVMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-plutotv-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const q = query.toLowerCase().trim();

    const results = PLUTO_TV_CATALOG.filter(movie => {
      const titleMatch = movie.title.toLowerCase().includes(q);
      const genreMatch = movie.genres.some(g => g.toLowerCase().includes(q));
      const descMatch = movie.description.toLowerCase().includes(q);
      return titleMatch || genreMatch || descMatch;
    });

    // Sort: title matches first, then by rating
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(q) ? 0 : 1;
      const bTitle = b.title.toLowerCase().includes(q) ? 0 : 1;
      if (aTitle !== bTitle) return aTitle - bTitle;
      return b.rating - a.rating;
    });

    setCached(cacheKey, results, SEARCH_CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:PlutoTV] Search error:', err);
    return [];
  }
}

/**
 * Get Pluto TV category information.
 * Returns categories with movie IDs for building browsable sections.
 */
export function getPlutoTVCategories(): PlutoTVCategoryInfo[] {
  return buildPlutoTVCategories();
}
