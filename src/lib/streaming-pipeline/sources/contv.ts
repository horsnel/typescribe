/**
 * CONtv Free Genre Streaming Source
 *
 * Curated catalog of genre movies available on CONtv,
 * a free ad-supported streaming service specializing in horror,
 * sci-fi, anime, grindhouse, and cult films.
 *
 * Follows the same pattern as other streaming-pipeline sources:
 * - Imports fetchWithTimeout / safeJsonParse from resilience
 * - Uses getCached / setCached for caching with TTL
 * - Exports fetch and search functions returning StreamableMovie[]
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
const CONTV_BASE = 'https://contv.com';

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface CuratedContvMovie {
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
  languages: AudioLanguage[];
  subtitles: SubtitleTrack[];
  is4K: boolean;
  addedAt: string;
}

const CONTV_CATALOG: CuratedContvMovie[] = [
  {
    slug: 'carnival-of-souls',
    title: 'Carnival of Souls',
    description: 'After surviving a horrific car accident, organist Mary Henry is drawn to an abandoned lakeside pavilion and its ghostly inhabitants. As unsettling visions of a ghoulish man haunt her, Mary struggles to maintain her grip on reality while being pulled toward a terrifying world beyond the living. A landmark of independent horror cinema.',
    year: 1962,
    durationMinutes: 78,
    genres: ['Horror', 'Mystery', 'Drama'],
    rating: 7.1,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/carnival-of-souls.jpg',
    backdrop: 'https://contv.com/assets/backdrops/carnival-of-souls.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-01-01T00:00:00Z',
  },
  {
    slug: 'night-of-the-living-dead',
    title: 'Night of the Living Dead',
    description: 'A group of strangers barricade themselves in a rural Pennsylvania farmhouse as reanimated corpses begin attacking the living. As the night wears on and the dead multiply, tensions rise among the survivors in George A. Romero\'s groundbreaking film that defined the modern zombie genre and changed horror forever.',
    year: 1968,
    durationMinutes: 96,
    genres: ['Horror', 'Thriller'],
    rating: 7.9,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/night-of-the-living-dead.jpg',
    backdrop: 'https://contv.com/assets/backdrops/night-of-the-living-dead.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-01-15T00:00:00Z',
  },
  {
    slug: 'dementia-13',
    title: 'Dementia 13',
    description: 'In a remote Irish castle, the wealthy Haloran family gathers to mourn the death of the matriarch\'s youngest daughter. When a scheming widow infiltrates the family to claim her share of the inheritance, a mysterious axe-wielding killer begins stalking the castle\'s corridors. Francis Ford Coppola\'s directorial debut produced by Roger Corman.',
    year: 1963,
    durationMinutes: 75,
    genres: ['Horror', 'Thriller', 'Mystery'],
    rating: 5.7,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/dementia-13.jpg',
    backdrop: 'https://contv.com/assets/backdrops/dementia-13.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-02-01T00:00:00Z',
  },
  {
    slug: 'the-last-man-on-earth',
    title: 'The Last Man on Earth',
    description: 'After a devastating plague transforms the world\'s population into vampire-like creatures, Dr. Robert Morgan is the sole survivor. By day he hunts the sleeping monsters; by night he barricades himself in his home as they swarm outside, calling his name. The first and most faithful adaptation of Richard Matheson\'s "I Am Legend."',
    year: 1964,
    durationMinutes: 86,
    genres: ['Horror', 'Sci-Fi', 'Drama'],
    rating: 6.9,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/the-last-man-on-earth.jpg',
    backdrop: 'https://contv.com/assets/backdrops/the-last-man-on-earth.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
      { code: 'it', label: 'Italian (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-02-15T00:00:00Z',
  },
  {
    slug: 'plan-9-from-outer-space',
    title: 'Plan 9 from Outer Space',
    description: 'Aliens resurrect dead humans as zombies and vampires to stop humanity from creating the doomsday weapon solenite. As flying saucers hover over Hollywood and the undead walk, the military scrambles to respond. Ed Wood\'s infamous masterpiece of unintentional comedy — widely considered the worst film ever made, and all the more beloved for it.',
    year: 1957,
    durationMinutes: 79,
    genres: ['Sci-Fi', 'Horror', 'Grindhouse'],
    rating: 4.0,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/plan-9-from-outer-space.jpg',
    backdrop: 'https://contv.com/assets/backdrops/plan-9-from-outer-space.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-03-01T00:00:00Z',
  },
  {
    slug: 'white-zombie',
    title: 'White Zombie',
    description: 'In Haiti, a young couple is lured to a sinister plantation owned by the mysterious Murder Legendre. When the plantation owner uses voodoo to transform the beautiful bride into a mindless zombie slave, her husband must rescue her from a fate worse than death. Starring Bela Lugosi in the first zombie film ever made.',
    year: 1932,
    durationMinutes: 69,
    genres: ['Horror', 'Fantasy'],
    rating: 6.2,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/white-zombie.jpg',
    backdrop: 'https://contv.com/assets/backdrops/white-zombie.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-03-15T00:00:00Z',
  },
  {
    slug: 'the-house-on-haunted-hill',
    title: 'The House on Haunted Hill',
    description: 'Eccentric millionaire Frederick Loren invites five strangers to spend the night in a notorious haunted house, offering $10,000 to each survivor. But as the doors lock and the terrors begin, the guests suspect that Loren and his scheming wife have murder on their minds. Vincent Price delivers a deliciously sinister performance.',
    year: 1959,
    durationMinutes: 75,
    genres: ['Horror', 'Mystery', 'Thriller'],
    rating: 6.9,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/the-house-on-haunted-hill.jpg',
    backdrop: 'https://contv.com/assets/backdrops/the-house-on-haunted-hill.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-04-01T00:00:00Z',
  },
  {
    slug: 'the-brain-that-wouldnt-die',
    title: 'The Brain That Wouldn\'t Die',
    description: 'After a car crash decapitates his fiancée, mad scientist Dr. Bill Cortner keeps her head alive in a pan while searching for a new body to attach it to. As the disembodied head develops telepathic powers and communicates with a mutant locked in a closet, she plots revenge against the doctor who refuses to let her die. A quintessential cult classic.',
    year: 1962,
    durationMinutes: 82,
    genres: ['Sci-Fi', 'Horror', 'Grindhouse'],
    rating: 4.6,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/the-brain-that-wouldnt-die.jpg',
    backdrop: 'https://contv.com/assets/backdrops/the-brain-that-wouldnt-die.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-04-15T00:00:00Z',
  },
  {
    slug: 'blood-feast',
    title: 'Blood Feast',
    description: 'Egyptian caterer Fuad Ramses serves up more than exotic cuisine — he\'s collecting body parts from his victims to resurrect the ancient goddess Ishtar. As the gruesome murders pile up, the police race to stop the blood-soaked rampage before the final sacrifice is made. Herschell Gordon Lewis\'s splatter masterpiece that invented gore cinema.',
    year: 1963,
    durationMinutes: 67,
    genres: ['Horror', 'Grindhouse'],
    rating: 5.1,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/blood-feast.jpg',
    backdrop: 'https://contv.com/assets/backdrops/blood-feast.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-05-01T00:00:00Z',
  },
  {
    slug: 'the-screaming-skull',
    title: 'The Screaming Skull',
    description: 'Newlywed Jenny Whitmore moves into the estate of her husband Eric\'s first wife, who died under mysterious circumstances. As unexplainable events escalate and a ghostly skull appears repeatedly, Jenny begins to suspect she is being driven mad — or worse, hunted. A atmospheric chiller from the golden age of drive-in horror.',
    year: 1958,
    durationMinutes: 68,
    genres: ['Horror', 'Mystery'],
    rating: 4.8,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/the-screaming-skull.jpg',
    backdrop: 'https://contv.com/assets/backdrops/the-screaming-skull.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-05-15T00:00:00Z',
  },
  {
    slug: 'teenagers-from-outer-space',
    title: 'Teenagers from Outer Space',
    description: 'A crew of alien teenagers lands on Earth to scout the planet as a new grazing ground for their giant lobster-like livestock, the Gargons. When one alien, Derek, rebels against the mission and befriends a human girl, he must stop his ruthless commander from turning Earth into a feeding ground. Gloriously cheesy 1950s sci-fi at its finest.',
    year: 1959,
    durationMinutes: 86,
    genres: ['Sci-Fi', 'Grindhouse'],
    rating: 3.7,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/teenagers-from-outer-space.jpg',
    backdrop: 'https://contv.com/assets/backdrops/teenagers-from-outer-space.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-06-01T00:00:00Z',
  },
  {
    slug: 'attack-of-the-giant-leeches',
    title: 'Attack of the Giant Leeches',
    description: 'In a small Florida swamp community, residents begin disappearing after radioactive runoff from Cape Canaveral mutates local leeches into giant, blood-sucking monsters. When the local game warden investigates, he discovers the creatures are dragging their victims alive into underwater caves to feed. A creature feature classic from the Roger Corman school.',
    year: 1959,
    durationMinutes: 62,
    genres: ['Sci-Fi', 'Horror', 'Grindhouse'],
    rating: 4.2,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/attack-of-the-giant-leeches.jpg',
    backdrop: 'https://contv.com/assets/backdrops/attack-of-the-giant-leeches.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-06-15T00:00:00Z',
  },
  {
    slug: 'the-satantic-rites-of-dracula',
    title: 'The Satanic Rites of Dracula',
    description: 'In modern London, a mysterious property company fronts a Satanic cult run by Count Dracula himself. When a government agent investigates the company\'s connection to a deadly plague, he discovers the vampire king\'s ultimate plan: a bioweapon that will wipe out humanity. Peter Cushing and Christopher Lee in their final Hammer Dracula showdown.',
    year: 1973,
    durationMinutes: 87,
    genres: ['Horror', 'Thriller'],
    rating: 5.9,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/the-satantic-rites-of-dracula.jpg',
    backdrop: 'https://contv.com/assets/backdrops/the-satantic-rites-of-dracula.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-07-01T00:00:00Z',
  },
  {
    slug: 'rock-n-roll-high-school',
    title: 'Rock \'n\' Roll High School',
    description: 'At Vince Lombardi High School, the students love rock and roll and hate authority. When rock-obsessed teen Riff Randell finally gets tickets to see The Ramones, the tyrannical principal tries to crack down on the student body. But the Ramones themselves arrive to help the students take over the school in this punk rock comedy produced by Roger Corman.',
    year: 1979,
    durationMinutes: 93,
    genres: ['Comedy', 'Music', 'Cult'],
    rating: 6.5,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/rock-n-roll-high-school.jpg',
    backdrop: 'https://contv.com/assets/backdrops/rock-n-roll-high-school.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-07-15T00:00:00Z',
  },
  {
    slug: 'a-bucket-of-blood',
    title: 'A Bucket of Blood',
    description: 'Dim-witted busboy Walter Paisley desperately wants to be a beatnik artist. After accidentally killing his landlady\'s cat and covering it in clay, he\'s hailed as a genius sculptor. Pressured to produce more "art," Walter turns to increasingly drastic — and deadly — methods to keep his new fame alive. Roger Corman\'s darkly comic horror satire.',
    year: 1959,
    durationMinutes: 66,
    genres: ['Horror', 'Comedy', 'Grindhouse'],
    rating: 6.6,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/a-bucket-of-blood.jpg',
    backdrop: 'https://contv.com/assets/backdrops/a-bucket-of-blood.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-08-01T00:00:00Z',
  },
  {
    slug: 'the-atomic-submarine',
    title: 'The Atomic Submarine',
    description: 'When a series of ships vanish in the Arctic Ocean, the nuclear submarine USS Tigershark is dispatched to investigate. What they discover is a flying saucer hidden beneath the polar ice cap, piloted by a one-eyed alien with tentacles who is determined to stop humanity\'s nuclear testing. A wild Cold War sci-fi adventure from the drive-in era.',
    year: 1959,
    durationMinutes: 72,
    genres: ['Sci-Fi', 'Adventure', 'Grindhouse'],
    rating: 5.0,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/the-atomic-submarine.jpg',
    backdrop: 'https://contv.com/assets/backdrops/the-atomic-submarine.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-08-15T00:00:00Z',
  },
  {
    slug: 'the-incredible-2-headed-transplant',
    title: 'The Incredible 2-Headed Transplant',
    description: 'Mad scientist Dr. Roger Girard experiments with grafting a second head onto a living body. When a psychotic escaped convict invades his lab, Girard seizes the opportunity and attaches the criminal\'s head to the body of a mentally disabled giant. The result: a two-headed behemoth with one gentle soul and one murderous maniac trapped in the same body. B-movie gold.',
    year: 1971,
    durationMinutes: 87,
    genres: ['Sci-Fi', 'Horror', 'Grindhouse'],
    rating: 3.8,
    quality: '480p',
    poster: 'https://contv.com/assets/posters/the-incredible-2-headed-transplant.jpg',
    backdrop: 'https://contv.com/assets/backdrops/the-incredible-2-headed-transplant.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-09-01T00:00:00Z',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format minutes to human-readable duration string.
 */
