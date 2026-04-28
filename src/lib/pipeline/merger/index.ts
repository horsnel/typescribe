/**
 * Data Merger — Combines data from 22 sources into a unified Movie object.
 *
 * Architecture: 70% Scraping, 30% APIs
 *
 * Scraping Sources (70% — primary data):
 *   Tier A: Wikipedia, SensCritique, Filmweb, CSFD, Dramabeans, AnimeNewsNetwork
 *   Tier B: RottenTomatoes, Metacritic, MyDramaList, CommonSenseMedia,
 *           TheNumbers, FilmAffinity, AlloCiné
 *   Tier C: BoxOfficeMojo, Douban, Kinopoisk
 *
 * API Sources (30% — structural + fallback):
 *   TMDb (structure, posters, cast, genres — source of truth)
 *   OMDb (IMDb rating, RT%, Metascore — fallback for ratings)
 *   YouTube (trailer — only source for video)
 *   NewsAPI (news headlines — primary news source)
 *   Newsdata.io (supplementary news — fallback for news)
 *   Fanart.tv (high-quality logos, clearart, alternative images)
 *   Gemini AI (intelligent review generation)
 *   AniList (anime-specific: MAL score, studios, tags, streaming — always on)
 *   Jikan (MAL proxy — anime scores, rankings, details — free, no key needed)
 *
 * Merge Strategy:
 *   1. TMDb provides the structural foundation (always first)
 *   2. Auto-detect anime (genre 16 = Animation + JP/KR origin, or AniList match)
 *   3. Get IMDb ID from TMDb external_ids
 *   4. Run all scraping sources in parallel (respecting circuit breaker)
 *   5. Run API sources in parallel (OMDb, YouTube, NewsAPI, AniList)
 *   6. Merge with priority: scraped data overrides API data for same fields
 *   7. Anime sources fill anime-specific fields (Jikan, AniList, ANN)
 *   8. APIs fill gaps where scrapers failed
 */

import type { Movie } from '@/lib/types';
import * as TMDb from '@/lib/pipeline/clients/tmdb';
import * as OMDb from '@/lib/pipeline/clients/omdb';
import * as YouTube from '@/lib/pipeline/clients/youtube';
import * as NewsAPI from '@/lib/pipeline/clients/newsapi';
import * as NewsDataIO from '@/lib/pipeline/clients/newsdata';
import * as FanartTV from '@/lib/pipeline/clients/fanart';
import * as GeminiAI from '@/lib/pipeline/clients/gemini';

// Scraping sources
import * as RT from '@/lib/pipeline/scrapers/rottentomatoes';
import * as Metacritic from '@/lib/pipeline/scrapers/metacritic';
import * as MDL from '@/lib/pipeline/scrapers/mydramalist';
import * as CSM from '@/lib/pipeline/scrapers/commonsensemedia';
import * as TheNumbers from '@/lib/pipeline/scrapers/thenumbers';
import * as FilmAffinity from '@/lib/pipeline/scrapers/filmaffinity';
import * as AlloCine from '@/lib/pipeline/scrapers/allocine';
import * as BoxOfficeMojo from '@/lib/pipeline/scrapers/boxofficemojo';
import * as Douban from '@/lib/pipeline/scrapers/douban';
import * as Kinopoisk from '@/lib/pipeline/scrapers/kinopoisk';
import * as Wikipedia from '@/lib/pipeline/scrapers/wikipedia';
import * as SensCritique from '@/lib/pipeline/scrapers/senscritique';
import * as Filmweb from '@/lib/pipeline/scrapers/filmweb';
import * as CSFD from '@/lib/pipeline/scrapers/csfd';
import * as Dramabeans from '@/lib/pipeline/scrapers/dramabeans';

// Anime scraping sources
import * as AnimeNewsNetwork from '@/lib/pipeline/scrapers/animenewsnetwork';

// Anime API clients
import * as AniList from '@/lib/pipeline/clients/anilist';
import * as Jikan from '@/lib/pipeline/clients/jikan';

import { canRequest } from '@/lib/pipeline/core/circuit-breaker';

// ─── Pipeline Configuration ───

export interface PipelineConfig {
  /** API key overrides */
  tmdbApiKey?: string;
  omdbApiKey?: string;
  /** Enable scraping sources (default: true if ScrapingBee configured) */
  enableScraping?: boolean;
  /** Enable API fallback sources (default: true) */
  enableAPIs?: boolean;
  /** Specific scrapers to enable (default: all) */
  scrapers?: string[];
  /** Include AI-generated review (default: true) */
  generateAIReview?: boolean;
  /** Include news headlines (default: true) */
  includeNews?: boolean;
  /** Max concurrent scraper calls (default: 5) */
  maxConcurrency?: number;
}

const DEFAULT_CONFIG: Required<PipelineConfig> = {
  tmdbApiKey: '',
  omdbApiKey: '',
  enableScraping: true,
  enableAPIs: true,
  scrapers: [],
  generateAIReview: true,
  includeNews: true,
  maxConcurrency: 5,
};

// ─── Merged Movie Result ───

export interface MergedMovieResult {
  movie: Movie;
  /** Which sources contributed data */
  sources: string[];
  /** Data quality score 0-100 */
  completeness: number;
  /** Any warnings during merge */
  warnings: string[];
  /** Time taken in ms */
  durationMs: number;
}

// ─── Slug Generation ───

function generateSlug(title: string, id: number): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    + `-${id}`;
}

// ─── Completeness Score (enhanced with scraped fields) ───

