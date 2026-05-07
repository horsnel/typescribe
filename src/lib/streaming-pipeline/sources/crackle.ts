/**
 * Crackle Free Streaming Source
 *
 * Curated catalog of movies available on Crackle (crackle.com),
 * Sony's free ad-supported streaming service featuring a rotating
 * selection of Hollywood films across action, thriller, comedy, and horror.
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

const CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours (Crackle rotates content frequently)
const CRACKLE_BASE = 'https://crackle.com';

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface CuratedCrackleMovie {
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

const CRACKLE_CATALOG: CuratedCrackleMovie[] = [
  {
    slug: 'the-dead-zone',
    title: 'The Dead Zone',
    description: 'After awakening from a five-year coma, schoolteacher Johnny Smith discovers he has the psychic ability to see a person\'s future simply by touching them. When he shakes hands with a charismatic politician, he foresees a nuclear apocalypse and must decide how far he\'s willing to go to prevent it. Based on Stephen King\'s bestselling novel.',
    year: 1983,
    durationMinutes: 103,
    genres: ['Thriller', 'Horror', 'Sci-Fi'],
    rating: 7.2,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/the-dead-zone.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/the-dead-zone.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-06-01T00:00:00Z',
  },
  {
    slug: 'stargate',
    title: 'Stargate',
    description: 'When archaeologist Daniel Jackson deciphers an ancient Egyptian artifact, he and Colonel Jack O\'Neil lead a military team through a mysterious portal to a distant planet. There they discover an alien civilization enslaved by the sun god Ra, and must ignite a rebellion to save both worlds. The sci-fi epic that launched a massive franchise.',
    year: 1994,
    durationMinutes: 121,
    genres: ['Sci-Fi', 'Action', 'Adventure'],
    rating: 7.1,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/stargate.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/stargate.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
      { code: 'fr', label: 'French', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-06-15T00:00:00Z',
  },
  {
    slug: 'starship-troopers',
    title: 'Starship Troopers',
    description: 'In a militaristic future, young soldiers enlist in the Mobile Infantry to fight an interstellar war against a race of giant alien bugs. But as the body count rises and propaganda blares, the recruits discover that the real enemy may be closer to home. Paul Verhoeven\'s razor-sharp satire disguised as a blockbuster action film.',
    year: 1997,
    durationMinutes: 129,
    genres: ['Sci-Fi', 'Action', 'Satire'],
    rating: 7.3,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/starship-troopers.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/starship-troopers.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-07-01T00:00:00Z',
  },
  {
    slug: 'layer-cake',
    title: 'Layer Cake',
    description: 'A successful cocaine dealer planning an early retirement is forced into one last job by his crime boss: find the missing daughter of a wealthy businessman and negotiate the sale of a massive shipment of ecstasy. But as layers of deception peel away, he realizes he\'s been set up in a deadly game where nobody can be trusted.',
    year: 2004,
    durationMinutes: 105,
    genres: ['Thriller', 'Crime', 'Action'],
    rating: 7.4,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/layer-cake.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/layer-cake.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-07-15T00:00:00Z',
  },
  {
    slug: 'snatch',
    title: 'Snatch',
    description: 'In London\'s criminal underworld, a stolen diamond, a rigged boxing match, and a cast of unforgettable characters collide in a chaotic web of double-crosses and dark comedy. Turkish and his partner Tommy get in over their heads with a ruthless gangster, while other crooks race to claim the priceless gem. Guy Ritchie\'s frenetic crime caper.',
    year: 2000,
    durationMinutes: 104,
    genres: ['Comedy', 'Crime', 'Thriller'],
    rating: 8.3,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/snatch.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/snatch.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-08-01T00:00:00Z',
  },
  {
    slug: 'kicking-and-screaming',
    title: 'Kicking & Screaming',
    description: 'When perpetually mild-mannered family man Phil Weston takes over coaching his son\'s struggling soccer team, his ultra-competitive nature emerges with a vengeance. Fueled by coffee and rivalry with his overbearing father, Phil transforms from a pushover into an out-of-control sideline maniac in this hilarious family comedy.',
    year: 2005,
    durationMinutes: 95,
    genres: ['Comedy', 'Family', 'Sports'],
    rating: 5.6,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/kicking-and-screaming.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/kicking-and-screaming.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-08-15T00:00:00Z',
  },
  {
    slug: 'the-grudge',
    title: 'The Grudge',
    description: 'An American nurse working in Tokyo is exposed to a mysterious supernatural curse that locks its victims in a powerful rage before claiming their lives. As the terrifying curse spreads to everyone who enters a certain house, she must find a way to break the cycle before it consumes her. A spine-tingling remake of the Japanese horror classic.',
    year: 2004,
    durationMinutes: 98,
    genres: ['Horror', 'Thriller', 'Mystery'],
    rating: 5.9,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/the-grudge.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/the-grudge.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'ja', label: 'Japanese (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-09-01T00:00:00Z',
  },
  {
    slug: 'triangle',
    title: 'Triangle',
    description: 'When Jess joins her friends on a yacht trip, a sudden storm forces them to board a mysterious abandoned ocean liner. Once aboard, Jess experiences terrifying déjà vu as she realizes they are trapped in an infinite time loop where she must confront doppelgängers of herself committing unspeakable acts. A mind-bending horror-thriller.',
    year: 2009,
    durationMinutes: 99,
    genres: ['Horror', 'Thriller', 'Mystery'],
    rating: 6.9,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/triangle.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/triangle.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-09-15T00:00:00Z',
  },
  {
    slug: 'the-mechanic',
    title: 'The Mechanic',
    description: 'Elite hitman Arthur Bishop is the best in the business — a "mechanic" who makes assassinations look like accidents. When his mentor and close friend is murdered, Bishop takes on the mentor\'s reckless son as an apprentice. But as they carry out hits together, Bishop discovers that nothing about the murder was as it seemed.',
    year: 2011,
    durationMinutes: 93,
    genres: ['Action', 'Thriller', 'Crime'],
    rating: 6.5,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/the-mechanic.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/the-mechanic.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-10-01T00:00:00Z',
  },
  {
    slug: 'society',
    title: 'Society',
    description: 'In Beverly Hills, teenager Bill Whitney suspects that his wealthy, successful family and their high-society friends are hiding a grotesque secret. Dismissed as paranoid, Bill investigates and uncovers a horrifying truth about the upper class that defies all logic and morality. A cult classic of body horror and social satire.',
    year: 1989,
    durationMinutes: 99,
    genres: ['Horror', 'Comedy', 'Thriller'],
    rating: 6.3,
    quality: '480p',
    poster: 'https://crackle.com/assets/posters/society.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/society.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-10-15T00:00:00Z',
  },
  {
    slug: 'rec',
    title: '[REC]',
    description: 'A television reporter and her cameraman follow a team of firefighters on a routine call to a Barcelona apartment building, only to find themselves sealed inside by authorities. As terrified residents begin exhibiting violent, rabid symptoms, the crew captures the escalating nightmare on camera in this found-footage horror masterpiece.',
    year: 2007,
    durationMinutes: 78,
    genres: ['Horror', 'Thriller'],
    rating: 7.4,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/rec.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/rec.jpg',
    languages: [
      { code: 'es', label: 'Spanish (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-11-01T00:00:00Z',
  },
  {
    slug: 'the-hidden',
    title: 'The Hidden',
    description: 'An FBI agent teams up with an LAPD detective to track down a string of violent crimes committed by seemingly ordinary citizens. The investigation reveals an alien parasite that jumps from body to body, using its human hosts to indulge in criminal excess before discarding them. A wildly entertaining sci-fi action cult classic.',
    year: 1987,
    durationMinutes: 96,
    genres: ['Sci-Fi', 'Action', 'Horror'],
    rating: 7.0,
    quality: '480p',
    poster: 'https://crackle.com/assets/posters/the-hidden.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/the-hidden.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-11-15T00:00:00Z',
  },
  {
    slug: 'universal-soldier',
    title: 'Universal Soldier',
    description: 'During the Vietnam War, soldiers Luc Deveraux and Andrew Scott kill each other in a bloody confrontation. Decades later, they are resurrected as part of a top-secret government program that turns dead soldiers into genetically enhanced super-soldiers. When memories of their past lives resurface, the two become locked in a deadly battle.',
    year: 1992,
    durationMinutes: 102,
    genres: ['Action', 'Sci-Fi'],
    rating: 6.1,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/universal-soldier.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/universal-soldier.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-12-01T00:00:00Z',
  },
  {
    slug: 'pumpkinhead',
    title: 'Pumpkinhead',
    description: 'When a rural storekeeper\'s young son is accidentally killed by careless teenagers, the grieving father seeks revenge by conjuring the demon Pumpkinhead from a forbidden graveyard. But as the creature hunts down the teens one by one, the father begins to see through the demon\'s eyes and realizes the terrible cost of his vengeance.',
    year: 1988,
    durationMinutes: 86,
    genres: ['Horror', 'Fantasy'],
    rating: 6.7,
    quality: '480p',
    poster: 'https://crackle.com/assets/posters/pumpkinhead.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/pumpkinhead.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-12-15T00:00:00Z',
  },
  {
    slug: 'the-new-guy',
    title: 'The New Guy',
    description: 'After a humiliating high school experience, dorky Dizzy Harrison gets himself expelled and reinvents himself at a new school as a cool, confident rebel. With the help of a motley crew of inmates, Dizzy transforms into the ultimate popular kid — but his new persona threatens to unravel when his past catches up with him.',
    year: 2002,
    durationMinutes: 89,
    genres: ['Comedy', 'Teen'],
    rating: 5.5,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/the-new-guy.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/the-new-guy.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2024-01-01T00:00:00Z',
  },
  {
    slug: 'bachelorman',
    title: 'BachelorMan',
    description: 'Confirmed bachelor and womanizer Ted Davis thinks he has the perfect life — until his new neighbor Heather moves in next door and turns his world upside down. As his friends try to help him navigate his first real relationship, Ted must choose between his carefree lifestyle and the possibility of true love. A rom-com with a male perspective.',
    year: 2003,
    durationMinutes: 88,
    genres: ['Comedy', 'Romance'],
    rating: 5.2,
    quality: '480p',
    poster: 'https://crackle.com/assets/posters/bachelorman.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/bachelorman.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2024-01-15T00:00:00Z',
  },
  {
    slug: 'blood-and-bone',
    title: 'Blood and Bone',
    description: 'Ex-convict Isaiah Bone enters the underground street fighting scene in Los Angeles, quickly rising through the ranks with his devastating martial arts skills. But Bone\'s true motives are personal — he made a promise to a dying friend and will stop at nothing to keep it, even if it means taking on the city\'s most dangerous crime boss.',
    year: 2009,
    durationMinutes: 103,
    genres: ['Action', 'Crime', 'Drama'],
    rating: 6.6,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/blood-and-bone.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/blood-and-bone.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2024-02-01T00:00:00Z',
  },
  {
    slug: 'missionary-man',
    title: 'Missionary Man',
    description: 'A mysterious loner rides into a small Texas border town torn apart by a ruthless drug cartel. Calling himself Ryder, he allies with the townsfolk to stand up to the criminals terrorizing their community. But Ryder has his own dark past and a very personal reason for choosing this particular town. A gritty modern western.',
    year: 2007,
    durationMinutes: 93,
    genres: ['Action', 'Western', 'Thriller'],
    rating: 5.5,
    quality: '480p',
    poster: 'https://crackle.com/assets/posters/missionary-man.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/missionary-man.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2024-02-15T00:00:00Z',
  },
  {
    slug: 'the-cave',
    title: 'The Cave',
    description: 'A team of expert cave divers is called in to explore a vast underground network beneath a ruined Romanian abbey. Deep below the surface, they discover an entirely new ecosystem — and a terrifying species of predator that has evolved in the darkness for millennia. As their exit collapses, the team must find another way out while being hunted.',
    year: 2005,
    durationMinutes: 97,
    genres: ['Horror', 'Action', 'Thriller'],
    rating: 5.1,
    quality: '720p',
    poster: 'https://crackle.com/assets/posters/the-cave.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/the-cave.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2024-03-01T00:00:00Z',
  },
  {
    slug: 'highlander-ii-the-quickening',
    title: 'Highlander II: The Quickening',
    description: 'In the year 2024, the immortal Connor MacLeod has helped create a massive shield to protect Earth from dying solar radiation. When he discovers that the shield is actually causing the planet to overheat, he must reactivate his immortality and face a team of deadly assassins sent from his home world to silence him.',
    year: 1991,
    durationMinutes: 110,
    genres: ['Sci-Fi', 'Action', 'Fantasy'],
    rating: 4.4,
    quality: '480p',
    poster: 'https://crackle.com/assets/posters/highlander-ii-the-quickening.jpg',
    backdrop: 'https://crackle.com/assets/backdrops/highlander-ii-the-quickening.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2024-03-15T00:00:00Z',
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
 * Convert a curated Crackle movie entry to a StreamableMovie.
 */
function toStreamableMovie(movie: CuratedCrackleMovie): StreamableMovie {
  return {
    id: `crackle-${movie.slug}`,
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
    source: 'crackle',
    sourceUrl: `${CRACKLE_BASE}/watch/${movie.slug}`,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: `${CRACKLE_BASE}/watch/${movie.slug}`,
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
 * Fetch the curated catalog of Crackle movies.
 */
export async function fetchCrackleMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-crackle-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    // Curated catalog — no external API call needed.
    // In the future, Crackle could expose a public API endpoint.
    const movies = CRACKLE_CATALOG.map(toStreamableMovie);

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:Crackle] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the Crackle catalog for movies matching a query.
 */
export async function searchCrackleMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-crackle-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = CRACKLE_CATALOG
      .filter(movie => {
        const haystack = `${movie.title} ${movie.description} ${movie.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:Crackle] Search error:', err);
    return [];
  }
}