function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'Unknown';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Convert a curated CONtv movie entry to a StreamableMovie.
 */
function toStreamableMovie(movie: CuratedContvMovie): StreamableMovie {
  return {
    id: `contv-${movie.slug}`,
    title: movie.title,
    description: movie.description,
    year: movie.year,
    duration: formatDuration(movie.durationMinutes),
    durationSeconds: movie.durationMinutes * 60,
    genres: movie.genres,
    rating: movie.rating,
    quality: movie.quality,
    poster: movie.poster,
    backdrop: movie.backdrop,
    source: 'contv',
    sourceUrl: `${CONTV_BASE}/watch/${movie.slug}`,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: `${CONTV_BASE}/watch/${movie.slug}`,
    videoType: 'embed',
    languages: movie.languages,
    subtitles: movie.subtitles,
    is4K: movie.is4K,
    isFree: true,
    addedAt: movie.addedAt,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the curated catalog of CONtv genre movies.
 */
export async function fetchContvMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-contv-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    // Curated catalog — no external API call needed.
    // In the future, CONtv could expose a public API endpoint.
    const movies = CONTV_CATALOG.map(toStreamableMovie);

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:CONtv] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the CONtv catalog for movies matching a query.
 */
export async function searchContvMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-contv-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = CONTV_CATALOG
      .filter(movie => {
        const haystack = `${movie.title} ${movie.description} ${movie.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:CONtv] Search error:', err);
    return [];
  }
}