function calculateCompleteness(movie: Movie): number {
  const checks: Array<[boolean, number]> = [
    // Core fields (from TMDb)
    [!!movie.title, 8],
    [!!movie.overview, 5],
    [!!movie.poster_path, 5],
    [!!movie.backdrop_path, 3],
    [movie.genres.length > 0, 4],
    [movie.runtime > 0, 2],
    [movie.vote_average > 0, 3],
    [movie.cast.length > 0, 5],
    [!!movie.director, 3],
    [!!movie.tagline, 2],
    [!!movie.release_date, 3],
    [!!movie.origin_country, 2],
    [!!movie.original_language, 1],
    [movie.production_companies.length > 0, 2],
    // Ratings (from scraping/APIs)
    [!!movie.imdb_rating, 4],
    [!!movie.rotten_tomatoes, 4],
    [!!movie.metascore, 3],
    [!!movie.trailer_youtube_id, 3],
    [movie.news_headlines.length > 0, 2],
    [!!movie.ai_review, 3],
    // Scraped data fields
    [!!movie.rt_consensus, 2],
    [!!movie.rt_audience_score, 2],
    [!!movie.wikipedia_extract, 2],
    [!!(movie.regional_ratings && Object.keys(movie.regional_ratings).length > 0), 3],
    [(movie.box_office_worldwide ?? 0) > 0, 2],
    [!!movie.age_rating, 2],
    [!!movie.wikipedia_url, 1],
    // Fanart.tv images
    [!!movie.fanart_logo, 1],
    [!!movie.fanart_clearart, 1],
    // Anime fields
    [!!(movie.anime_mal_score), 3],
    [!!(movie.anime_studios && movie.anime_studios.length > 0), 2],
    [!!(movie.anime_tags && movie.anime_tags.length > 0), 1],
    [!!(movie.anime_streaming && movie.anime_streaming.length > 0), 1],
    [!!movie.anime_season, 1],
    [!!movie.anime_ann_rating, 1],
  ];

  const earned = checks.reduce((sum, [has, weight]) => sum + (has ? weight : 0), 0);
  const total = checks.reduce((sum, [, weight]) => sum + weight, 0);
  return Math.round((earned / total) * 100);
}

// ─── AI Review Generation ───

function generatePlaceholderAIReview(movie: Partial<Movie>): string {
  const parts: string[] = [];

  if (movie.title) {
    parts.push(`${movie.title} is a ${movie.genres?.map(g => g.name).join('/') || 'film'} that delivers on its promises.`);
  }

  if (movie.rt_consensus) {
    parts.push(`Critics consensus: ${movie.rt_consensus}`);
  } else if (movie.vote_average && movie.vote_average >= 7.5) {
    parts.push('Critics and audiences have responded positively, with strong ratings across platforms.');
  } else if (movie.vote_average && movie.vote_average >= 6) {
    parts.push('The film has received mixed-to-positive reviews from critics and audiences alike.');
  } else if (movie.vote_average) {
    parts.push('Reviews have been divided, with some finding merit in its ambitions while others find it falls short.');
  }

  if (movie.director) {
    parts.push(`Director ${movie.director} brings a distinct vision to the material.`);
  }

  if (movie.overview) {
    const firstSentence = movie.overview.split('.')[0];
    parts.push(firstSentence + '.');
  }

  if (movie.tagline) {
    parts.push(`As the tagline goes: "${movie.tagline}"`);
  }

  if (parts.length === 0) {
    return 'A compelling cinematic experience that showcases the art of filmmaking.';
  }

  return parts.join(' ');
}

// ─── Scraper Result Types ───

interface ScrapedData {
  // RT
  rtTomatometer?: number | null;
  rtAudienceScore?: number | null;
  rtConsensus?: string | null;
  rtReviewCount?: number | null;
  // Metacritic
  mcMetascore?: number | null;
  mcUserScore?: number | null;
  mcCriticCount?: number | null;
  mcSummary?: string | null;
  // Wikipedia
  wikiExtract?: string | null;
  wikiUrl?: string | null;
  // Box office
  bomDomestic?: number | null;
  bomInternational?: number | null;
  bomWorldwide?: number | null;
  bomOpening?: number | null;
  tnBudget?: number | null;
  tnDomestic?: number | null;
  tnInternational?: number | null;
  tnWorldwide?: number | null;
  // Age ratings
  csmAgeRating?: string | null;
  csmAdvisories?: string[] | null;
  csmParentalReview?: string | null;
  // Regional ratings
  doubanRating?: number | null;
  kinopoiskRating?: number | null;
  filmaffinityRating?: number | null;
  allocinePressRating?: number | null;
  allocineUserRating?: number | null;
  senscritiqueRating?: number | null;
  filmwebRating?: number | null;
  csfdRating?: number | null;
  mdlRating?: number | null;
  // K-drama
  mdlEpisodes?: number | null;
  mdlSynopsis?: string | null;
  dramabeansRecaps?: Array<{ title: string; url: string }> | null;
  // Anime (AniList + ANN)
  anilistScore?: number | null;         // 0-100
  anilistMeanScore?: number | null;
  anilistStudios?: string[] | null;
  anilistSource?: string | null;
  anilistSeason?: string | null;
  anilistTags?: Array<{ name: string; rank: number }> | null;
  anilistStreaming?: Array<{ site: string; url: string }> | null;
  anilistNextEpisode?: { airingAt: number; episode: number } | null;
  anilistSynonyms?: string[] | null;
  anilistEpisodes?: number | null;
  annRating?: number | null;
  annReviewCount?: number | null;
}

// ─── Run Scrapers in Parallel ───

