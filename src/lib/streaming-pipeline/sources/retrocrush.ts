/**
 * RetroCrush Free Anime Streaming Source
 *
 * Curated catalog of classic and vintage anime available on RetroCrush,
 * a free ad-supported streaming service specializing in retro anime.
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
const RETROCRUSH_BASE = 'https://retrocrush.tv';

// ─── Curated Catalog ─────────────────────────────────────────────────────────

interface CuratedAnime {
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

const RETROCRUSH_CATALOG: CuratedAnime[] = [
  {
    slug: 'astro-boy',
    title: 'Astro Boy',
    description: 'The legendary Osamu Tezuka creation that launched the anime industry. In a futuristic world, the kindly Dr. Tenma creates a powerful robot boy in the image of his lost son. Astro Boy uses his incredible powers to fight evil and protect the innocent, becoming a hero to humans and robots alike.',
    year: 1963,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action'],
    rating: 7.4,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/astro-boy.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/astro-boy.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'ja', label: 'Japanese', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-01-15T00:00:00Z',
  },
  {
    slug: 'speed-racer',
    title: 'Speed Racer',
    description: 'The iconic racing anime following young Speed Racer and his incredible car, the Mach 5. With the help of his family and the mysterious Racer X, Speed competes in dangerous races around the world while uncovering conspiracies and battling rival drivers.',
    year: 1967,
    durationMinutes: 25,
    genres: ['Animation', 'Action', 'Racing'],
    rating: 7.1,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/speed-racer.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/speed-racer.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-01-15T00:00:00Z',
  },
  {
    slug: 'robotech',
    title: 'Robotech',
    description: 'An epic saga spanning three generations of defenders who use alien technology to protect Earth from invasion. When a mysterious alien starship crashes on Earth, humanity reverse-engineers its technology to create transformable mecha, leading to an interstellar conflict that will determine the fate of mankind.',
    year: 1985,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Drama'],
    rating: 8.0,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/robotech.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/robotech.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-02-01T00:00:00Z',
  },
  {
    slug: 'fist-of-the-north-star',
    title: 'Fist of the North Star',
    description: 'In a post-apocalyptic wasteland ravaged by nuclear war, the martial arts master Kenshiro wanders the desert using the deadly Hokuto Shinken fighting style to protect the weak and punish the wicked. His journey leads him to confront his rival brothers and the warlord who kidnapped his beloved.',
    year: 1986,
    durationMinutes: 25,
    genres: ['Animation', 'Action', 'Martial Arts'],
    rating: 7.8,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/fist-of-the-north-star.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/fist-of-the-north-star.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-02-10T00:00:00Z',
  },
  {
    slug: 'vampire-hunter-d',
    title: 'Vampire Hunter D',
    description: 'In the distant future, the world is ruled by vampires and monsters. A young woman named Doris hires the mysterious dhampir D — half human, half vampire — to protect her from the powerful Count Magnus Lee. But D must also contend with his own dark nature and the deadly perils of the Count\'s domain.',
    year: 1985,
    durationMinutes: 80,
    genres: ['Animation', 'Horror', 'Fantasy', 'Action'],
    rating: 7.6,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/vampire-hunter-d.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/vampire-hunter-d.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-03-01T00:00:00Z',
  },
  {
    slug: 'vampire-hunter-d-bloodlust',
    title: 'Vampire Hunter D: Bloodlust',
    description: 'The stunning sequel that raises the bar for gothic anime. When a wealthy nobleman\'s daughter is kidnapped by the vampire Meier Link, D is hired to rescue her. But competing bounty hunters and the deadly Barberois stand in his way, and the truth behind the kidnapping is far more tragic than anyone imagined.',
    year: 2000,
    durationMinutes: 103,
    genres: ['Animation', 'Horror', 'Fantasy', 'Action'],
    rating: 8.1,
    quality: '720p',
    poster: 'https://retrocrush.tv/assets/posters/vampire-hunter-d-bloodlust.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/vampire-hunter-d-bloodlust.jpg',
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: '5.1 Surround' },
      { code: 'ja', label: 'Japanese (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
      { code: 'fr', label: 'French', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-03-01T00:00:00Z',
  },
  {
    slug: 'akira',
    title: 'Akira',
    description: 'Neo-Tokyo, 2019. After a mysterious explosion destroys the old city, biker gang member Tetsuo develops terrifying psychic powers that threaten to tear the metropolis apart. His friend Kaneda must navigate military conspiracies and government experiments to save Tetsuo — and possibly all of humanity.',
    year: 1988,
    durationMinutes: 124,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Thriller'],
    rating: 8.5,
    quality: '720p',
    poster: 'https://retrocrush.tv/assets/posters/akira.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/akira.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
      { code: 'fr', label: 'French', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-01-20T00:00:00Z',
  },
  {
    slug: 'ghost-in-the-shell',
    title: 'Ghost in the Shell',
    description: 'In 2029, cybernetic agent Major Motoko Kusanagi tracks a mysterious hacker known as the Puppet Master through a world where the line between human and machine has blurred beyond recognition. A landmark film that redefined the cyberpunk genre and influenced a generation of filmmakers.',
    year: 1995,
    durationMinutes: 83,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Thriller'],
    rating: 8.3,
    quality: '720p',
    poster: 'https://retrocrush.tv/assets/posters/ghost-in-the-shell.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/ghost-in-the-shell.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-01-25T00:00:00Z',
  },
  {
    slug: 'macross',
    title: 'Super Dimension Fortress Macross',
    description: 'When an alien battleship crashes on Earth, humanity rebuilds it and prepares for the inevitable alien invasion. Amidst the interstellar war, pilot Hikaru Ichijo and singer Lynn Minmay find themselves caught in a love triangle that mirrors the larger conflict between two civilizations.',
    year: 1982,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Romance', 'Action'],
    rating: 7.9,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/macross.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/macross.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-02-15T00:00:00Z',
  },
  {
    slug: 'space-battleship-yamato',
    title: 'Space Battleship Yamato',
    description: 'In the year 2199, Earth is dying from alien radiation bombs. The crew of the resurrected battleship Yamato embarks on a desperate 148,000 light-year journey to the planet Iscandar to retrieve a device that can cleanse the poisoned planet. A pioneering space opera that defined the genre.',
    year: 1974,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Adventure'],
    rating: 7.7,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/space-battleship-yamato.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/space-battleship-yamato.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-02-20T00:00:00Z',
  },
  {
    slug: 'gatchaman',
    title: 'Science Ninja Team Gatchaman',
    description: 'Five young heroes don bird-themed costumes to battle the evil Galactor organization and its mysterious leader, Berg Katse. Using their unique ninja skills and advanced technology, the Gatchaman team protects Earth from alien invaders bent on world domination.',
    year: 1972,
    durationMinutes: 25,
    genres: ['Animation', 'Action', 'Sci-Fi'],
    rating: 7.3,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/gatchaman.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/gatchaman.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-03-10T00:00:00Z',
  },
  {
    slug: 'lupin-iii-part-1',
    title: 'Lupin the Third: Part 1',
    description: 'The world\'s greatest thief, Arsène Lupin III, along with his sharpshooting partner Jigen, master swordsman Goemon, and the beautiful Fujiko Mine, pulls off daring heists while being pursued by the relentless Inspector Zenigata. A stylish and influential caper series.',
    year: 1971,
    durationMinutes: 25,
    genres: ['Animation', 'Action', 'Comedy', 'Crime'],
    rating: 7.6,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/lupin-iii-part-1.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/lupin-iii-part-1.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-03-15T00:00:00Z',
  },
  {
    slug: 'yu-yu-hakusho',
    title: 'Yu Yu Hakusho',
    description: 'After dying while saving a child, teenage delinquent Yusuke Urameshi is given a second chance at life as a Spirit Detective. He must investigate supernatural cases, battle demons, and compete in the deadly Dark Tournament to protect the human world from otherworldly threats.',
    year: 1992,
    durationMinutes: 24,
    genres: ['Animation', 'Action', 'Supernatural', 'Comedy'],
    rating: 8.4,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/yu-yu-hakusho.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/yu-yu-hakusho.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-04-01T00:00:00Z',
  },
  {
    slug: 'sailor-moon',
    title: 'Sailor Moon',
    description: 'Clumsy schoolgirl Usagi Tsukino discovers she is the reincarnation of the legendary Sailor Moon, guardian of love and justice. Together with the other Sailor Guardians, she battles the forces of darkness threatening Earth while searching for the Moon Princess and the legendary Silver Crystal.',
    year: 1992,
    durationMinutes: 24,
    genres: ['Animation', 'Magical Girl', 'Romance', 'Action'],
    rating: 7.9,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/sailor-moon.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/sailor-moon.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-04-10T00:00:00Z',
  },
  {
    slug: 'mobile-suit-gundam',
    title: 'Mobile Suit Gundam',
    description: 'The original series that launched the Real Robot genre. When the Principality of Zeon declares war on the Earth Federation, young Amuro Ray must pilot the experimental Gundam mobile suit to defend the White Base and its crew, while developing a bitter rivalry with the Red Comet, Char Aznable.',
    year: 1979,
    durationMinutes: 25,
    genres: ['Animation', 'Sci-Fi', 'Action', 'Drama'],
    rating: 8.2,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/mobile-suit-gundam.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/mobile-suit-gundam.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-04-15T00:00:00Z',
  },
  {
    slug: 'ninja-scroll',
    title: 'Ninja Scroll',
    description: 'Wandering swordsman Jubei Kibagami is drawn into a deadly conspiracy when he encounters the Eight Devils of Kimon, a group of supernatural ninjas plotting to overthrow the Tokugawa shogunate. With the help of a female ninja and a government spy, Jubei must defeat each devil in increasingly dangerous battles.',
    year: 1993,
    durationMinutes: 94,
    genres: ['Animation', 'Action', 'Fantasy', 'Martial Arts'],
    rating: 7.9,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/ninja-scroll.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/ninja-scroll.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
      { code: 'es', label: 'Spanish', isDefault: false },
    ],
    is4K: false,
    addedAt: '2023-05-01T00:00:00Z',
  },
  {
    slug: 'wicked-city',
    title: 'Wicked City',
    description: 'In a world where demons and humans exist side by side, a peace treaty between the two realms is threatened by radical demons. Human agent Taki and his demon partner Makie must protect a key diplomat while battling grotesque demons from the Black World who want to destroy the fragile peace.',
    year: 1987,
    durationMinutes: 82,
    genres: ['Animation', 'Horror', 'Action', 'Fantasy'],
    rating: 6.9,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/wicked-city.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/wicked-city.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-05-10T00:00:00Z',
  },
  {
    slug: 'dominion-tank-police',
    title: 'Dominion Tank Police',
    description: 'In a polluted cyberpunk Newport City, the Tank Police use excessive force and oversized armored vehicles to fight crime. Young officer Leona Ozaki joins the squad and must prove herself while battling the notorious Buaku gang and navigating the chaotic world of tank warfare in the streets.',
    year: 1988,
    durationMinutes: 50,
    genres: ['Animation', 'Sci-Fi', 'Comedy', 'Action'],
    rating: 7.0,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/dominion-tank-police.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/dominion-tank-police.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-05-15T00:00:00Z',
  },
  {
    slug: 'golgo-13-the-professional',
    title: 'Golgo 13: The Professional',
    description: 'The legendary assassin Duke Togo, codename Golgo 13, accepts a contract to kill the son of a wealthy industrialist. But when the client turns on him, Golgo must use his unmatched skills to survive against an army of hitmen, armed guards, and a deadly helicopter pursuit through the streets of Los Angeles.',
    year: 1983,
    durationMinutes: 91,
    genres: ['Animation', 'Action', 'Thriller'],
    rating: 7.2,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/golgo-13-the-professional.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/golgo-13-the-professional.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-06-01T00:00:00Z',
  },
  {
    slug: 'project-a-ko',
    title: 'Project A-ko',
    description: 'A hilarious send-up of anime tropes! Super-powered schoolgirl A-ko and her wealthy rival B-ko compete for the affections of the ditzy C-ko, while an alien invasion force led by a mysterious captain threatens their city. Non-stop action, comedy, and pop culture references in a cult classic that parodies them all.',
    year: 1986,
    durationMinutes: 86,
    genres: ['Animation', 'Comedy', 'Sci-Fi', 'Action'],
    rating: 6.8,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/project-a-ko.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/project-a-ko.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-06-10T00:00:00Z',
  },
  {
    slug: 'record-of-lodoss-war',
    title: 'Record of Lodoss War',
    description: 'On the accursed island of Lodoss, young warrior Parn embarks on a quest to discover the source of the evil threatening the land. Joined by a party of adventurers including an elf, a dwarf, a wizard, and a cleric, Parn must face dark armies, ancient dragons, and warring kingdoms in this epic high fantasy saga.',
    year: 1990,
    durationMinutes: 25,
    genres: ['Animation', 'Fantasy', 'Adventure'],
    rating: 7.5,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/record-of-lodoss-war.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/record-of-lodoss-war.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-06-15T00:00:00Z',
  },
  {
    slug: 'devilman',
    title: 'Devilman',
    description: 'When his friend Ryo reveals that demons are returning to conquer Earth, timid Akira Fudo merges with the demon Amon to become Devilman — a being with the power of a demon and the heart of a human. As the demon invasion begins, Akira must fight to protect humanity while struggling against his own demonic nature.',
    year: 1972,
    durationMinutes: 25,
    genres: ['Animation', 'Horror', 'Action', 'Supernatural'],
    rating: 7.4,
    quality: '480p',
    poster: 'https://retrocrush.tv/assets/posters/devilman.jpg',
    backdrop: 'https://retrocrush.tv/assets/backdrops/devilman.jpg',
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    addedAt: '2023-07-01T00:00:00Z',
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
 * Convert a curated anime entry to a StreamableMovie.
 */
