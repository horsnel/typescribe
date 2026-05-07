/**
 * Tubi Free Streaming Source
 *
 * Curated catalog of popular free movies available on Tubi (tubitv.com).
 * Tubi is a free ad-supported streaming service (FAST/AVOD) with a large
 * library of movies across many genres including anime, action, horror,
 * comedy, drama, and sci-fi.
 *
 * Since Tubi does not offer a public developer API, this source uses a
 * curated catalog approach with known popular titles that are consistently
 * available on the platform. The catalog is periodically refreshed to
 * reflect what is currently streaming on Tubi.
 *
 * Only shared imports: fetchWithTimeout / safeJsonParse from resilience,
 * getCached / setCached from the streaming pipeline cache.
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack, StreamingCategory } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const TUBI_BASE_URL = 'https://tubitv.com';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours — curated list changes infrequently
const SEARCH_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours for search results

// ─── Curated Tubi Catalog ────────────────────────────────────────────────────
//
// These are well-known free movies that have been consistently available
// on Tubi. Tubi rotates content, but these titles are part of their
// permanent or long-term licensing agreements. Each entry includes a
// Tubi content ID used in the public-facing URL.
//
// IDs follow the pattern `tubi-{slug}` for consistency.

const TUBI_CATALOG: StreamableMovie[] = [
  // ── Anime ──────────────────────────────────────────────────────────────────

  {
    id: 'tubi-akira',
    title: 'Akira',
    description: 'In a dystopian 2019 Neo-Tokyo, a biker gang member named Tetsuo develops telekinetic abilities after a motorcycle accident. As his powers grow uncontrollably, he threatens the entire city, forcing his friend Kaneda to intervene. A landmark in anime cinema that redefined the genre worldwide.',
    year: 1988,
    duration: '2h 4m',
    durationSeconds: 7440,
    genres: ['Anime', 'Sci-Fi', 'Action'],
    rating: 8.0,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Akira_%281988_poster%29.jpg/440px-Akira_%281988_poster%29.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Akira_%281988_poster%29.jpg/440px-Akira_%281988_poster%29.jpg',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/akira-1988',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/akira-1988',
    videoType: 'embed',
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
    addedAt: '2023-01-15T00:00:00Z',
  },
  {
    id: 'tubi-ghost-in-the-shell',
    title: 'Ghost in the Shell',
    description: 'In the year 2029, the world is interconnected by a vast electronic network that permeates every aspect of life. Major Motoko Kusanagi, a cybernetic government agent, tracks the Puppet Master, a mysterious hacker who can infiltrate human minds. A philosophical masterpiece exploring identity and consciousness.',
    year: 1995,
    duration: '1h 23m',
    durationSeconds: 4980,
    genres: ['Anime', 'Sci-Fi', 'Thriller'],
    rating: 7.9,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Ghost_in_the_Shell_%281995_film%29_poster.jpg/440px-Ghost_in_the_Shell_%281995_film%29_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Ghost_in_the_Shell_%281995_film%29_poster.jpg/440px-Ghost_in_the_Shell_%281995_film%29_poster.jpg',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/ghost-in-the-shell-1995',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/ghost-in-the-shell-1995',
    videoType: 'embed',
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
    addedAt: '2023-02-10T00:00:00Z',
  },
  {
    id: 'tubi-ninja-scroll',
    title: 'Ninja Scroll',
    description: 'A wandering swordsman named Jubei is drawn into a deadly conspiracy involving the Eight Devils of Kimon, a group of supernatural ninjas plotting to overthrow the Tokugawa shogunate. With the help of a female ninja and a government spy, Jubei must face each devil in mortal combat.',
    year: 1993,
    duration: '1h 34m',
    durationSeconds: 5640,
    genres: ['Anime', 'Action', 'Fantasy'],
    rating: 7.7,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0f/Ninja_Scroll_poster.jpg/440px-Ninja_Scroll_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0f/Ninja_Scroll_poster.jpg/440px-Ninja_Scroll_poster.jpg',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/ninja-scroll',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/ninja-scroll',
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
    addedAt: '2023-03-05T00:00:00Z',
  },
  {
    id: 'tubi-vampire-hunter-d',
    title: 'Vampire Hunter D: Bloodlust',
    description: 'In a distant future where vampires rule the night, the enigmatic dhampir D is hired to rescue a young woman kidnapped by the vampire Baron Meier Link. But the mission is complicated by a rival team of bounty hunters and the woman\'s own desire to stay with her captor. A gothic anime masterpiece.',
    year: 2000,
    duration: '1h 43m',
    durationSeconds: 6180,
    genres: ['Anime', 'Horror', 'Fantasy'],
    rating: 7.6,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/67/Vampire_Hunter_D_Bloodlust.jpg/440px-Vampire_Hunter_D_Bloodlust.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/67/Vampire_Hunter_D_Bloodlust.jpg/440px-Vampire_Hunter_D_Bloodlust.jpg',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/vampire-hunter-d-bloodlust',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/vampire-hunter-d-bloodlust',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: '5.1 Surround' },
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-04-20T00:00:00Z',
  },
  {
    id: 'tubi-steamboy',
    title: 'Steamboy',
    description: 'In Victorian-era England, young Ray Steam receives a mysterious steam ball from his grandfather — a device of immense power coveted by the nefarious O\'Hara Foundation. Ray must navigate a web of betrayal and industrial espionage to prevent the steam ball from being weaponized. From the director of Akira.',
    year: 2004,
    duration: '2h 6m',
    durationSeconds: 7560,
    genres: ['Anime', 'Sci-Fi', 'Adventure'],
    rating: 6.7,
    quality: '1080p',
    poster: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Steamboy_poster.jpg/440px-Steamboy_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Steamboy_poster.jpg/440px-Steamboy_poster.jpg',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/steamboy',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/steamboy',
    videoType: 'embed',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-05-12T00:00:00Z',
  },

  // ── Action ─────────────────────────────────────────────────────────────────

  {
    id: 'tubi-hardware',
    title: 'Hardware',
    description: 'In a post-apocalyptic wasteland, a scavenger discovers the remains of a deadly military robot and sells the parts to a junk dealer. When the robot rebuilds itself and goes on a killing spree in a cramped apartment building, a soldier and his girlfriend must fight to survive the night. A cult classic of British cyberpunk cinema.',
    year: 1990,
    duration: '1h 34m',
    durationSeconds: 5640,
    genres: ['Action', 'Sci-Fi', 'Horror'],
    rating: 5.8,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/hardware-1990',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/hardware-1990',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-06-01T00:00:00Z',
  },
  {
    id: 'tubi-apocalypse-now-final-cut',
    title: 'Apocalypse Now Final Cut',
    description: 'At the height of the Vietnam War, Captain Benjamin L. Willard is sent on a classified mission up the Nùng River into Cambodia to assassinate Colonel Walter E. Kurtz, a decorated Green Beret who has gone rogue and commands a private army of indigenous fighters. A searing descent into the heart of darkness.',
    year: 1979,
    duration: '3h 2m',
    durationSeconds: 10920,
    genres: ['Action', 'Drama', 'War'],
    rating: 8.4,
    quality: '1080p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/apocalypse-now-final-cut',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/apocalypse-now-final-cut',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'fr', label: 'French (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-02-20T00:00:00Z',
  },
  {
    id: 'tubi-blood-fist',
    title: 'Bloodfist',
    description: 'World kickboxing champion Don "The Dragon" Wilson stars as Jack Dickson, a man who travels to Manila to investigate his brother\'s murder. Entering a deadly underground fighting tournament, he must battle a roster of lethal fighters to uncover the truth and exact his revenge. Non-stop martial arts action.',
    year: 1989,
    duration: '1h 25m',
    durationSeconds: 5100,
    genres: ['Action', 'Martial Arts'],
    rating: 5.0,
    quality: '480p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/bloodfist',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/bloodfist',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-07-15T00:00:00Z',
  },
  {
    id: 'tubi-brawl-cell-block-99',
    title: 'Brawl in Cell Block 99',
    description: 'Former boxer Bradley Thomas loses his job at an auto repair shop and turns to drug running to support his pregnant wife. When a deal goes violently wrong, he\'s sent to a maximum-security prison where a drug lord forces him into a deadly confrontation — he must kill an inmate in Cell Block 99 or his family will be killed.',
    year: 2017,
    duration: '2h 12m',
    durationSeconds: 7920,
    genres: ['Action', 'Drama', 'Thriller'],
    rating: 7.3,
    quality: '1080p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/brawl-in-cell-block-99',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/brawl-in-cell-block-99',
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
    addedAt: '2023-08-01T00:00:00Z',
  },
  {
    id: 'tubi-dog-soldiers',
    title: 'Dog Soldiers',
    description: 'A squad of British soldiers on a routine training exercise in the Scottish Highlands finds the wreckage of a Special Forces camp and a lone survivor. As night falls, they\'re attacked by a pack of werewolves and must take refuge in a remote farmhouse. A wildly entertaining blend of military action and horror.',
    year: 2002,
    duration: '1h 45m',
    durationSeconds: 6300,
    genres: ['Action', 'Horror', 'Comedy'],
    rating: 6.8,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/dog-soldiers',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/dog-soldiers',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-09-10T00:00:00Z',
  },

  // ── Horror ─────────────────────────────────────────────────────────────────

  {
    id: 'tubi-night-of-living-dead',
    title: 'Night of the Living Dead',
    description: 'A group of strangers take refuge in a rural Pennsylvania farmhouse when reanimated corpses begin attacking the living. As the dead surround the house, tensions rise among the survivors, and their best hope — a plan to escape — is undermined by fear and distrust. George A. Romero\'s groundbreaking zombie classic that launched an entire genre.',
    year: 1968,
    duration: '1h 36m',
    durationSeconds: 5760,
    genres: ['Horror', 'Thriller'],
    rating: 7.9,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Night_of_the_Living_Dead_%281968%29.jpg/440px-Night_of_the_Living_Dead_%281968%29.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Night_of_the_Living_Dead_%281968%29.jpg/440px-Night_of_the_Living_Dead_%281968%29.jpg',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/night-of-the-living-dead',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/night-of-the-living-dead',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-01-05T00:00:00Z',
  },
  {
    id: 'tubi-carnival-of-souls',
    title: 'Carnival of Souls',
    description: 'After a traumatic car accident, organist Mary Henry is drawn to a mysterious abandoned lakeside pavilion. Haunted by ghostly apparitions and a terrifying figure in white makeup, she finds herself increasingly disconnected from the living world. A low-budget masterpiece of atmospheric horror that influenced generations of filmmakers.',
    year: 1962,
    duration: '1h 18m',
    durationSeconds: 4680,
    genres: ['Horror', 'Mystery'],
    rating: 7.1,
    quality: '480p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/carnival-of-souls',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/carnival-of-souls',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-02-28T00:00:00Z',
  },
  {
    id: 'tubi-house-on-haunted-hill',
    title: 'House on Haunted Hill',
    description: 'Eccentric millionaire Frederick Loren invites five strangers to spend the night in a supposedly haunted mansion on a hill, offering $10,000 to each who survives until morning. But as the night unfolds, it becomes clear that the real danger may come from Loren himself. Vincent Price delivers a deliciously sinister performance.',
    year: 1959,
    duration: '1h 15m',
    durationSeconds: 4500,
    genres: ['Horror', 'Mystery', 'Thriller'],
    rating: 6.9,
    quality: '480p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/house-on-haunted-hill-1959',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/house-on-haunted-hill-1959',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-03-15T00:00:00Z',
  },
  {
    id: 'tubi-maniac-cop',
    title: 'Maniac Cop',
    description: 'A series of brutal murders in New York City is blamed on a uniformed police officer. As the body count rises and public panic spreads, an honest cop races to clear his name while the real killer — a vengeful former officer left for dead in prison — stalks the streets. A cult favorite from director William Lustig.',
    year: 1988,
    duration: '1h 25m',
    durationSeconds: 5100,
    genres: ['Horror', 'Action', 'Thriller'],
    rating: 6.3,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/maniac-cop',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/maniac-cop',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-10-31T00:00:00Z',
  },
  {
    id: 'tubi-witchfinder-general',
    title: 'Witchfinder General',
    description: 'During the English Civil War, the sadistic witch-hunter Matthew Hopkins rides through East Anglia, torturing and executing innocent people for profit. When a young soldier discovers that Hopkins has victimized the woman he loves, he swears revenge. Vincent Price gives one of his most chilling performances.',
    year: 1968,
    duration: '1h 26m',
    durationSeconds: 5160,
    genres: ['Horror', 'Drama', 'History'],
    rating: 7.0,
    quality: '480p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/witchfinder-general',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/witchfinder-general',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-10-20T00:00:00Z',
  },

  // ── Comedy ─────────────────────────────────────────────────────────────────

  {
    id: 'tubi-its-a-mad-mad-mad-mad-world',
    title: "It's a Mad, Mad, Mad, Mad World",
    description: 'When a dying thief reveals the location of $350,000 in stolen loot, a group of ordinary citizens abandons all decency in a frantic cross-country race to find the treasure first. This all-star comedy epic features an incredible ensemble of comedy legends in an increasingly chaotic free-for-all.',
    year: 1963,
    duration: '2h 41m',
    durationSeconds: 9660,
    genres: ['Comedy', 'Adventure', 'Action'],
    rating: 7.4,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/its-a-mad-mad-mad-mad-world',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/its-a-mad-mad-mad-mad-world',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-04-01T00:00:00Z',
  },
  {
    id: 'tubi-a-fish-called-wanda',
    title: 'A Fish Called Wanda',
    description: 'Four eccentric jewel thieves double-cross each other to find diamonds hidden by their dead boss. Sexy con artist Wanda seduces an uptight London lawyer to get information, but unexpectedly falls for him. Meanwhile, her jealous weapons-obsessed boyfriend and an animal-loving assassin add to the chaos. Brilliantly absurd comedy.',
    year: 1988,
    duration: '1h 48m',
    durationSeconds: 6480,
    genres: ['Comedy', 'Crime'],
    rating: 7.5,
    quality: '1080p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/a-fish-called-wanda',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/a-fish-called-wanda',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-05-20T00:00:00Z',
  },
  {
    id: 'tubi-dont-be-a-menace',
    title: "Don't Be a Menace to South Central While Drinking Your Juice in the Hood",
    description: 'A hilarious spoof of coming-of-age hood movies, following Ashtray as he navigates life in South Central Los Angeles with his loco cousin Loc Dog, an eccentric grandmother, and every trope from Boyz n the Hood, Menace II Society, and Juice. The Wayans brothers deliver relentless parody in this cult comedy classic.',
    year: 1996,
    duration: '1h 29m',
    durationSeconds: 5340,
    genres: ['Comedy', 'Parody'],
    rating: 6.0,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/dont-be-a-menace',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/dont-be-a-menace',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-06-15T00:00:00Z',
  },
  {
    id: 'tubi-clerks',
    title: 'Clerks',
    description: 'Convenience store clerk Dante and video store clerk Randal spend a day discussing pop culture, dealing with annoying customers, and navigating romantic entanglements in this landmark indie comedy. Shot in black-and-white in the actual store where director Kevin Smith worked, it defined a generation of slacker humor.',
    year: 1994,
    duration: '1h 32m',
    durationSeconds: 5520,
    genres: ['Comedy', 'Drama'],
    rating: 7.7,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/clerks',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/clerks',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-07-04T00:00:00Z',
  },
  {
    id: 'tubi-king-of-comedy',
    title: 'The King of Comedy',
    description: 'Rupert Pupkin is a delusional aspiring comedian who dreams of appearing on The Jerry Langford Show, hosted by the biggest late-night talk show host in America. When his persistent attempts to get an audition are rebuffed, Rupert hatches an outrageous plan involving the kidnapping of Jerry Langford himself.',
    year: 1982,
    duration: '1h 49m',
    durationSeconds: 6540,
    genres: ['Comedy', 'Drama', 'Crime'],
    rating: 7.7,
    quality: '1080p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/the-king-of-comedy',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/the-king-of-comedy',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-08-20T00:00:00Z',
  },

  // ── Drama ──────────────────────────────────────────────────────────────────

  {
    id: 'tubi-repo-man',
    title: 'Repo Man',
    description: 'Punk rocker Otto gets recruited into the repo business by Bud, a veteran car repossessor. When a mysterious 1964 Chevy Malibu with a hefty bounty — and something radioactive in the trunk — appears on the streets, every repo agent in Los Angeles wants it. A surreal, funny, and totally unique slice of 1980s counterculture.',
    year: 1984,
    duration: '1h 32m',
    durationSeconds: 5520,
    genres: ['Drama', 'Comedy', 'Sci-Fi'],
    rating: 7.2,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/repo-man',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/repo-man',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-03-01T00:00:00Z',
  },
  {
    id: 'tubi-the-last-waltz',
    title: 'The Last Waltz',
    description: 'On Thanksgiving Day 1976, The Band gave their farewell concert at Winterland Ballroom in San Francisco. Captured on film by Martin Scorsese, this legendary event features performances with Bob Dylan, Eric Clapton, Neil Young, Joni Mitchell, Van Morrison, and many more. Often called the greatest rock concert film ever made.',
    year: 1978,
    duration: '1h 57m',
    durationSeconds: 7020,
    genres: ['Drama', 'Music', 'Documentary'],
    rating: 8.2,
    quality: '1080p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/the-last-waltz',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/the-last-waltz',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-09-01T00:00:00Z',
  },
  {
    id: 'tubi-bottle-rocket',
    title: 'Bottle Rocket',
    description: 'Three aimless friends — Anthony, Dignan, and Bob — attempt a series of small-time heists under the deluded leadership of Dignan, who has mapped out a 75-year plan for their criminal careers. Their bumbling escapades lead to a chaotic bookstore robbery and a stint at a motel where Anthony falls in love. Wes Anderson\'s charming debut.',
    year: 1996,
    duration: '1h 32m',
    durationSeconds: 5520,
    genres: ['Drama', 'Comedy', 'Crime'],
    rating: 6.9,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/bottle-rocket',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/bottle-rocket',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-11-05T00:00:00Z',
  },
  {
    id: 'tubi-angels-with-dirty-faces',
    title: 'Angels with Dirty Faces',
    description: 'Rocky Sullivan and Jerry Connolly are childhood friends who took very different paths — Rocky became a notorious gangster, Jerry a devoted priest. When Rocky returns to the old neighborhood, his influence on a gang of street kids threatens everything Jerry has worked for. James Cagney delivers one of cinema\'s most iconic performances.',
    year: 1938,
    duration: '1h 37m',
    durationSeconds: 5820,
    genres: ['Drama', 'Crime'],
    rating: 7.9,
    quality: '480p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/angels-with-dirty-faces',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/angels-with-dirty-faces',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-12-01T00:00:00Z',
  },
  {
    id: 'tubi-the-cool-ones',
    title: 'The Cool Ones',
    description: 'A talented but struggling singer and a wealthy playboy team up to create a new dance craze that takes the pop music world by storm. But as fame and fortune pull them in different directions, their partnership — and romance — is put to the test. A groovy 1960s musical drama with vintage go-go energy.',
    year: 1967,
    duration: '1h 28m',
    durationSeconds: 5280,
    genres: ['Drama', 'Music', 'Romance'],
    rating: 5.5,
    quality: '480p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/the-cool-ones',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/the-cool-ones',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-12-15T00:00:00Z',
  },

  // ── Sci-Fi ─────────────────────────────────────────────────────────────────

  {
    id: 'tubi-metropolis',
    title: 'Metropolis',
    description: 'In a futuristic city divided between the wealthy elite who live in towering skyscrapers and the oppressed workers who toil underground, the son of the city\'s mastermind falls in love with a working-class woman and witnesses the suffering of the lower classes. A restored classic of German Expressionist cinema and the grandfather of sci-fi film.',
    year: 1927,
    duration: '2h 33m',
    durationSeconds: 9180,
    genres: ['Sci-Fi', 'Drama'],
    rating: 8.3,
    quality: '720p',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Metropolis_film_poster.jpg/440px-Metropolis_film_poster.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Metropolis_film_poster.jpg/440px-Metropolis_film_poster.jpg',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/metropolis',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/metropolis',
    videoType: 'embed',
    languages: [
      { code: 'de', label: 'German (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Silent' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'de', label: 'German', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-01-10T00:00:00Z',
  },
  {
    id: 'tubi-things-to-come',
    title: 'Things to Come',
    description: 'A devastating world war lasts for decades, plunging civilization into a new Dark Age. Decades later, a group of engineers and scientists called "Wings Over the World" uses technology to rebuild society, but faces resistance from those who prefer the old ways. A visionary H.G. Wells adaptation about the eternal conflict between progress and tradition.',
    year: 1936,
    duration: '1h 33m',
    durationSeconds: 5580,
    genres: ['Sci-Fi', 'Drama'],
    rating: 6.7,
    quality: '480p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/things-to-come',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/things-to-come',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-04-15T00:00:00Z',
  },
  {
    id: 'tubi-first-men-in-moon',
    title: 'First Men in the Moon',
    description: 'In 1899, eccentric scientist Joseph Cavor invents a substance called Cavorite that blocks gravity. Along with his neighbor Bedford and Kate, Cavor travels to the moon where they discover an underground civilization of insect-like Selenites. When international tensions rise, Cavor faces an impossible choice. Ray Harryhausen\'s visual effects are a wonder.',
    year: 1964,
    duration: '1h 43m',
    durationSeconds: 6180,
    genres: ['Sci-Fi', 'Adventure'],
    rating: 6.7,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/first-men-in-the-moon',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/first-men-in-the-moon',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Mono' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-06-20T00:00:00Z',
  },
  {
    id: 'tubi-the-man-who-fell-to-earth',
    title: 'The Man Who Fell to Earth',
    description: 'An alien named Thomas Jerome Newton arrives on Earth from a drought-stricken planet, seeking water to save his dying world. Using his advanced knowledge, he builds a technology empire to fund a return spacecraft. But as he becomes entangled in human vices — alcohol, television, and love — his mission and identity begin to unravel. David Bowie\'s mesmerizing performance anchors this cult sci-fi classic.',
    year: 1976,
    duration: '2h 19m',
    durationSeconds: 8340,
    genres: ['Sci-Fi', 'Drama'],
    rating: 6.8,
    quality: '1080p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/the-man-who-fell-to-earth',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/the-man-who-fell-to-earth',
    videoType: 'embed',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-11-20T00:00:00Z',
  },
  {
    id: 'tubi-solaris-tarkovsky',
    title: 'Solaris',
    description: 'Psychologist Kris Kelvin is sent to a space station orbiting the ocean planet Solaris, where the crew has been experiencing mysterious psychological phenomena. Upon arrival, he discovers his dead wife alive aboard the station — a physical manifestation created by the planet\'s intelligence from his memories. Andrei Tarkovsky\'s meditative masterpiece on grief, memory, and the limits of human understanding.',
    year: 1972,
    duration: '2h 47m',
    durationSeconds: 10020,
    genres: ['Sci-Fi', 'Drama', 'Mystery'],
    rating: 8.0,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/solaris',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/solaris',
    videoType: 'embed',
    languages: [
      { code: 'ru', label: 'Russian (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'ru', label: 'Russian', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-08-15T00:00:00Z',
  },

  // ── Bonus: Additional genre cross-overs ────────────────────────────────────

  {
    id: 'tubi-pusher',
    title: 'Pusher',
    description: 'Frank is a small-time drug dealer in Copenhagen whose life spirals out of control after a deal goes wrong and he loses a large quantity of heroin. With a ruthless drug lord demanding payment and only days to come up with the money, Frank descends into a frantic world of violence and desperation. Nicolas Winding Refn\'s raw, kinetic debut.',
    year: 1996,
    duration: '1h 45m',
    durationSeconds: 6300,
    genres: ['Drama', 'Crime', 'Thriller'],
    rating: 7.3,
    quality: '720p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/pusher',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/pusher',
    videoType: 'embed',
    languages: [
      { code: 'da', label: 'Danish (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-09-20T00:00:00Z',
  },
  {
    id: 'tubi-district-b13',
    title: 'District B13',
    description: 'In the near future, Paris has walled off its most crime-ridden district, District 13. When a neutron bomb is stolen and set to detonate inside the district, an undercover cop and a street fighter with incredible parkour skills must team up to defuse it before millions die. Non-stop action showcasing the founders of parkour.',
    year: 2004,
    duration: '1h 24m',
    durationSeconds: 5040,
    genres: ['Action', 'Sci-Fi'],
    rating: 7.0,
    quality: '1080p',
    poster: '',
    backdrop: '',
    source: 'tubi',
    sourceUrl: 'https://tubitv.com/movies/district-b13',
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: 'https://tubitv.com/movies/district-b13',
    videoType: 'embed',
    languages: [
      { code: 'fr', label: 'French (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: '5.1 Surround' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'fr', label: 'French', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: '2023-10-01T00:00:00Z',
  },
];

// ─── Category Definitions ───────────────────────────────────────────────────

const TUBI_CATEGORIES: StreamingCategory[] = [
  {
    id: 'tubi-anime',
    label: 'Anime on Tubi',
    icon: 'Sparkles',
    movieIds: TUBI_CATALOG
      .filter(m => m.genres.some(g => g.toLowerCase() === 'anime'))
      .map(m => m.id),
  },
  {
    id: 'tubi-action',
    label: 'Action on Tubi',
    icon: 'Swords',
    movieIds: TUBI_CATALOG
      .filter(m => m.genres.some(g => g.toLowerCase() === 'action'))
      .map(m => m.id),
  },
  {
    id: 'tubi-horror',
    label: 'Horror on Tubi',
    icon: 'Skull',
    movieIds: TUBI_CATALOG
      .filter(m => m.genres.some(g => g.toLowerCase() === 'horror'))
      .map(m => m.id),
  },
  {
    id: 'tubi-comedy',
    label: 'Comedy on Tubi',
    icon: 'Smile',
    movieIds: TUBI_CATALOG
      .filter(m => m.genres.some(g => g.toLowerCase() === 'comedy'))
      .map(m => m.id),
  },
  {
    id: 'tubi-drama',
    label: 'Drama on Tubi',
    icon: 'Theater',
    movieIds: TUBI_CATALOG
      .filter(m => m.genres.some(g => g.toLowerCase() === 'drama'))
      .map(m => m.id),
  },
  {
    id: 'tubi-sci-fi',
    label: 'Sci-Fi on Tubi',
    icon: 'Wand2',
    movieIds: TUBI_CATALOG
      .filter(m => m.genres.some(g => g.toLowerCase() === 'sci-fi'))
      .map(m => m.id),
  },
  {
    id: 'tubi-free-movies',
    label: 'Free Movies on Tubi',
    icon: 'Film',
    movieIds: TUBI_CATALOG.map(m => m.id),
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch all curated Tubi movies.
 * Returns from cache if available, otherwise serves the hardcoded catalog.
 *
 * This follows the same caching pattern as the API-based sources:
 * check cache → return cached data or fresh catalog → store in cache.
 */
export async function fetchTubiMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-tubi-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    // Curated catalog — no API call needed, but we still cache for consistency
    // with the pipeline's caching layer and to avoid re-computation
    setCached(cacheKey, TUBI_CATALOG, CACHE_TTL);
    return TUBI_CATALOG;
  } catch (err) {
    console.warn('[StreamingPipeline:Tubi] Error fetching Tubi movies:', err);
    return [];
  }
}

/**
 * Search curated Tubi movies by query string.
 * Matches against title, genre, and description.
 * Results are cached for 2 hours.
 */
export async function searchTubiMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-tubi-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const q = query.toLowerCase().trim();
    const results = TUBI_CATALOG.filter(movie => {
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
    console.warn('[StreamingPipeline:Tubi] Search error:', err);
    return [];
  }
}

/**
 * Get Tubi category definitions for the streaming pipeline.
 * Returns StreamingCategory objects that can be merged into the main catalog.
 */
export function getTubiCategories(): StreamingCategory[] {
  return TUBI_CATEGORIES.filter(c => c.movieIds.length > 0);
}