async function runScrapers(
  movieTitle: string,
  movieYear: string | undefined,
  originCountry: string | undefined,
  mediaType: string | undefined,
  imdbId: string | null,
  enabledScrapers: string[],
  genreIds: number[] = [],
): Promise<{ data: ScrapedData; sources: string[]; warnings: string[] }> {
  const data: ScrapedData = {};
  const sources: string[] = [];
  const warnings: string[] = [];

  const year = movieYear ? parseInt(movieYear.substring(0, 4), 10) : undefined;
  const isKdrama = originCountry === 'KR' && mediaType === 'tv';

  // Anime detection: genre 16 = Animation on TMDb + JP/CN/KR origin
  const isAnime = genreIds.includes(16) && ['JP', 'CN', 'KR'].includes(originCountry || '');

  // Build the list of scraper tasks to run
  const tasks: Array<{ name: string; fn: () => Promise<void> }> = [];

  // ─── Tier A: Zero protection (always try) ───

  if (enabledScrapers.includes('wikipedia') && canRequest('wikipedia')) {
    tasks.push({
      name: 'Wikipedia',
      fn: async () => {
        const result = await Wikipedia.getWikiExtract(movieTitle, year);
        if (result) {
          data.wikiExtract = result.extract;
          data.wikiUrl = result.url;
          sources.push('Wikipedia');
        }
      },
    });
  }

  if (enabledScrapers.includes('senscritique') && canRequest('senscritique')) {
    tasks.push({
      name: 'SensCritique',
      fn: async () => {
        const result = await SensCritique.searchAndScrape(movieTitle, year);
        if (result) {
          data.senscritiqueRating = result.rating;
          sources.push('SensCritique');
        }
      },
    });
  }

  if (enabledScrapers.includes('filmweb') && canRequest('filmweb')) {
    tasks.push({
      name: 'Filmweb',
      fn: async () => {
        const result = await Filmweb.searchAndScrape(movieTitle, year);
        if (result) {
          data.filmwebRating = result.rating;
          sources.push('Filmweb');
        }
      },
    });
  }

  if (enabledScrapers.includes('csfd') && canRequest('csfd')) {
    tasks.push({
      name: 'CSFD',
      fn: async () => {
        const result = await CSFD.searchAndScrape(movieTitle, year);
        if (result) {
          data.csfdRating = result.rating;
          sources.push('CSFD');
        }
      },
    });
  }

  if (enabledScrapers.includes('dramabeans') && isKdrama && canRequest('dramabeans')) {
    tasks.push({
      name: 'Dramabeans',
      fn: async () => {
        const result = await Dramabeans.searchDrama(movieTitle);
        if (result) {
          data.dramabeansRecaps = result.recaps;
          sources.push('Dramabeans');
        }
      },
    });
  }

  // ─── Tier B: Light protection ───

  if (enabledScrapers.includes('rottentomatoes') && canRequest('rottentomatoes')) {
    tasks.push({
      name: 'RottenTomatoes',
      fn: async () => {
        try {
          const searchResults = await RT.searchMovie(movieTitle);
          if (searchResults && searchResults.length > 0) {
            const bestMatch = searchResults[0];
            const rtData = await RT.getConsensus(bestMatch.slug);
            if (rtData) {
              data.rtTomatometer = rtData.tomatometer;
              data.rtAudienceScore = rtData.audienceScore;
              data.rtConsensus = rtData.consensus;
              data.rtReviewCount = rtData.criticReviewCount;
              sources.push('RottenTomatoes');
            }
          }
        } catch (err: any) {
          warnings.push(`RT: ${err.message}`);
        }
      },
    });
  }

  if (enabledScrapers.includes('metacritic') && canRequest('metacritic')) {
    tasks.push({
      name: 'Metacritic',
      fn: async () => {
        const result = await Metacritic.searchAndScrape(movieTitle, year);
        if (result) {
          data.mcMetascore = result.metascore;
          data.mcUserScore = result.userScore;
          data.mcCriticCount = result.criticReviewCount;
          data.mcSummary = result.summary;
          sources.push('Metacritic');
        }
      },
    });
  }

  if (enabledScrapers.includes('mydramalist') && isKdrama && canRequest('mydramalist')) {
    tasks.push({
      name: 'MyDramaList',
      fn: async () => {
        try {
          const searchResults = await MDL.searchDrama(movieTitle);
          if (searchResults && searchResults.length > 0) {
            const mdlData = await MDL.getDramaDetails(searchResults[0].slug);
            if (mdlData) {
              data.mdlRating = mdlData.rating;
              data.mdlEpisodes = mdlData.episodes;
              data.mdlSynopsis = mdlData.synopsis;
              sources.push('MyDramaList');
            }
          }
        } catch (err: any) {
          warnings.push(`MDL: ${err.message}`);
        }
      },
    });
  }

  if (enabledScrapers.includes('commonsensemedia') && canRequest('commonsensemedia')) {
    tasks.push({
      name: 'CommonSenseMedia',
      fn: async () => {
        const result = await CSM.searchAndScrape(movieTitle);
        if (result) {
          data.csmAgeRating = result.ageRating;
          data.csmAdvisories = result.contentAdvisories;
          data.csmParentalReview = result.parentalReview;
          sources.push('CommonSenseMedia');
        }
      },
    });
  }

  if (enabledScrapers.includes('thenumbers') && canRequest('thenumbers')) {
    tasks.push({
      name: 'TheNumbers',
      fn: async () => {
        const result = await TheNumbers.searchAndScrape(movieTitle, year);
        if (result) {
          data.tnBudget = result.budget;
          data.tnDomestic = result.domesticBoxOffice;
          data.tnInternational = result.internationalBoxOffice;
          data.tnWorldwide = result.worldwideBoxOffice;
          sources.push('TheNumbers');
        }
      },
    });
  }

  if (enabledScrapers.includes('filmaffinity') && canRequest('filmaffinity')) {
    tasks.push({
      name: 'FilmAffinity',
      fn: async () => {
        const result = await FilmAffinity.searchAndScrape(movieTitle, year);
        if (result) {
          data.filmaffinityRating = result.rating;
          sources.push('FilmAffinity');
        }
      },
    });
  }

  if (enabledScrapers.includes('allocine') && canRequest('allocine')) {
    tasks.push({
      name: 'AlloCiné',
      fn: async () => {
        const result = await AlloCine.searchAndScrape(movieTitle, year);
        if (result) {
          data.allocinePressRating = result.pressRating;
          data.allocineUserRating = result.userRating;
          sources.push('AlloCiné');
        }
      },
    });
  }

  // ─── Tier C: Medium protection ───

  if (enabledScrapers.includes('boxofficemojo') && canRequest('boxofficemojo')) {
    tasks.push({
      name: 'BoxOfficeMojo',
      fn: async () => {
        const result = imdbId
          ? await BoxOfficeMojo.getByImdbId(imdbId)
          : await BoxOfficeMojo.searchAndScrape(movieTitle, year);
        if (result) {
          data.bomDomestic = result.domesticBoxOffice;
          data.bomInternational = result.internationalBoxOffice;
          data.bomWorldwide = result.worldwideBoxOffice;
          data.bomOpening = result.openingWeekendDomestic;
          sources.push('BoxOfficeMojo');
        }
      },
    });
  }

  if (enabledScrapers.includes('douban') && canRequest('douban')) {
    tasks.push({
      name: 'Douban',
      fn: async () => {
        const result = await Douban.searchAndScrape(movieTitle, year);
        if (result) {
          data.doubanRating = result.rating;
          sources.push('Douban');
        }
      },
    });
  }

  if (enabledScrapers.includes('kinopoisk') && canRequest('kinopoisk')) {
    tasks.push({
      name: 'Kinopoisk',
      fn: async () => {
        const result = await Kinopoisk.searchAndScrape(movieTitle, year);
        if (result) {
          data.kinopoiskRating = result.rating;
          sources.push('Kinopoisk');
        }
      },
    });
  }

  // ─── Anime Scrapers (conditional: only if anime detected) ───

  // MAL data now comes from Jikan API (see API section below)

  if (isAnime || enabledScrapers.includes('animenewsnetwork')) {
    if (enabledScrapers.includes('animenewsnetwork') && canRequest('animenewsnetwork')) {
      tasks.push({
        name: 'AnimeNewsNetwork',
        fn: async () => {
          try {
            const searchResults = await AnimeNewsNetwork.searchAnime(movieTitle);
            if (searchResults && searchResults.length > 0) {
              const annId = searchResults[0].annId;
              const annData = await AnimeNewsNetwork.getAnimeDetails(annId);
              if (annData) {
                data.annRating = annData.rating;
                data.annReviewCount = annData.reviewCount;
                sources.push('AnimeNewsNetwork');
              }
            }
          } catch (err: any) {
            warnings.push(`ANN: ${err.message}`);
          }
        },
      });
    }
  }

  // ─── Run all tasks with bounded concurrency ───

  // Simple concurrent runner: run all tasks and collect results
  // Errors are caught per-task to avoid one failure killing others
  const results = await Promise.allSettled(
    tasks.map(task =>
      task.fn().catch(err => {
        warnings.push(`${task.name}: ${err instanceof Error ? err.message : String(err)}`);
      })
    ),
  );

  // Log any rejected promises
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      warnings.push(`${tasks[i].name}: ${result.reason}`);
    }
  });

  return { data, sources, warnings };
}

