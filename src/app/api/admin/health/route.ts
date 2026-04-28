import { NextRequest, NextResponse } from 'next/server';
import { getPipelineHealthReport } from '@/lib/pipeline/core/health-monitor';
import { getPipelineStatus } from '@/lib/pipeline';

/**
 * GET /api/admin/health
 *
 * Comprehensive health check endpoint that returns:
 *  - All scraper details (URL, tier, health, circuit breaker, success rate)
 *  - All API client details (configured, endpoints, daily usage)
 *  - ScrapingAnt key usage
 *  - Overall pipeline status
 */
export async function GET(req: NextRequest) {
  try {
    const healthReport = await getPipelineHealthReport();
    const pipelineStatus = getPipelineStatus();

    // Scraper source metadata
    const SCRAPER_META: Record<string, { url: string; provides: string; region: string }> = {
      wikipedia:         { url: 'https://en.wikipedia.org', provides: 'Plot summaries, production info, awards, box office', region: 'Global' },
      senscritique:      { url: 'https://www.senscritique.com', provides: 'French ratings, reviews, rankings', region: 'France' },
      filmweb:           { url: 'https://www.filmweb.pl', provides: 'Polish ratings, reviews, user scores', region: 'Poland' },
      csfd:              { url: 'https://www.csfd.cz', provides: 'Czech-Slovak ratings, reviews, user scores', region: 'Czech Republic' },
      dramabeans:        { url: 'https://www.dramabeans.com', provides: 'K-drama recaps, reviews, episode ratings', region: 'Korea' },
      animenewsnetwork:  { url: 'https://www.animenewsnetwork.com', provides: 'Anime news, reviews, ratings, encyclopedia', region: 'Global' },
      rottentomatoes:    { url: 'https://www.rottentomatoes.com', provides: 'Tomatometer, audience score, critic consensus', region: 'US/Global' },
      metacritic:        { url: 'https://www.metacritic.com', provides: 'Metascore, user score, critic reviews', region: 'US/Global' },
      mydramalist:       { url: 'https://mydramalist.com', provides: 'Asian drama ratings, reviews, watchlists', region: 'Asia/Global' },
      commonsensemedia:  { url: 'https://www.commonsensemedia.org', provides: 'Parental guidance, age ratings, family reviews', region: 'US' },
      thenumbers:        { url: 'https://www.the-numbers.com', provides: 'Box office data, budgets, financials', region: 'US/Global' },
      filmaffinity:      { url: 'https://www.filmaffinity.com', provides: 'Spanish/Intl ratings, reviews, rankings', region: 'Spain/Global' },
      allocine:          { url: 'https://www.allocine.fr', provides: 'French ratings, press reviews, user scores', region: 'France' },
      myanimelist:       { url: 'https://myanimelist.net', provides: 'Anime/manga scores, rankings, user lists', region: 'Global' },
      boxofficemojo:     { url: 'https://www.boxofficemojo.com', provides: 'Box office grosses, weekly/daily charts', region: 'US/Global' },
      douban:            { url: 'https://movie.douban.com', provides: 'Chinese ratings, reviews, short comments', region: 'China' },
      kinopoisk:         { url: 'https://www.kinopoisk.ru', provides: 'Russian ratings, reviews, film database', region: 'Russia' },
    };

    // API client metadata
    const API_META: Record<string, { url: string; provides: string; freeLimit: string }> = {
      tmdb:     { url: 'https://api.themoviedb.org/3', provides: 'Structure, posters, cast, genres, credits, videos — source of truth', freeLimit: 'Unlimited (rate-limited)' },
      omdb:     { url: 'https://www.omdbapi.com', provides: 'IMDb rating, RT %, Metascore, plot, awards', freeLimit: '1,000/day (free tier)' },
      anilist:  { url: 'https://graphql.anilist.co', provides: 'Anime search, trending, seasonal, streaming links', freeLimit: 'Unlimited (rate-limited)' },
      jikan:    { url: 'https://api.jikan.moe/v4', provides: 'MyAnimeList proxy — anime details, seasonal, top', freeLimit: '3 req/s (unauthenticated)' },
      kitsu:    { url: 'https://kitsu.io/api/edge', provides: 'Anime streaming links, search, categories', freeLimit: 'Unlimited (rate-limited)' },
      youtube:  { url: 'https://www.googleapis.com/youtube/v3', provides: 'Trailer video search and embed URLs', freeLimit: '10,000 units/day' },
      newsapi:  { url: 'https://newsapi.org/v2', provides: 'Movie news headlines, entertainment articles', freeLimit: '100 req/day (developer)' },
      newsdata: { url: 'https://newsdata.io/api/1', provides: 'Supplementary news — fallback source', freeLimit: '200 req/day (free)' },
      fanart:   { url: 'https://webservice.fanart.tv/v3', provides: 'High-quality logos, clearart, backgrounds', freeLimit: 'Unlimited (personal API key)' },
      gemini:   { url: 'https://generativelanguage.googleapis.com/v1beta', provides: 'AI-powered review generation, summaries', freeLimit: '15 RPM (free tier)' },
    };

    // Enrich scrapers with metadata
    const enrichedScrapers = healthReport.scrapers.map(scraper => ({
      ...scraper,
      meta: SCRAPER_META[scraper.name] || { url: '', provides: 'Unknown', region: 'Unknown' },
    }));

    // Build API status with real configured values from pipeline status
    const sources = pipelineStatus.sources;
    const apiConfigMap: Record<string, boolean> = {
      tmdb: sources.tmdb,
      omdb: sources.omdb,
      anilist: sources.anilist,
      jikan: true,
      kitsu: true,
      youtube: sources.youtube,
      newsapi: sources.newsapi,
      newsdata: sources.newsdataIo,
      fanart: sources.fanartTv,
      gemini: sources.gemini,
    };

    // Build enriched API client list
    const finalApis = Object.entries(API_META).map(([key, meta]) => ({
      key,
      ...meta,
      configured: apiConfigMap[key] ?? false,
      dailyUsage: key === 'omdb' ? {
        used: healthReport.apiClients.omdb.dailyUsed,
        limit: healthReport.apiClients.omdb.dailyLimit,
        remaining: healthReport.apiClients.omdb.dailyLimit - healthReport.apiClients.omdb.dailyUsed,
      } : undefined,
    }));

    return NextResponse.json({
      timestamp: healthReport.timestamp,
      overallStatus: healthReport.overallStatus,
      recommendations: healthReport.recommendations,
      scrapers: enrichedScrapers,
      apis: finalApis,
      scrapingAnt: pipelineStatus.scrapingAnt,
      omdbDaily: pipelineStatus.omdbDaily,
      cache: pipelineStatus.cache,
      scrapingBee: healthReport.scrapingBee,
    });
  } catch (error: any) {
    console.error('[API /admin/health] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get health report', details: error.message },
      { status: 500 },
    );
  }
}
