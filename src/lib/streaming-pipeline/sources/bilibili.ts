/**
 * Bilibili Free Anime Source
 *
 * Curated catalog of popular anime available for free on Bilibili.
 * Bilibili offers free licensed anime in certain regions (China, Southeast Asia).
 * Uses a hardcoded catalog approach since Bilibili's API requires authentication.
 *
 * Only shared imports: fetchWithTimeout, safeJsonParse from resilience utilities;
 * getCached, setCached from cache module.
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const BILIBILI_TV_BASE = 'https://www.bilibili.tv/en/video';
const BILIBILI_TV_EMBED = 'https://www.bilibili.tv/en/video';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (catalog is curated, rarely changes)

/**
 * Regions where Bilibili free anime is typically available.
 */
const AVAILABLE_REGIONS = ['CN', 'HK', 'TW', 'SG', 'MY', 'TH', 'PH', 'ID', 'VN'];

// ─── Curated Bilibili Anime Catalog ─────────────────────────────────────────

interface BilibiliEntry {
  id: string;
  title: string;
  description: string;
  year: number;
  durationSeconds: number;
  genres: string[];
  rating: number;
  quality: StreamableMovie['quality'];
  bilibiliId: string;
  poster: string;
  backdrop: string;
}

const BILIBILI_CATALOG: BilibiliEntry[] = [
  {
    id: 'bilibili-mob-psycho-100',
    title: 'Mob Psycho 100',
    description: 'Shigeo Kageyama, a.k.a. "Mob," is a boy who has trouble expressing himself, but who happens to be a powerful esper. Mob is determined to live a normal life and keeps his ESP suppressed, but when his emotions surge to a level of 100%, something terrible happens to him. Available free on Bilibili in select regions.',
    year: 2016,
    durationSeconds: 1440,
    genres: ['Animation', 'Action', 'Comedy', 'Supernatural'],
    rating: 8.6,
    quality: '1080p',
    bilibiliId: 'BV1ms411Q7vA',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTlkYzU3MDQtNDcxMS00ZmI1LWEyYzAtNzQ5MDEwZmFhYjVhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BNTlkYzU3MDQtNDcxMS00ZmI1LWEyYzAtNzQ5MDEwZmFhYjVhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-overlord',
    title: 'Overlord',
    description: 'The final hour of the popular virtual reality game Yggdrasil has come. However, Momonga, a powerful wizard and master of the dark guild Ainz Ooal Gown, decides to spend his last few moments in the game as the servers begin to shut down. To his surprise, despite the clock having struck midnight, Momonga is still fully conscious as his character. Available free on Bilibili in select regions.',
    year: 2015,
    durationSeconds: 1440,
    genres: ['Animation', 'Fantasy', 'Action', 'Sci-Fi'],
    rating: 7.9,
    quality: '1080p',
    bilibiliId: 'BV1bx411c7y3',
    poster: 'https://m.media-amazon.com/images/M/MV5BYWUxZWMzY2UtZDAxZS00NmU0LWE5MGMtZDNmYjlkZTcxYzY0XkEyXkFqcGdeQXVyNTc1NTQwMDk@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BYWUxZWMzY2UtZDAxZS00NmU0LWE5MGMtZDNmYjlkZTcxYzY0XkEyXkFqcGdeQXVyNTc1NTQwMDk@._V1_.jpg',
  },
  {
    id: 'bilibili-the-rising-of-the-shield-hero',
    title: 'The Rising of the Shield Hero',
    description: 'Naofumi Iwatani, an uncharismatic otaku who spends his days on games and manga, suddenly finds himself summoned to a parallel universe where he is one of four Cardinal Heroes. Framed and disgraced, he must rise from rock bottom. Available free on Bilibili in select regions.',
    year: 2019,
    durationSeconds: 1440,
    genres: ['Animation', 'Fantasy', 'Action', 'Adventure'],
    rating: 7.8,
    quality: '1080p',
    bilibiliId: 'BV1Sb411H7sS',
    poster: 'https://m.media-amazon.com/images/M/MV5BZjAzZjIwMjMtZjRhNS00MmY4LTk5OTgtZWNkMmQ0MzEzZjlkXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BZjAzZjIwMjMtZjRhNS00MmY4LTk5OTgtZWNkMmQ0MzEzZjlkXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-that-time-i-got-reincarnated-as-a-slime',
    title: 'That Time I Got Reincarnated as a Slime',
    description: 'Satoru Mikami, an ordinary 37-year-old corporate worker, is reborn as a slime monster in a fantasy world after a random encounter with a robber. With his new abilities and friendly nature, he sets out to create a world where all races can live together happily. Available free on Bilibili in select regions.',
    year: 2018,
    durationSeconds: 1440,
    genres: ['Animation', 'Fantasy', 'Comedy', 'Adventure'],
    rating: 8.1,
    quality: '1080p',
    bilibiliId: 'BV1Gs411n7V3',
    poster: 'https://m.media-amazon.com/images/M/MV5BYWM2ZTIwMTktYmVjOC00ZTljLWEyMmUtZDhlZjU1YWUzNTYwXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BYWM2ZTIwMTktYmVjOC00ZTljLWEyMmUtZDhlZjU1YWUzNTYwXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-sword-art-online',
    title: 'Sword Art Online',
    description: 'In the year 2022, virtual reality has progressed by leaps and bounds, and the launch of a new VRMMORPG called Sword Art Online traps players inside the game. Kirito, a skilled player, must survive and clear all one hundred floors of Aincrad to free everyone. Available free on Bilibili in select regions.',
    year: 2012,
    durationSeconds: 1440,
    genres: ['Animation', 'Action', 'Fantasy', 'Romance'],
    rating: 7.5,
    quality: '1080p',
    bilibiliId: 'BV1Xx411F7Kg',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA5MjUyNDk5MF5BMl5BanBnXkFtZTgwMzA0MzE0NzE@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMjA5MjUyNDk5MF5BMl5BanBnXkFtZTgwMzA0MzE0NzE@._V1_.jpg',
  },
  {
    id: 'bilibili-no-game-no-life',
    title: 'No Game No Life',
    description: 'Siblings Sora and Shiro are legendary gamers known as "Blank." One day, they are challenged by the god of games, Tet, and transported to a world where all conflicts are resolved through games. Together, they aim to conquer this new world and challenge Tet once more. Available free on Bilibili in select regions.',
    year: 2014,
    durationSeconds: 1440,
    genres: ['Animation', 'Fantasy', 'Comedy', 'Adventure'],
    rating: 8.0,
    quality: '1080p',
    bilibiliId: 'BV1Zx411K7pD',
    poster: 'https://m.media-amazon.com/images/M/MV5BYmU0MTllMTktZDYwNC00NmFkLWI0ZmQtMjNhZTE4MjEzZWRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BYmU0MTllMTktZDYwNC00NmFkLWI0ZmQtMjNhZTE4MjEzZWRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-attack-on-titan-junior-high',
    title: 'Attack on Titan: Junior High',
    description: 'A hilarious parody where the characters of Attack on Titan attend junior high school. Eren Yeager is furious when Titans steal his beloved cheeseburger lunch, and he vows to eliminate every last Titan at the school. A lighthearted take on the dark fantasy series. Available free on Bilibili in select regions.',
    year: 2015,
    durationSeconds: 1440,
    genres: ['Animation', 'Comedy', 'Parody'],
    rating: 6.9,
    quality: '1080p',
    bilibiliId: 'BV1rx411P7YF',
    poster: 'https://m.media-amazon.com/images/M/MV5BYjE0MzhiNjYtMjIzNy00ZTA1LTk3ZmUtNjJlM2RjZjg1OTk0XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BYjE0MzhiNjYtMjIzNy00ZTA1LTk3ZmUtNjJlM2RjZjg1OTk0XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-re-zero',
    title: 'Re:ZERO - Starting Life in Another World',
    description: 'Natsuki Subaru, an ordinary high school student, is suddenly transported to another world on his way home from the convenience store. With no special powers beyond the ability to return from death, Subaru must navigate a brutal fantasy world and protect those he comes to care about. Available free on Bilibili in select regions.',
    year: 2016,
    durationSeconds: 1440,
    genres: ['Animation', 'Fantasy', 'Drama', 'Thriller'],
    rating: 8.3,
    quality: '1080p',
    bilibiliId: 'BV1ps411Q7va',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjIxMjk0NDI1Nl5BMl5BanBnXkFtZTgwMjU2MTY0OTE@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMjIxMjk0NDI1Nl5BMl5BanBnXkFtZTgwMjU2MTY0OTE@._V1_.jpg',
  },
  {
    id: 'bilibili-konosuba',
    title: "KONOSUBA - God's Blessing on This Wonderful World!",
    description: 'After dying a laughable and pathetic death on his way back from buying a game, Kazuma Satou finds himself sitting before a beautiful but obnoxious goddess named Aqua. Given the chance to be reborn in a fantasy world, Kazuma chooses to bring Aqua along, starting an absurd adventure. Available free on Bilibili in select regions.',
    year: 2016,
    durationSeconds: 1440,
    genres: ['Animation', 'Comedy', 'Fantasy', 'Adventure'],
    rating: 8.1,
    quality: '1080p',
    bilibiliId: 'BV1Ss411Q7G3',
    poster: 'https://m.media-amazon.com/images/M/MV5BZjQ0YmI1MjAtNzQzZS00ZjRjLWE3ZTgtZGVjNTI0OWI0YzE4XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BZjQ0YmI1MjAtNzQzZS00ZjRjLWE3ZTgtZGVjNTI0OWI0YzE4XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-one-punch-man',
    title: 'One Punch Man',
    description: 'Saitama is a hero who only became a hero for fun. After three years of "special" training, he has become so powerful that he can defeat any opponent with a single punch. However, being overwhelmingly strong is surprisingly boring. Available free on Bilibili in select regions.',
    year: 2015,
    durationSeconds: 1440,
    genres: ['Animation', 'Action', 'Comedy', 'Sci-Fi'],
    rating: 8.7,
    quality: '1080p',
    bilibiliId: 'BV1Ns411Q7Px',
    poster: 'https://m.media-amazon.com/images/M/MV5BNjBjOGUyOTktODdmNC00MGRmLTg0ZjMtNjk1NWM0MzIwNjlkXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BNjBjOGUyOTktODdmNC00MGRmLTg0ZjMtNjk1NWM0MzIwNjlkXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-my-hero-academia',
    title: 'My Hero Academia',
    description: 'In a world where most of the population has superpowers called "Quirks," Izuku Midoriya is born without one. Still, he dreams of becoming a hero and enrolls in a prestigious hero academy. A chance encounter with the greatest hero of all changes everything. Available free on Bilibili in select regions.',
    year: 2016,
    durationSeconds: 1440,
    genres: ['Animation', 'Action', 'Adventure', 'Comedy'],
    rating: 8.3,
    quality: '1080p',
    bilibiliId: 'BV1qs411Q7R3',
    poster: 'https://m.media-amazon.com/images/M/MV5BNjRiNmJjZTUtZWYzOS00MzVmLWE4ZjktZDc0MmRiMzI0MmRjXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BNjRiNmJjZTUtZWYzOS00MzVmLWE4ZjktZDc0MmRiMzI0MmRjXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-demon-slayer-kimetsu-no-yaiba',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    description: 'Ever since the death of his father, young Tanjirou takes it upon himself to support his family. Although they live in impoverished conditions, the family is able to live peacefully. That is, until a demon slaughters his entire family and turns his sister Nezuko into a demon. Available free on Bilibili in select regions.',
    year: 2019,
    durationSeconds: 1440,
    genres: ['Animation', 'Action', 'Fantasy', 'Drama'],
    rating: 8.7,
    quality: '1080p',
    bilibiliId: 'BV1tb411H7rc',
    poster: 'https://m.media-amazon.com/images/M/MV5BZjZjNzI5MDctY2Y4YS00NmM4LTljMmItZTFkOTExNGI3ODRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BZjZjNzI5MDctY2Y4YS00NmM4LTljMmItZTFkOTExNGI3ODRhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-tokyo-ghoul',
    title: 'Tokyo Ghoul',
    description: 'A college student named Ken Kaneki encounters a ghoul, a creature that looks like a human but can only survive by eating human flesh. After a violent encounter, Kaneki is transformed into a half-ghoul and must navigate the dangerous world between humans and ghouls. Available free on Bilibili in select regions.',
    year: 2014,
    durationSeconds: 1440,
    genres: ['Animation', 'Action', 'Horror', 'Drama'],
    rating: 7.8,
    quality: '1080p',
    bilibiliId: 'BV1Sx411K7Sg',
    poster: 'https://m.media-amazon.com/images/M/MV5BYjQ5NDI0YTktOWY1OC00NzQ0LThjMjAtZmRlZTc5MzI0NjYxXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BYjQ5NDI0YTktOWY1OC00NzQ0LThjMjAtZmRlZTc5MzI0NjYxXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-erased',
    title: 'ERASED',
    description: 'When tragedy is about to strike, Satoru Fujinuma finds himself sent back several minutes before the accident occurs. But when his mother is murdered, he is sent back 18 years into the past and has the chance to prevent the kidnapping and death of a classmate. Available free on Bilibili in select regions.',
    year: 2016,
    durationSeconds: 1380,
    genres: ['Animation', 'Mystery', 'Drama', 'Thriller'],
    rating: 8.3,
    quality: '1080p',
    bilibiliId: 'BV1ps411Q7vQ',
    poster: 'https://m.media-amazon.com/images/M/MV5BYmMzN2FhNjgtNjI0YS00OTdkLWJjMzUtOWI3MmQ0YzVhYTBhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BYmMzN2FhNjgtNjI0YS00OTdkLWJjMzUtOWI3MmQ0YzVhYTBhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-stein-s-gate',
    title: 'Steins;Gate',
    description: 'Self-proclaimed mad scientist Rintaro Okabe rents out a room in a run-down building in Akihabara, where he and his lab members work on so-called "future gadgets." They accidentally discover a method of time travel using a microwave and a cell phone, leading to dire consequences. Available free on Bilibili in select regions.',
    year: 2011,
    durationSeconds: 1440,
    genres: ['Animation', 'Sci-Fi', 'Thriller', 'Drama'],
    rating: 9.1,
    quality: '720p',
    bilibiliId: 'BV1ix411P7XD',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjUxMzE4ZjMtODRjMy00Yjk0LTgyM2QtNjZiMjI0YTZkMWMzXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMjUxMzE4ZjMtODRjMy00Yjk0LTgyM2QtNjZiMjI0YTZkMWMzXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-the-promised-neverland',
    title: 'The Promised Neverland',
    description: 'At Grace Field House, life couldn\'t be better for the orphans. Though they have no parents, they live happily with their "Mama," Isabella. But when the brightest children discover the horrifying truth about the orphanage, they must plot an impossible escape. Available free on Bilibili in select regions.',
    year: 2019,
    durationSeconds: 1440,
    genres: ['Animation', 'Mystery', 'Thriller', 'Horror'],
    rating: 8.4,
    quality: '1080p',
    bilibiliId: 'BV1ab411H7gs',
    poster: 'https://m.media-amazon.com/images/M/MV5BYjVhZWM1MjgtZjgxNC00ZDU0LWEyYjItMzA0MjQwNjQ0NjZhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BYjVhZWM1MjgtZjgxNC00ZDU0LWEyYjItMzA0MjQwNjQ0NjZhXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-hunter-x-hunter-2011',
    title: 'Hunter x Hunter (2011)',
    description: 'Gon Freecss is a young boy living on Whale Island who discovers that his absent father is a world-renowned Hunter. Determined to follow in his father\'s footsteps, Gon sets out on his own adventure to take the Hunter Examination and find his father. Available free on Bilibili in select regions.',
    year: 2011,
    durationSeconds: 1440,
    genres: ['Animation', 'Action', 'Adventure', 'Fantasy'],
    rating: 9.0,
    quality: '1080p',
    bilibiliId: 'BV1Sx411F7KL',
    poster: 'https://m.media-amazon.com/images/M/MV5BZWU5N2I0MmYtNzRjZi00NTdiLWEwMjItYjc2MWU0Mjg4MTJkXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BZWU5N2I0MmYtNzRjZi00NTdiLWEwMjItYjc2MWU0Mjg4MTJkXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-food-wars',
    title: 'Food Wars! Shokugeki no Soma',
    description: 'Yukihira Soma\'s dream is to become a full-time chef in his father\'s restaurant and surpass his father\'s culinary skills. But just as he finishes middle school, his father closes the restaurant and sends Soma to Totsuki Saryo Culinary Institute, an elite cooking academy. Available free on Bilibili in select regions.',
    year: 2015,
    durationSeconds: 1440,
    genres: ['Animation', 'Comedy', 'Drama'],
    rating: 7.9,
    quality: '1080p',
    bilibiliId: 'BV1Ss411Q7Gx',
    poster: 'https://m.media-amazon.com/images/M/MV5BNjlkMjU3MTItMGMzZC00MjA3LWE4NDktOTZiMmQ1ZmUwODcxXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BNjlkMjU3MTItMGMzZC00MjA3LWE4NDktOTZiMmQ1ZmUwODcxXkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-psycho-pass',
    title: 'Psycho-Pass',
    description: 'In the 22nd century, Japan is governed by the Sibyl System, an omnipresent psychometric scanning system that measures citizens\' mental states and assigns a Crime Coefficient. Inspector Akane Tsunemori works alongside enforcers — latent criminals — to solve cases in this dystopian society. Available free on Bilibili in select regions.',
    year: 2012,
    durationSeconds: 1440,
    genres: ['Animation', 'Sci-Fi', 'Thriller', 'Drama'],
    rating: 8.4,
    quality: '1080p',
    bilibiliId: 'BV1Xx411F7XG',
    poster: 'https://m.media-amazon.com/images/M/MV5BYTg1YjFlMjctLThmZTUtNDk1NS8yNTg5LWEyZmUtZTQ2NTQyMTJhYjE3XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BYTg1YjFlMjctLThmZTUtNDk1NS8yNTg5LWEyZmUtZTQ2NTQyMTJhYjE3XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
  {
    id: 'bilibili-banana-fish',
    title: 'Banana Fish',
    description: 'Ash Lynx, a seventeen-year-old leader of a street gang in New York City, is drawn into a web of conspiracy after encountering a dying man who utters the words "Banana Fish." Together with Japanese photographer\'s assistant Eiji Okumura, Ash uncovers the truth behind a mysterious drug. Available free on Bilibili in select regions.',
    year: 2018,
    durationSeconds: 1440,
    genres: ['Animation', 'Action', 'Drama', 'Mystery'],
    rating: 8.2,
    quality: '1080p',
    bilibiliId: 'BV1as411Q7Pg',
    poster: 'https://m.media-amazon.com/images/M/MV5BZDFmOTNhMzktMjI1OS00ZmI1LTgxYjUtMDFiZjM5Y2JiMjQ5XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BZDFmOTNhMzktMjI1OS00ZmI1LTgxYjUtMDFiZjM5Y2JiMjQ5XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_.jpg',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format seconds to human-readable duration (e.g. "24m").
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
 * Convert a BilibiliEntry to a StreamableMovie.
 */
function toStreamableMovie(entry: BilibiliEntry): StreamableMovie {
  const languages: AudioLanguage[] = [
    { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    { code: 'zh', label: 'Chinese (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' },
  ];

  const subtitles: SubtitleTrack[] = [
    { code: 'zh', label: 'Chinese (Simplified)', isDefault: true },
    { code: 'en', label: 'English', isDefault: false },
    { code: 'zh', label: 'Chinese (Traditional)', isDefault: false },
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
    source: 'bilibili',
    sourceUrl: `${BILIBILI_TV_BASE}/${entry.bilibiliId}`,
    sourceLicense: 'Free to Watch (Region-Limited)',
    videoUrl: `${BILIBILI_TV_EMBED}/${entry.bilibiliId}`,
    videoType: 'embed',
    languages,
    subtitles,
    is4K: entry.quality === '4K',
    isFree: true,
    country: 'CN',
    addedAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch Bilibili free anime catalog.
 * Returns a curated list of anime available for free on Bilibili.
 */
export async function fetchBilibiliMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-bilibili-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const movies = BILIBILI_CATALOG.map(toStreamableMovie);
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:Bilibili] Error fetching movies:', err);
    return [];
  }
}

/**
 * Search Bilibili anime catalog by query.
 * Filters against the curated catalog (no live API search available).
 */
export async function searchBilibiliMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-bilibili-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const q = query.toLowerCase().trim();
    const movies = BILIBILI_CATALOG
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
    console.warn('[StreamingPipeline:Bilibili] Search error:', err);
    return [];
  }
}

/**
 * Check if Bilibili is available in the user's region.
 * Attempts to reach Bilibili's international site and checks the response.
 * Returns true if the site is reachable (likely available in the user's region).
 */
export async function isBilibiliAvailable(): Promise<boolean> {
  const cacheKey = 'streaming-bilibili-availability';
  const cached = getCached<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await fetchWithTimeout('https://www.bilibili.tv', {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Typescribe/1.0)',
      },
    }, 5_000);

    const available = res !== null && res.ok;
    setCached(cacheKey, available, 30 * 60 * 1000); // Cache for 30 minutes
    return available;
  } catch (err) {
    console.warn('[StreamingPipeline:Bilibili] Availability check failed:', err);
    // Default to available — don't block users based on connectivity issues
    return true;
  }
}
