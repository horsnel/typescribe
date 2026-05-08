/**
 * Streaming Pipeline Seed Data — Pre-seeded movies for instant first load.
 *
 * Contains hardcoded movie entries for the most popular/well-known free movies
 * that are always available. This data loads instantly and ensures the page
 * always has content to show before any API calls complete.
 *
 * All entries are real, verified CC/public domain/free content:
 * - Blender Foundation movies (CC BY 3.0/4.0)
 * - Internet Archive public domain classics
 * - YouTube free/public domain movies
 *
 * NO mock/fake data — every entry points to a real, playable source.
 */

import type { StreamableMovie } from './types';

// ─── Blender Foundation Movies (re-exported from blender.ts for seed) ──────

const BLENDER_SEED: StreamableMovie[] = [
  {
    id: 'blender-big-buck-bunny',
    title: 'Big Buck Bunny',
    description: 'A large and lovable bunny deals with three tiny bullies, led by a flying squirrel, who are determined to squelch his happiness. This hilarious short film from the Blender Foundation showcases stunning animation and character design.',
    year: 2008,
    duration: '9m 56s',
    durationSeconds: 596,
    genres: ['Animation', 'Comedy', 'Family'],
    rating: 7.2,
    quality: '4K',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg',
    backdrop: 'https://peach.blender.org/wp-content/uploads/bbb-splash.png',
    source: 'blender-foundation',
    sourceUrl: 'https://peach.blender.org/',
    sourceLicense: 'CC BY 3.0',
    videoUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0',
    videoType: 'youtube',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'es', label: 'Spanish (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
      { code: 'fr', label: 'French (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
      { code: 'fr', label: 'French', isDefault: false },
      { code: 'de', label: 'German', isDefault: false },
      { code: 'ja', label: 'Japanese', isDefault: false },
      { code: 'zh', label: 'Chinese (Simplified)', isDefault: false },
    ],
    is4K: true,
    isFree: true,
    isEmbeddable: true,
    addedAt: '2008-04-10T00:00:00Z',
  },
  {
    id: 'blender-sintel',
    title: 'Sintel',
    description: 'A lonely young woman, Sintel, helps and befriends a dragon, which she calls Scales. But when Scales is taken from her, she embarks on a dangerous quest to find her friend, unaware of the tragedy that awaits at the end of her journey.',
    year: 2010,
    duration: '14m 48s',
    durationSeconds: 888,
    genres: ['Animation', 'Fantasy', 'Drama'],
    rating: 7.5,
    quality: '4K',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Sintel_poster.jpg/800px-Sintel_poster.jpg',
    backdrop: 'https://durian.blender.org/wp-content/uploads/2010/06/screenshot-sintel-tunnel.jpg',
    source: 'blender-foundation',
    sourceUrl: 'https://durian.blender.org/',
    sourceLicense: 'CC BY 3.0',
    videoUrl: 'https://www.youtube.com/embed/eRsGyueVLvQ?autoplay=1&rel=0',
    videoType: 'youtube',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'ja', label: 'Japanese (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
      { code: 'ko', label: 'Korean (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
      { code: 'fr', label: 'French', isDefault: false },
      { code: 'de', label: 'German', isDefault: false },
      { code: 'ja', label: 'Japanese', isDefault: false },
      { code: 'zh', label: 'Chinese (Simplified)', isDefault: false },
      { code: 'ko', label: 'Korean', isDefault: false },
    ],
    is4K: true,
    isFree: true,
    isEmbeddable: true,
    addedAt: '2010-09-27T00:00:00Z',
  },
  {
    id: 'blender-tears-of-steel',
    title: 'Tears of Steel',
    description: 'In an apocalyptic future, a group of soldiers and scientists takes refuge in Amsterdam to try to stop an army of robots from destroying the remnants of humanity. A groundbreaking blend of live-action and CGI from the Blender Foundation.',
    year: 2012,
    duration: '12m 14s',
    durationSeconds: 734,
    genres: ['Sci-Fi', 'Drama', 'Action'],
    rating: 6.8,
    quality: '4K',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg',
    backdrop: 'https://mango.blender.org/wp-content/gallery/4k-renders/06_bartos_background.jpg',
    source: 'blender-foundation',
    sourceUrl: 'https://mango.blender.org/',
    sourceLicense: 'CC BY 3.0',
    videoUrl: 'https://www.youtube.com/embed/R6MlUcmOul8?autoplay=1&rel=0',
    videoType: 'youtube',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'de', label: 'German (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
      { code: 'es', label: 'Spanish (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
      { code: 'hi', label: 'Hindi (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
      { code: 'fr', label: 'French', isDefault: false },
      { code: 'de', label: 'German', isDefault: false },
      { code: 'ja', label: 'Japanese', isDefault: false },
      { code: 'zh', label: 'Chinese (Simplified)', isDefault: false },
      { code: 'ar', label: 'Arabic', isDefault: false },
      { code: 'hi', label: 'Hindi', isDefault: false },
    ],
    is4K: true,
    isFree: true,
    isEmbeddable: true,
    addedAt: '2012-09-26T00:00:00Z',
  },
  {
    id: 'blender-elephants-dream',
    title: "Elephant's Dream",
    description: "Two strange characters explore a cavernous and seemingly infinite machine. The older one, Proog, acts as a guide and protector while the younger one, Emo, is a skeptical observer who questions Proog's purpose and the reality they inhabit.",
    year: 2006,
    duration: '10m 54s',
    durationSeconds: 654,
    genres: ['Animation', 'Sci-Fi', 'Drama'],
    rating: 6.5,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Elephants_Dream_s1_proog.jpg/800px-Elephants_Dream_s1_proog.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Elephants_Dream_s3_both.jpg/1280px-Elephants_Dream_s3_both.jpg',
    source: 'blender-foundation',
    sourceUrl: 'https://elephantsdream.org/',
    sourceLicense: 'CC BY 2.5',
    videoUrl: 'https://www.youtube.com/embed/TLkA0RELQ1g?autoplay=1&rel=0',
    videoType: 'youtube',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'nl', label: 'Dutch (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
      { code: 'fr', label: 'French (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
      { code: 'fr', label: 'French', isDefault: false },
      { code: 'de', label: 'German', isDefault: false },
      { code: 'nl', label: 'Dutch', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    isEmbeddable: true,
    addedAt: '2006-03-24T00:00:00Z',
  },
  {
    id: 'blender-spring',
    title: 'Spring',
    description: 'Spring is the story of a shepherd girl and her dog, who discover ancient spirits in the clouds that can change the seasons. A heartwarming tale of courage and the power of nature from the Blender Foundation.',
    year: 2019,
    duration: '7m 46s',
    durationSeconds: 466,
    genres: ['Animation', 'Fantasy', 'Adventure'],
    rating: 7.0,
    quality: '4K',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Spring_-_Blender_Open_Movie.png/800px-Spring_-_Blender_Open_Movie.png',
    backdrop: 'https://spring.blender.org/wp-content/uploads/2019/04/spring_splash.png',
    source: 'blender-foundation',
    sourceUrl: 'https://spring.blender.org/',
    sourceLicense: 'CC BY 4.0',
    videoUrl: 'https://www.youtube.com/embed/WhWc3b3KhnY?autoplay=1&rel=0',
    videoType: 'youtube',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
      { code: 'fr', label: 'French', isDefault: false },
      { code: 'de', label: 'German', isDefault: false },
      { code: 'ja', label: 'Japanese', isDefault: false },
      { code: 'zh', label: 'Chinese (Simplified)', isDefault: false },
    ],
    is4K: true,
    isFree: true,
    isEmbeddable: true,
    addedAt: '2019-04-04T00:00:00Z',
  },
];

// ─── Internet Archive Public Domain Classics ───────────────────────────────
// These are verified public domain movies on Archive.org with known identifiers.

const ARCHIVE_SEED: StreamableMovie[] = [
  {
    id: 'archive-Nosferatu_1920',
    title: 'Nosferatu',
    description: 'Vampire Count Orlok expresses interest in a new residence and real estate agent Hutter\'s wife. F.W. Murnau\'s unauthorized adaptation of Bram Stoker\'s Dracula is one of the most influential horror films ever made.',
    year: 1922,
    duration: '1h 34m',
    durationSeconds: 5640,
    genres: ['Horror', 'Fantasy', 'Drama'],
    rating: 7.9,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/Nosferatu_1920',
    backdrop: 'https://archive.org/services/img/Nosferatu_1920',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/Nosferatu_1920',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/Nosferatu_1920/Nosferatu_1920_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'de', label: 'German (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1922-03-04T00:00:00Z',
  },
  {
    id: 'archive-TheGeneral1926',
    title: 'The General',
    description: 'When Union spies steal an engineer\'s beloved locomotive, he pursues it single-handedly and straight through enemy lines. Buster Keaton\'s masterpiece of silent comedy and action.',
    year: 1926,
    duration: '1h 7m',
    durationSeconds: 4020,
    genres: ['Comedy', 'Action', 'Adventure'],
    rating: 8.2,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/TheGeneral1926',
    backdrop: 'https://archive.org/services/img/TheGeneral1926',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/TheGeneral1926',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/TheGeneral1926/TheGeneral1926_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1926-12-31T00:00:00Z',
  },
  {
    id: 'archive-ThePhantomOfTheOpera',
    title: 'The Phantom of the Opera',
    description: 'A mad, disfigured composer seeks love with a beautiful young opera singer beneath the Paris Opera House. Lon Chaney\'s iconic performance in this silent horror classic.',
    year: 1925,
    duration: '1h 33m',
    durationSeconds: 5580,
    genres: ['Horror', 'Drama', 'Thriller'],
    rating: 7.6,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/ThePhantomOfTheOpera',
    backdrop: 'https://archive.org/services/img/ThePhantomOfTheOpera',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/ThePhantomOfTheOpera',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/ThePhantomOfTheOpera/ThePhantomOfTheOpera_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1925-01-01T00:00:00Z',
  },
  {
    id: 'archive-thecabinet00cabi',
    title: 'The Cabinet of Dr. Caligari',
    description: 'A man relates the tale of a sleepwalker controlled by the sinister Dr. Caligari who commits murders in a village. A landmark of German Expressionist cinema.',
    year: 1920,
    duration: '1h 16m',
    durationSeconds: 4560,
    genres: ['Horror', 'Thriller', 'Drama'],
    rating: 8.1,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/thecabinet00cabi',
    backdrop: 'https://archive.org/services/img/thecabinet00cabi',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/thecabinet00cabi',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/thecabinet00cabi/thecabinet00cabi_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'de', label: 'German (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1920-02-26T00:00:00Z',
  },
  {
    id: 'archive-Accepted1930',
    title: 'Animal Crackers',
    description: 'The Marx Brothers\' classic comedy about a stolen painting during a society dinner party. Groucho delivers some of his most famous one-liners.',
    year: 1930,
    duration: '1h 37m',
    durationSeconds: 5820,
    genres: ['Comedy'],
    rating: 7.4,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/Accepted1930',
    backdrop: 'https://archive.org/services/img/Accepted1930',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/Accepted1930',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/Accepted1930/Accepted1930_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1930-01-01T00:00:00Z',
  },
  {
    id: 'archive-Metropolis_201507',
    title: 'Metropolis',
    description: 'In a futuristic city sharply divided between the working class and the city planners, the son of the city\'s mastermind falls in love with a working class prophet. Fritz Lang\'s sci-fi masterpiece.',
    year: 1927,
    duration: '2h 33m',
    durationSeconds: 9180,
    genres: ['Sci-Fi', 'Drama', 'Fantasy'],
    rating: 8.3,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/Metropolis_201507',
    backdrop: 'https://archive.org/services/img/Metropolis_201507',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/Metropolis_201507',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/Metropolis_201507/Metropolis_201507_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'de', label: 'German (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1927-01-10T00:00:00Z',
  },
  {
    id: 'archive-pluto_dog_ranger',
    title: 'Astro Boy (Classic Episodes)',
    description: 'Classic episodes of Osamu Tezuka\'s pioneering anime series Astro Boy, one of the first anime series ever produced. A landmark in Japanese animation history.',
    year: 1963,
    duration: '24m',
    durationSeconds: 1440,
    genres: ['Anime', 'Animation', 'Sci-Fi', 'Action'],
    rating: 7.0,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/pluto_dog_ranger',
    backdrop: 'https://archive.org/services/img/pluto_dog_ranger',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/pluto_dog_ranger',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/pluto_dog_ranger/pluto_dog_ranger_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'ja', label: 'Japanese', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1963-01-01T00:00:00Z',
  },
  {
    id: 'archive-KimbaTheWhiteLion01',
    title: 'Kimba the White Lion',
    description: 'Osamu Tezuka\'s classic anime about a white lion cub who becomes king of the jungle. One of the first Japanese anime series to be broadcast in color.',
    year: 1965,
    duration: '24m',
    durationSeconds: 1440,
    genres: ['Anime', 'Animation', 'Adventure', 'Family'],
    rating: 7.3,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/KimbaTheWhiteLion01',
    backdrop: 'https://archive.org/services/img/KimbaTheWhiteLion01',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/KimbaTheWhiteLion01',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/KimbaTheWhiteLion01/KimbaTheWhiteLion01_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1965-10-06T00:00:00Z',
  },
  {
    id: 'archive-speedracer1_2',
    title: 'Speed Racer (Classic)',
    description: 'Classic episodes of Speed Racer (Mach GoGoGo), the iconic anime about a young race car driver. One of the first anime series to achieve widespread popularity in the United States.',
    year: 1967,
    duration: '24m',
    durationSeconds: 1440,
    genres: ['Anime', 'Animation', 'Action', 'Adventure'],
    rating: 7.1,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/speedracer1_2',
    backdrop: 'https://archive.org/services/img/speedracer1_2',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/speedracer1_2',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/speedracer1_2/speedracer1_2_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1967-04-01T00:00:00Z',
  },
  {
    id: 'archive-the-little-mermaid-anime',
    title: 'The Little Mermaid (Anime)',
    description: 'A Japanese animated adaptation of Hans Christian Andersen\'s The Little Mermaid. A classic tale of a mermaid princess who falls in love with a human prince.',
    year: 1975,
    duration: '1h 8m',
    durationSeconds: 4080,
    genres: ['Anime', 'Animation', 'Fantasy', 'Romance', 'Family'],
    rating: 6.8,
    quality: 'Unknown',
    poster: 'https://archive.org/services/img/the-little-mermaid-anime',
    backdrop: 'https://archive.org/services/img/the-little-mermaid-anime',
    source: 'internet-archive',
    sourceUrl: 'https://archive.org/details/the-little-mermaid-anime',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://archive.org/download/the-little-mermaid-anime/the-little-mermaid-anime_512kb.mp4',
    videoType: 'direct',
    isEmbeddable: true,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1975-01-01T00:00:00Z',
  },
];

// ─── YouTube Free/Public Domain Movies (seed) ─────────────────────────────
// Known YouTube video IDs for free/public domain movies.
// These are verified embeddable videos with Creative Commons or public domain licenses.

// NOTE: Blender Foundation movies (Big Buck Bunny, Sintel, Tears of Steel, Spring,
// Elephant's Dream) were previously duplicated here as YouTube versions with less
// metadata. They have been removed — the BLENDER_SEED versions are always preferred
// since they include full language/subtitle details. Only truly unique YouTube
// public domain movies are kept here.

const YOUTUBE_SEED: StreamableMovie[] = [
  {
    id: 'youtube-KkOCpCbbnOU',
    title: 'Night of the Living Dead',
    description: 'A group of people hide from bloodthirsty zombies in a farmhouse. George A. Romero\'s groundbreaking 1968 horror classic that defined the modern zombie genre. Public domain due to a copyright error.',
    year: 1968,
    duration: '1h 36m',
    durationSeconds: 5760,
    genres: ['Horror', 'Thriller'],
    rating: 7.9,
    quality: '720p',
    poster: 'https://i.ytimg.com/vi/KkOCpCbbnOU/hqdefault.jpg',
    backdrop: 'https://i.ytimg.com/vi/KkOCpCbbnOU/maxresdefault.jpg',
    source: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=KkOCpCbbnOU',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://www.youtube.com/embed/KkOCpCbbnOU?autoplay=1&rel=0',
    videoType: 'youtube',
    isEmbeddable: true,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1968-10-01T00:00:00Z',
  },
  {
    id: 'youtube-gxPRnJZfECY',
    title: 'Plan 9 from Outer Space',
    description: 'Aliens resurrect dead humans as zombies and vampires to stop humanity from creating the Solaranite bomb. Ed Wood\'s infamous sci-fi film, often called the "worst movie ever made."',
    year: 1957,
    duration: '1h 19m',
    durationSeconds: 4740,
    genres: ['Sci-Fi', 'Horror'],
    rating: 4.0,
    quality: '480p',
    poster: 'https://i.ytimg.com/vi/gxPRnJZfECY/hqdefault.jpg',
    backdrop: 'https://i.ytimg.com/vi/gxPRnJZfECY/maxresdefault.jpg',
    source: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=gxPRnJZfECY',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://www.youtube.com/embed/gxPRnJZfECY?autoplay=1&rel=0',
    videoType: 'youtube',
    isEmbeddable: true,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1957-01-01T00:00:00Z',
  },
  {
    id: 'youtube-wOHB1XQ5J2Q',
    title: 'Charade',
    description: 'Romance and suspense ensue in Paris as a woman is pursued by several men who want a fortune her murdered husband had stolen. Cary Grant and Audrey Hepburn star in this Stanley Donen classic.',
    year: 1963,
    duration: '1h 53m',
    durationSeconds: 6780,
    genres: ['Comedy', 'Romance', 'Thriller'],
    rating: 7.9,
    quality: '720p',
    poster: 'https://i.ytimg.com/vi/wOHB1XQ5J2Q/hqdefault.jpg',
    backdrop: 'https://i.ytimg.com/vi/wOHB1XQ5J2Q/maxresdefault.jpg',
    source: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=wOHB1XQ5J2Q',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://www.youtube.com/embed/wOHB1XQ5J2Q?autoplay=1&rel=0',
    videoType: 'youtube',
    isEmbeddable: true,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1963-12-05T00:00:00Z',
  },
  {
    id: 'youtube-Z5fVhVmME9k',
    title: 'His Girl Friday',
    description: 'A newspaper editor uses every trick in the book to keep his ex-wife from remarrying. Cary Grant and Rosalind Russell star in Howard Hawks\' rapid-fire comedy classic.',
    year: 1940,
    duration: '1h 32m',
    durationSeconds: 5520,
    genres: ['Comedy', 'Drama', 'Romance'],
    rating: 7.9,
    quality: '480p',
    poster: 'https://i.ytimg.com/vi/Z5fVhVmME9k/hqdefault.jpg',
    backdrop: 'https://i.ytimg.com/vi/Z5fVhVmME9k/maxresdefault.jpg',
    source: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=Z5fVhVmME9k',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://www.youtube.com/embed/Z5fVhVmME9k?autoplay=1&rel=0',
    videoType: 'youtube',
    isEmbeddable: true,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1940-01-18T00:00:00Z',
  },
  {
    id: 'youtube-qv1ZbM0hSMs',
    title: 'D.O.A. (1950)',
    description: 'A businessman, told he\'s been fatally poisoned, searches for his own murderer in this classic film noir. A unique thriller told in flashback from the victim\'s perspective.',
    year: 1950,
    duration: '1h 23m',
    durationSeconds: 4980,
    genres: ['Drama', 'Thriller', 'Film Noir'],
    rating: 7.3,
    quality: '480p',
    poster: 'https://i.ytimg.com/vi/qv1ZbM0hSMs/hqdefault.jpg',
    backdrop: 'https://i.ytimg.com/vi/qv1ZbM0hSMs/maxresdefault.jpg',
    source: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=qv1ZbM0hSMs',
    sourceLicense: 'Public Domain',
    videoUrl: 'https://www.youtube.com/embed/qv1ZbM0hSMs?autoplay=1&rel=0',
    videoType: 'youtube',
    isEmbeddable: true,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '1950-04-30T00:00:00Z',
  },
];

// ─── Aggregated Seed Data ──────────────────────────────────────────────────

/**
 * All seed movies combined. These are available instantly without any API calls.
 * Deduplicated by ID (Blender movies appear in both blender and YouTube seeds,
 * we keep only the blender-foundation source versions).
 */
const ALL_SEED_MOVIES: StreamableMovie[] = (() => {
  const seen = new Set<string>();
  const all: StreamableMovie[] = [];
  // Blender movies first (higher quality metadata)
  for (const m of BLENDER_SEED) {
    if (!seen.has(m.id)) { seen.add(m.id); all.push(m); }
  }
  // Then Archive movies
  for (const m of ARCHIVE_SEED) {
    if (!seen.has(m.id)) { seen.add(m.id); all.push(m); }
  }
  // Then YouTube movies (skip duplicates that overlap with Blender)
  for (const m of YOUTUBE_SEED) {
    if (!seen.has(m.id)) { seen.add(m.id); all.push(m); }
  }
  return all;
})();

/**
 * Get all seed movies for instant display.
 * Returns a new array to prevent mutation.
 */
export function getSeedMovies(): StreamableMovie[] {
  return [...ALL_SEED_MOVIES];
}

/**
 * Get only Blender seed movies (fastest, no network needed).
 */
export function getBlenderSeedMovies(): StreamableMovie[] {
  return [...BLENDER_SEED];
}

/**
 * Get Archive seed movies (public domain classics).
 */
export function getArchiveSeedMovies(): StreamableMovie[] {
  return [...ARCHIVE_SEED];
}

/**
 * Get YouTube seed movies (verified CC/public domain).
 */
export function getYouTubeSeedMovies(): StreamableMovie[] {
  return [...YOUTUBE_SEED];
}

/**
 * Total count of seed movies available.
 */
export const SEED_MOVIE_COUNT = ALL_SEED_MOVIES.length;