// ─── Default Empty Movie ───

function emptyMovie(tmdbId: number): Movie {
  return {
    id: tmdbId, tmdb_id: tmdbId, slug: `unknown-${tmdbId}`, title: 'Unknown',
    original_title: '', overview: '', release_date: '', poster_path: '',
    backdrop_path: '', genres: [], runtime: 0, vote_average: 0, vote_count: 0,
    imdb_rating: '', rotten_tomatoes: '', metascore: '', trailer_youtube_id: '',
    news_headlines: [], ai_review: '', director: '', cast: [], tagline: '',
    budget: 0, revenue: 0, original_language: '', origin_country: '',
    media_type: 'movie', production_companies: [], status: '',
    created_at: new Date().toISOString(),
  };
}

// ─── All Scraper Names ───

export const ALL_SCRAPER_NAMES = [
  'wikipedia', 'senscritique', 'filmweb', 'csfd', 'dramabeans',
  'rottentomatoes', 'metacritic', 'mydramalist', 'commonsensemedia',
  'thenumbers', 'filmaffinity', 'allocine',
  'boxofficemojo', 'douban', 'kinopoisk',
  // Anime (conditional — activated when anime detected)
  'animenewsnetwork',
];

// ─── Main Merge Function ───

/**
 * Merge data from all available sources for a single movie.
 *
 * Flow:
 *   1. TMDb → structural foundation
 *   2. TMDb external_ids → IMDb ID
 *   3. Parallel: All scrapers + OMDb + YouTube + NewsAPI
 *   4. Merge: scraped data > API data for ratings, APIs for structure
 *   5. AI review generation
 *   6. Final assembly with completeness scoring
 */