function toStreamableMovie(anime: CuratedAnime): StreamableMovie {
  return {
    id: `retrocrush-${anime.slug}`,
    title: anime.title,
    description: anime.description,
    year: anime.year,
    duration: formatDuration(anime.durationMinutes),
    durationSeconds: anime.durationMinutes * 60,
    genres: anime.genres,
    rating: anime.rating,
    quality: anime.quality,
    poster: anime.poster,
    backdrop: anime.backdrop,
    source: 'retrocrush',
    sourceUrl: `${RETROCRUSH_BASE}/movies/${anime.slug}`,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: `${RETROCRUSH_BASE}/movies/${anime.slug}`,
    videoType: 'embed',
    languages: anime.languages,
    subtitles: anime.subtitles,
    is4K: anime.is4K,
    isFree: true,
    addedAt: anime.addedAt,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the curated catalog of RetroCrush classic anime.
 */
export async function fetchRetroCrushMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-retrocrush-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    // Curated catalog — no external API call needed.
    // In the future, RetroCrush could expose an API endpoint.
    const movies = RETROCRUSH_CATALOG.map(toStreamableMovie);

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:RetroCrush] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search the RetroCrush catalog for anime matching a query.
 */
export async function searchRetroCrushMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-retrocrush-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const lowerQuery = query.toLowerCase();
    const results = RETROCRUSH_CATALOG
      .filter(anime => {
        const haystack = `${anime.title} ${anime.description} ${anime.genres.join(' ')}`.toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .map(toStreamableMovie);

    setCached(cacheKey, results, CACHE_TTL);
    return results;
  } catch (err) {
    console.warn('[StreamingPipeline:RetroCrush] Search error:', err);
    return [];
  }
}