export async function mergeMovieData(
  tmdbId: number,
  config: PipelineConfig = {}
): Promise<MergedMovieResult> {
  const start = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const sources: string[] = [];
  const warnings: string[] = [];

  // Determine which scrapers to run
  const enabledScrapers = cfg.scrapers.length > 0
    ? cfg.scrapers
    : ALL_SCRAPER_NAMES;

  // ═══════════════════════════════════════════════════════════
  // Step 1: TMDb — Structural Foundation (30% API layer)
  // ═══════════════════════════════════════════════════════════

  let movie: Partial<Movie> = {};

  try {
    const isTvGuess = false; // Will determine after TMDb response
    const tmdbData = await TMDb.getMovieDetails(tmdbId, cfg.tmdbApiKey || undefined);
    if (tmdbData) {
      movie = { ...tmdbData };
      sources.push('TMDb');
    } else {
      // Try TV
      const tvData = await TMDb.getTvDetails(tmdbId, cfg.tmdbApiKey || undefined);
      if (tvData) {
        movie = { ...tvData };
        sources.push('TMDb');
      }
    }
  } catch (error: any) {
    warnings.push(`TMDb error: ${error.message}`);
  }

  // If no TMDb data, we can't continue
  if (!movie.title) {
    return {
      movie: emptyMovie(tmdbId),
      sources,
      completeness: 0,
      warnings: ['No data available from any source'],
      durationMs: Date.now() - start,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Step 2: Get IMDb ID from TMDb (needed for OMDb + BOM)
  // ═══════════════════════════════════════════════════════════

  let imdbId: string | null = null;

  try {
    const isTv = movie.media_type === 'tv';
    const externalIds = isTv
      ? await TMDb.getTvExternalIds(tmdbId, cfg.tmdbApiKey || undefined)
      : await TMDb.getMovieExternalIds(tmdbId, cfg.tmdbApiKey || undefined);
    imdbId = externalIds?.imdb_id || null;
  } catch (error: any) {
    warnings.push(`External IDs error: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════
  // Step 3: Run all sources in parallel
  // ═══════════════════════════════════════════════════════════

  // 3a: Run all scrapers in parallel
  let scrapedData: ScrapedData = {};
  let scraperSources: string[] = [];
  let scraperWarnings: string[] = [];

  if (cfg.enableScraping) {
    const scrapeResult = await runScrapers(
      movie.title,
      movie.release_date,
      movie.origin_country,
      movie.media_type,
      imdbId,
      enabledScrapers,
      movie.genres?.map(g => g.id) || [],
    );
    scrapedData = scrapeResult.data;
    scraperSources = scrapeResult.sources;
    scraperWarnings = scrapeResult.warnings;
  }

  // 3b: Run API sources in parallel (OMDb + YouTube + NewsAPI + NewsData + FanartTV + AniList + Jikan)
  let omdbData: OMDb.OMDbMovieData | null = null;
  let youtubeTrailerId: string | null = null;
  let newsHeadlines: Array<{ title: string; url: string; source: string; date: string }> = [];
  let fanartData: FanartTV.FanartResult | null = null;
  let anilistData: AniList.AniListResult | null = null;
  let jikanData: Jikan.JikanAnimeResult | null = null;

  if (cfg.enableAPIs) {
    const [omdbResult, youtubeResult, newsResult, newsDataResult, fanartResult, anilistResult, jikanResult] = await Promise.allSettled([
      // OMDb
      (async () => {
        if (!imdbId) return null;
        const data = await OMDb.getByImdbId(imdbId, cfg.omdbApiKey || undefined);
        if (data) sources.push('OMDb');
        return data;
      })(),
      // YouTube
      (async () => {
        if (!process.env.YOUTUBE_API_KEY) return null;
        const result = await YouTube.searchTrailer(movie.title!, movie.release_date ? parseInt(movie.release_date.substring(0, 4), 10) : undefined);
        if (result) sources.push('YouTube');
        return result;
      })(),
      // NewsAPI (primary news source)
      (async () => {
        if (!process.env.NEWS_API_KEY || !cfg.includeNews) return [];
        const articles = await NewsAPI.getMovieNews(movie.title!);
        if (articles.length > 0) sources.push('NewsAPI');
        return articles;
      })(),
      // Newsdata.io (supplementary news — used if NewsAPI returns few results)
      (async () => {
        if (!NewsDataIO.isNewsDataConfigured() || !cfg.includeNews) return [];
        const articles = await NewsDataIO.getMovieNews(movie.title!, 5);
        if (articles.length > 0) sources.push('NewsDataIO');
        return articles;
      })(),
      // Fanart.tv (high-quality images, logos, clearart)
      (async () => {
        if (!FanartTV.isFanartConfigured()) return null;
        const images = await FanartTV.getMovieImages(tmdbId);
        if (images && (images.logo || images.clearart || images.background)) {
          sources.push('FanartTV');
        }
        return images;
      })(),
      // AniList (anime-specific data — always tries, no key needed)
      (async () => {
        if (!AniList.isAniListConfigured()) return null;
        // Try by TMDb ID first, then by title search
        let result = await AniList.getAnimeByTmdbId(tmdbId);
        if (!result && movie.title) {
          const searchResults = await AniList.searchAnime(movie.title);
          result = searchResults?.[0] || null;
        }
        if (result) {
          sources.push('AniList');
        }
        return result;
      })(),
      // Jikan (MAL proxy — replaces MAL scraping, no key needed)
      (async () => {
        if (!Jikan.isJikanConfigured()) return null;
        // Search by title
        const searchResults = await Jikan.searchAnime(movie.title!, 3);
        if (searchResults && searchResults.length > 0) {
          sources.push('Jikan');
          return searchResults[0]; // Return best match with full data
        }
        return null;
      })(),
    ]);

    // Extract results
    if (omdbResult.status === 'fulfilled' && omdbResult.value) {
      omdbData = omdbResult.value;
    }
    if (youtubeResult.status === 'fulfilled' && youtubeResult.value) {
      youtubeTrailerId = youtubeResult.value.videoId;
    }
    if (newsResult.status === 'fulfilled' && newsResult.value) {
      const newsArticles = Array.isArray(newsResult.value) ? newsResult.value : [];
      newsHeadlines = newsArticles.map((a: any) => ({
        title: a.title || '',
        url: a.url || '',
        source: a.source || '',
        date: a.publishedAt || '',
      }));
    }
    // Supplement with NewsData.io if we got few results
    if (newsHeadlines.length < 3 && newsDataResult.status === 'fulfilled' && newsDataResult.value) {
      const ndArticles = Array.isArray(newsDataResult.value) ? newsDataResult.value : [];
      const additional = ndArticles.map((a: any) => ({
        title: a.title || '',
        url: a.link || a.url || '',
        source: a.source_id || a.source || '',
        date: a.pubDate || a.publishedAt || '',
      }));
      // Add articles that aren't duplicates
      const existingUrls = new Set(newsHeadlines.map(n => n.url));
      for (const a of additional) {
        if (!existingUrls.has(a.url) && a.title) {
          newsHeadlines.push(a);
        }
      }
    }
    // Fanart.tv results
    if (fanartResult.status === 'fulfilled' && fanartResult.value) {
      fanartData = fanartResult.value;
    }
    // AniList results
    if (anilistResult.status === 'fulfilled' && anilistResult.value) {
      anilistData = anilistResult.value;
    }
    // Jikan results
    if (jikanResult.status === 'fulfilled' && jikanResult.value) {
      jikanData = jikanResult.value;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 4: Merge — Scraped data > API data > TMDb defaults
  // ═══════════════════════════════════════════════════════════

  // --- Ratings (Priority: Scraped > OMDb > TMDb) ---

  // IMDb rating: OMDb is the only source for this
  if (omdbData?.imdbRating !== null && omdbData?.imdbRating !== undefined) {
    movie.imdb_rating = String(omdbData.imdbRating);
  }

  // Rotten Tomatoes: Scraped RT > OMDb
  if (scrapedData.rtTomatometer !== null && scrapedData.rtTomatometer !== undefined) {
    movie.rotten_tomatoes = `${scrapedData.rtTomatometer}%`;
  } else if (omdbData?.rottenTomatoesScore !== null && omdbData?.rottenTomatoesScore !== undefined) {
    movie.rotten_tomatoes = `${omdbData.rottenTomatoesScore}%`;
  }

  // RT Audience Score: Only from scraped RT
  if (scrapedData.rtAudienceScore !== null && scrapedData.rtAudienceScore !== undefined) {
    movie.rt_audience_score = `${scrapedData.rtAudienceScore}%`;
  }

  // RT Consensus: Only from scraped RT
  if (scrapedData.rtConsensus) {
    movie.rt_consensus = scrapedData.rtConsensus;
  } else if (omdbData?.rtConsensus) {
    movie.rt_consensus = omdbData.rtConsensus;
  }

  // RT Review Count
  if (scrapedData.rtReviewCount !== null && scrapedData.rtReviewCount !== undefined) {
    movie.rt_review_count = scrapedData.rtReviewCount;
  }

  // Metascore: Scraped Metacritic > OMDb
  if (scrapedData.mcMetascore !== null && scrapedData.mcMetascore !== undefined) {
    movie.metascore = String(scrapedData.mcMetascore);
  } else if (omdbData?.metascore !== null && omdbData?.metascore !== undefined) {
    movie.metascore = String(omdbData.metascore);
  }

  // --- Trailer ---
  // YouTube API is the primary source; TMDb /videos is already in movie.trailer_youtube_id
  if (youtubeTrailerId && !movie.trailer_youtube_id) {
    movie.trailer_youtube_id = youtubeTrailerId;
  }

  // --- News ---
  if (newsHeadlines.length > 0 && (!movie.news_headlines || movie.news_headlines.length === 0)) {
    movie.news_headlines = newsHeadlines;
  }

  // --- Box Office: TheNumbers > BoxOfficeMojo > TMDb ---
  const boxDomestic = scrapedData.tnDomestic ?? scrapedData.bomDomestic;
  const boxInternational = scrapedData.tnInternational ?? scrapedData.bomInternational;
  const boxWorldwide = scrapedData.tnWorldwide ?? scrapedData.bomWorldwide;
  const budgetReported = scrapedData.tnBudget;

  if (boxDomestic) movie.box_office_domestic = boxDomestic;
  if (boxInternational) movie.box_office_international = boxInternational;
  if (boxWorldwide) movie.box_office_worldwide = boxWorldwide;
  if (budgetReported) movie.budget_reported = budgetReported;

  // Override TMDb budget/revenue if we have scraped box office data
  if (budgetReported && !movie.budget) movie.budget = budgetReported;
  if (boxWorldwide && !movie.revenue) movie.revenue = boxWorldwide;

  // --- Age Ratings (Common Sense Media) ---
  if (scrapedData.csmAgeRating) movie.age_rating = scrapedData.csmAgeRating;
  if (scrapedData.csmAdvisories && scrapedData.csmAdvisories.length > 0) {
    movie.content_advisories = scrapedData.csmAdvisories;
  }
  if (scrapedData.csmParentalReview) movie.parental_review = scrapedData.csmParentalReview;

  // --- Wikipedia ---
  if (scrapedData.wikiExtract) movie.wikipedia_extract = scrapedData.wikiExtract;
  if (scrapedData.wikiUrl) movie.wikipedia_url = scrapedData.wikiUrl;

  // --- Regional Ratings ---
  const regionalRatings: NonNullable<Movie['regional_ratings']> = {};
  if (scrapedData.doubanRating !== null && scrapedData.doubanRating !== undefined) {
    regionalRatings.douban = scrapedData.doubanRating;
  }
  if (scrapedData.kinopoiskRating !== null && scrapedData.kinopoiskRating !== undefined) {
    regionalRatings.kinopoisk = scrapedData.kinopoiskRating;
  }
  if (scrapedData.filmaffinityRating !== null && scrapedData.filmaffinityRating !== undefined) {
    regionalRatings.filmaffinity = scrapedData.filmaffinityRating;
  }
  if (scrapedData.allocineUserRating !== null && scrapedData.allocineUserRating !== undefined) {
    regionalRatings.allocine = scrapedData.allocineUserRating;
  }
  if (scrapedData.senscritiqueRating !== null && scrapedData.senscritiqueRating !== undefined) {
    regionalRatings.senscritique = scrapedData.senscritiqueRating;
  }
  if (scrapedData.filmwebRating !== null && scrapedData.filmwebRating !== undefined) {
    regionalRatings.filmweb = scrapedData.filmwebRating;
  }
  if (scrapedData.csfdRating !== null && scrapedData.csfdRating !== undefined) {
    regionalRatings.csfd = scrapedData.csfdRating;
  }
  if (scrapedData.mdlRating !== null && scrapedData.mdlRating !== undefined) {
    regionalRatings.mdl = scrapedData.mdlRating;
  }

  if (Object.keys(regionalRatings).length > 0) {
    movie.regional_ratings = regionalRatings;
  }

  // --- K-drama specific ---
  if (scrapedData.mdlEpisodes) movie.episodes = scrapedData.mdlEpisodes;
  if (scrapedData.mdlSynopsis && (!movie.overview || movie.overview.length < 50)) {
    movie.overview = scrapedData.mdlSynopsis;
  }
  if (scrapedData.dramabeansRecaps && scrapedData.dramabeansRecaps.length > 0) {
    movie.dramabeans_recaps = scrapedData.dramabeansRecaps;
  }

  // --- Anime Detection & Anime-Specific Fields ---
  // Auto-detect anime: Animation genre (16) + JP/CN/KR origin, or AniList/Jikan match
  const genreIds = movie.genres?.map(g => g.id) || [];
  const isAnime = (genreIds.includes(16) && ['JP', 'CN', 'KR'].includes(movie.origin_country || ''))
    || !!anilistData
    || !!jikanData;

  if (isAnime) {
    movie.is_anime = true;
    movie.media_type = 'anime';

    // Jikan data (from API — replaces MAL scraper)
    if (jikanData?.score !== null && jikanData?.score !== undefined) {
      movie.anime_mal_score = jikanData.score;
    }
    if (jikanData?.rank !== null && jikanData?.rank !== undefined) {
      movie.anime_mal_rank = jikanData.rank;
    }
    if (jikanData?.popularity !== null && jikanData?.popularity !== undefined) {
      movie.anime_mal_popularity = jikanData.popularity;
    }
    if (jikanData?.members !== null && jikanData?.members !== undefined) {
      movie.anime_mal_members = jikanData.members;
    }
    if (jikanData?.studios && jikanData.studios.length > 0) {
      movie.anime_studios = jikanData.studios;
    }
    if (jikanData?.source) {
      movie.anime_source = jikanData.source;
    }
    if (jikanData?.season && jikanData?.year) {
      const seasonName = jikanData.season.charAt(0).toUpperCase() + jikanData.season.slice(1).toLowerCase();
      movie.anime_season = `${seasonName} ${jikanData.year}`;
    }
    if (jikanData?.genres && jikanData.genres.length > 0) {
      // Merge Jikan genres into existing genres if they add new ones
      const existingGenreNames = new Set((movie.genres || []).map(g => g.name.toLowerCase()));
      for (const gName of jikanData.genres) {
        if (!existingGenreNames.has(gName.toLowerCase())) {
          movie.genres = [...(movie.genres || []), { id: -1, name: gName }];
        }
      }
    }
    if (jikanData?.episodes !== null && jikanData?.episodes !== undefined) {
      movie.episodes = jikanData.episodes;
      movie.anime_episodes_aired = jikanData.episodes;
    }
    // MAL ID from Jikan result
    if (jikanData?.malId && !movie.anime_mal_id) {
      movie.anime_mal_id = jikanData.malId;
    }

    // AniList data (from API — fills gaps and adds unique data)
    if (anilistData) {
      // MAL ID from AniList cross-reference
      if (anilistData.malId && !movie.anime_mal_id) {
        movie.anime_mal_id = anilistData.malId;
      }
      // AniList score (0-100) — convert to 0-10 if not already set by Jikan
      if (anilistData.meanScore !== null && anilistData.meanScore !== undefined && !movie.anime_mal_score) {
        movie.anime_mal_score = Math.round((anilistData.meanScore / 10) * 10) / 10; // 0-10 scale
      }
      // Studios (AniList fills if MAL didn't provide)
      if (anilistData.studios && anilistData.studios.length > 0 && !movie.anime_studios) {
        movie.anime_studios = anilistData.studios;
      }
      // Source material
      if (anilistData.source && !movie.anime_source) {
        movie.anime_source = anilistData.source;
      }
      // Season
      if (anilistData.season && anilistData.seasonYear && !movie.anime_season) {
        const seasonName = anilistData.season.charAt(0).toUpperCase() + anilistData.season.slice(1).toLowerCase();
        movie.anime_season = `${seasonName} ${anilistData.seasonYear}`;
      }
      // Tags (unique to AniList)
      if (anilistData.tags && anilistData.tags.length > 0) {
        movie.anime_tags = anilistData.tags
          .filter(t => t.rank >= 60) // Only high-relevance tags
          .map(t => t.name);
      }
      // Streaming links (unique to AniList)
      if (anilistData.streaming && anilistData.streaming.length > 0) {
        movie.anime_streaming = anilistData.streaming.map(s => ({
          platform: s.site,
          url: s.url,
        }));
      }
      // Synonyms / alternative titles
      if (anilistData.title) {
        const synonyms: string[] = [];
        if (anilistData.title.romaji && anilistData.title.romaji !== movie.title) {
          synonyms.push(anilistData.title.romaji);
        }
        if (anilistData.title.native) {
          synonyms.push(anilistData.title.native);
        }
        if (anilistData.title.english && anilistData.title.english !== movie.title
            && anilistData.title.english !== anilistData.title.romaji) {
          synonyms.push(anilistData.title.english);
        }
        if (synonyms.length > 0) {
          movie.anime_synonyms = synonyms;
        }
      }
      // Next airing episode
      if (anilistData.nextAiringEpisode) {
        movie.anime_next_episode = new Date(anilistData.nextAiringEpisode.airingAt * 1000).toISOString();
        movie.anime_episodes_aired = anilistData.nextAiringEpisode.episode - 1;
      }
      // Episode count from AniList
      if (anilistData.episodes !== null && anilistData.episodes !== undefined && !movie.episodes) {
        movie.episodes = anilistData.episodes;
      }
      // Runtime per episode
      if (anilistData.duration && !movie.runtime) {
        movie.runtime = anilistData.duration;
      }
      // Cover/banner images as fallback
      if (anilistData.coverImage?.large && !movie.poster_path) {
        movie.poster_path = anilistData.coverImage.large;
      }
      if (anilistData.bannerImage && !movie.backdrop_path) {
        movie.backdrop_path = anilistData.bannerImage;
      }
      // Use AniList description if TMDb overview is empty
      if (anilistData.description && (!movie.overview || movie.overview.length < 50)) {
        // Strip HTML tags from AniList description
        movie.overview = anilistData.description.replace(/<[^>]*>/g, '').trim();
      }
    }

    // ANN data (from scraper)
    if (scrapedData.annRating !== null && scrapedData.annRating !== undefined) {
      movie.anime_ann_rating = scrapedData.annRating;
    }
    if (scrapedData.annReviewCount !== null && scrapedData.annReviewCount !== undefined) {
      movie.anime_ann_review_count = scrapedData.annReviewCount;
    }
  }

  // --- Director from OMDb fallback ---
  if (omdbData?.director && !movie.director) {
    movie.director = omdbData.director;
  }

  // --- Fanart.tv images (high-quality logos, clearart, backgrounds) ---
  if (fanartData) {
    if (fanartData.logo) movie.fanart_logo = fanartData.logo;
    if (fanartData.clearart) movie.fanart_clearart = fanartData.clearart;
    if (fanartData.background && !movie.backdrop_path) {
      movie.backdrop_path = fanartData.background;
    }
    if (fanartData.poster && !movie.poster_path) {
      movie.poster_path = fanartData.poster;
    }
    if (fanartData.banner) movie.fanart_banner = fanartData.banner;
    if (fanartData.thumb) movie.fanart_thumb = fanartData.thumb;
  }

  // ═══════════════════════════════════════════════════════════
  // Step 5: AI Review Generation (Gemini or placeholder)
  // ═══════════════════════════════════════════════════════════

  if (cfg.generateAIReview && !movie.ai_review) {
    if (GeminiAI.isGeminiConfigured()) {
      try {
        const geminiResult = await GeminiAI.generateAIReview({
          title: movie.title,
          overview: movie.overview,
          genres: movie.genres,
          director: movie.director,
          tagline: movie.tagline,
          release_date: movie.release_date,
          runtime: movie.runtime,
          vote_average: movie.vote_average,
          imdb_rating: movie.imdb_rating,
          rotten_tomatoes: movie.rotten_tomatoes,
          metascore: movie.metascore,
          rt_consensus: movie.rt_consensus,
          cast: movie.cast,
          origin_country: movie.origin_country,
          original_language: movie.original_language,
          media_type: movie.media_type as 'movie' | 'tv' | undefined,
          episodes: movie.episodes,
          tmdb_id: tmdbId,
        });
        movie.ai_review = geminiResult.review;
        if (geminiResult.model !== 'placeholder') {
          sources.push('Gemini');
        }
      } catch (err: any) {
        warnings.push(`Gemini review error: ${err.message}`);
        movie.ai_review = generatePlaceholderAIReview(movie);
      }
    } else {
      movie.ai_review = generatePlaceholderAIReview(movie);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 6: Final Assembly
  // ═══════════════════════════════════════════════════════════

  // Merge all source lists
  const allSources = [...new Set([...sources, ...scraperSources])];
  const allWarnings = [...warnings, ...scraperWarnings];

  const finalMovie: Movie = {
    id: movie.id || tmdbId,
    tmdb_id: tmdbId,
    slug: movie.slug || generateSlug(movie.title || 'unknown', tmdbId),
    title: movie.title || '',
    original_title: movie.original_title || '',
    overview: movie.overview || '',
    release_date: movie.release_date || '',
    poster_path: movie.poster_path || '',
    backdrop_path: movie.backdrop_path || '',
    genres: movie.genres || [],
    runtime: movie.runtime || 0,
    vote_average: movie.vote_average || 0,
    vote_count: movie.vote_count || 0,
    imdb_rating: movie.imdb_rating || '',
    rotten_tomatoes: movie.rotten_tomatoes || '',
    metascore: movie.metascore || '',
    trailer_youtube_id: movie.trailer_youtube_id || '',
    news_headlines: movie.news_headlines || [],
    ai_review: movie.ai_review || '',
    director: movie.director || '',
    cast: movie.cast || [],
    tagline: movie.tagline || '',
    budget: movie.budget || 0,
    revenue: movie.revenue || 0,
    original_language: movie.original_language || '',
    origin_country: movie.origin_country || '',
    media_type: movie.media_type || 'movie',
    production_companies: movie.production_companies || [],
    status: movie.status || '',
    created_at: movie.created_at || new Date().toISOString(),
    // Scraped fields
    rt_audience_score: movie.rt_audience_score,
    rt_consensus: movie.rt_consensus,
    rt_review_count: movie.rt_review_count,
    box_office_domestic: movie.box_office_domestic,
    box_office_international: movie.box_office_international,
    box_office_worldwide: movie.box_office_worldwide,
    budget_reported: movie.budget_reported,
    age_rating: movie.age_rating,
    content_advisories: movie.content_advisories,
    parental_review: movie.parental_review,
    regional_ratings: movie.regional_ratings,
    episodes: movie.episodes,
    air_schedule: movie.air_schedule,
    dramabeans_recaps: movie.dramabeans_recaps,
    wikipedia_extract: movie.wikipedia_extract,
    wikipedia_url: movie.wikipedia_url,
    // Fanart.tv images
    fanart_logo: movie.fanart_logo,
    fanart_clearart: movie.fanart_clearart,
    fanart_banner: movie.fanart_banner,
    fanart_thumb: movie.fanart_thumb,
    // Anime-specific fields
    is_anime: movie.is_anime,
    anime_mal_id: movie.anime_mal_id,
    anime_mal_score: movie.anime_mal_score,
    anime_mal_rank: movie.anime_mal_rank,
    anime_mal_popularity: movie.anime_mal_popularity,
    anime_mal_members: movie.anime_mal_members,
    anime_studios: movie.anime_studios,
    anime_source: movie.anime_source,
    anime_season: movie.anime_season,
    anime_synonyms: movie.anime_synonyms,
    anime_tags: movie.anime_tags,
    anime_episodes_aired: movie.anime_episodes_aired,
    anime_next_episode: movie.anime_next_episode,
    anime_streaming: movie.anime_streaming,
    anime_ann_rating: movie.anime_ann_rating,
    anime_ann_review_count: movie.anime_ann_review_count,
    // Pipeline metadata
    scraped_sources: scraperSources,
    scraped_at: new Date().toISOString(),
    data_completeness: 0, // Will be set below
  };

  const completeness = calculateCompleteness(finalMovie);
  finalMovie.data_completeness = completeness;

  return {
    movie: finalMovie,
    sources: allSources,
    completeness,
    warnings: allWarnings,
    durationMs: Date.now() - start,
  };
}

// ─── Batch Merge ───

export interface BatchMergeResult {
  results: MergedMovieResult[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
}

/**
 * Merge data for multiple movies in sequence (with rate limiting).
 */
export async function mergeMovieBatch(
  tmdbIds: number[],
  config: PipelineConfig = {}
): Promise<BatchMergeResult> {
  const results: MergedMovieResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  const start = Date.now();

  for (const id of tmdbIds) {
    try {
      const result = await mergeMovieData(id, config);
      results.push(result);
      if (result.completeness > 0) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error: any) {
      results.push({
        movie: emptyMovie(id),
        sources: [],
        completeness: 0,
        warnings: [`Failed: ${error.message}`],
        durationMs: 0,
      });
      failureCount++;
    }

    // Small delay between movies to respect rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  return {
    results,
    totalProcessed: tmdbIds.length,
    successCount,
    failureCount,
    totalDurationMs: Date.now() - start,
  };
}
