/**
 * Health Monitor — Tracks the health status of every scraper and API client.
 * Provides a unified view of the entire data pipeline for the admin dashboard.
 */

import { getCircuitState, getAllCircuitStates } from './circuit-breaker';
import { getScrapingBeeStats, getScrapingBeeDailyStats } from './scrapingbee';

// ─── Types ───

export interface ScraperHealth {
  name: string;
  tier: 'a' | 'b' | 'c';
  status: 'healthy' | 'degraded' | 'down' | 'disabled';
  lastSuccess: string | null;
  lastFailure: string | null;
  consecutiveFailures: number;
  totalRequests: number;
  successRate: number;      // 0-1
  avgResponseMs: number;
  circuitState: 'closed' | 'open' | 'half_open';
  cooldownRemainingMs: number;
  enabled: boolean;
}

export interface PipelineHealthReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  scrapers: ScraperHealth[];
  scrapingBee: {
    configured: boolean;
    totalRequests: number;
    successRate: number;
    dailyCredits: { used: number; limit: number; remaining: number };
  };
  apiClients: {
    tmdb: { configured: boolean };
    omdb: { configured: boolean; dailyUsed: number; dailyLimit: number };
    youtube: { configured: boolean };
    newsapi: { configured: boolean };
    anilist: { configured: boolean };
  };
  recommendations: string[];
}

// ─── Per-scraper stats tracking ───

interface ScraperStats {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  totalResponseMs: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  consecutiveFailures: number;
}

const scraperStats = new Map<string, ScraperStats>();

// ─── Scraper Registry ───

interface ScraperConfig {
  name: string;
  tier: 'a' | 'b' | 'c';
  enabled: boolean;
}

const SCRAPER_REGISTRY: ScraperConfig[] = [
  // Tier A: Zero protection
  { name: 'wikipedia', tier: 'a', enabled: true },
  { name: 'senscritique', tier: 'a', enabled: true },
  { name: 'filmweb', tier: 'a', enabled: true },
  { name: 'csfd', tier: 'a', enabled: true },
  { name: 'dramabeans', tier: 'a', enabled: true },
  { name: 'animenewsnetwork', tier: 'a', enabled: true },
  // Tier B: Light protection
  { name: 'rottentomatoes', tier: 'b', enabled: true },
  { name: 'metacritic', tier: 'b', enabled: true },
  { name: 'mydramalist', tier: 'b', enabled: true },
  { name: 'commonsensemedia', tier: 'b', enabled: true },
  { name: 'thenumbers', tier: 'b', enabled: true },
  { name: 'filmaffinity', tier: 'b', enabled: true },
  { name: 'allocine', tier: 'b', enabled: true },
  { name: 'myanimelist', tier: 'b', enabled: true },
  // Tier C: Medium protection
  { name: 'boxofficemojo', tier: 'c', enabled: true },
  { name: 'douban', tier: 'c', enabled: true },
  { name: 'kinopoisk', tier: 'c', enabled: true },
];

// ─── Stats Recording ───

export function recordScraperSuccess(name: string, responseMs: number): void {
  const stats = getStats(name);
  stats.totalRequests++;
  stats.successCount++;
  stats.totalResponseMs += responseMs;
  stats.lastSuccessAt = Date.now();
  stats.consecutiveFailures = 0;
}

export function recordScraperFailure(name: string): void {
  const stats = getStats(name);
  stats.totalRequests++;
  stats.failureCount++;
  stats.lastFailureAt = Date.now();
  stats.consecutiveFailures++;
}

function getStats(name: string): ScraperStats {
  if (!scraperStats.has(name)) {
    scraperStats.set(name, {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      totalResponseMs: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      consecutiveFailures: 0,
    });
  }
  return scraperStats.get(name)!;
}

// ─── Health Report ───

export async function getPipelineHealthReport(): Promise<PipelineHealthReport> {
  const circuitStates = getAllCircuitStates();
  const scrapingBeeStats = getScrapingBeeStats();
  const dailyCredits = { used: scrapingBeeStats.totalUsed, limit: scrapingBeeStats.activeKeys * 10000, remaining: scrapingBeeStats.totalRemaining };

  // Build per-scraper health
  const scrapers: ScraperHealth[] = SCRAPER_REGISTRY.map(config => {
    const stats = getStats(config.name);
    const circuit = circuitStates[config.name] || {
      state: 'closed',
      consecutiveFailures: 0,
      cooldownRemainingMs: 0,
    };

    // Determine status
    let status: ScraperHealth['status'];
    if (!config.enabled) {
      status = 'disabled';
    } else if (circuit.state === 'open') {
      status = 'down';
    } else if (stats.consecutiveFailures > 0 || circuit.state === 'half_open') {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      name: config.name,
      tier: config.tier,
      status,
      lastSuccess: stats.lastSuccessAt ? new Date(stats.lastSuccessAt).toISOString() : null,
      lastFailure: stats.lastFailureAt ? new Date(stats.lastFailureAt).toISOString() : null,
      consecutiveFailures: stats.consecutiveFailures,
      totalRequests: stats.totalRequests,
      successRate: stats.totalRequests > 0 ? stats.successCount / stats.totalRequests : 0,
      avgResponseMs: stats.successCount > 0 ? Math.round(stats.totalResponseMs / stats.successCount) : 0,
      circuitState: circuit.state,
      cooldownRemainingMs: circuit.cooldownRemainingMs,
      enabled: config.enabled,
    };
  });

  // Count statuses
  const downCount = scrapers.filter(s => s.status === 'down').length;
  const degradedCount = scrapers.filter(s => s.status === 'degraded').length;
  const healthyCount = scrapers.filter(s => s.status === 'healthy').length;

  // Overall status
  let overallStatus: PipelineHealthReport['overallStatus'];
  if (downCount >= 5) {
    overallStatus = 'critical';
  } else if (downCount >= 2 || degradedCount >= 5) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  // Recommendations
  const recommendations: string[] = [];
  if (!scrapingBeeStats.configured) {
    recommendations.push('SCRAPINGBEE_API_KEY not set — all scrapers using direct fetch (low success rate for Tier B/C)');
  }
  if (dailyCredits.remaining < 100) {
    recommendations.push(`ScrapingBee credits running low: ${dailyCredits.remaining}/${dailyCredits.limit} remaining today`);
  }
  for (const scraper of scrapers) {
    if (scraper.status === 'down') {
      recommendations.push(`${scraper.name} is DOWN (circuit breaker open) — consider manual reset or increase delay`);
    }
    if (scraper.status === 'degraded' && scraper.consecutiveFailures >= 2) {
      recommendations.push(`${scraper.name} is degraded (${scraper.consecutiveFailures} consecutive failures) — may trip circuit soon`);
    }
  }

  // API clients
  const omdbStats = { configured: !!process.env.OMDB_API_KEY, dailyUsed: 0, dailyLimit: 1000 };
  // Try to get OMDb stats if available
  try {
    const { getOmdbDailyStats } = await import('@/lib/pipeline/clients/omdb');
    const omdbDaily = getOmdbDailyStats();
    omdbStats.dailyUsed = omdbDaily.used;
    omdbStats.dailyLimit = omdbDaily.limit;
  } catch {}

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    scrapers,
    scrapingBee: {
      configured: scrapingBeeStats.configured,
      totalRequests: scrapingBeeStats.totalRequests,
      successRate: scrapingBeeStats.successRate,
      dailyCredits: { used: dailyCredits.used, limit: dailyCredits.limit, remaining: dailyCredits.remaining },
    },
    apiClients: {
      tmdb: { configured: !!process.env.TMDB_API_KEY },
      omdb: omdbStats,
      youtube: { configured: !!process.env.YOUTUBE_API_KEY },
      newsapi: { configured: !!process.env.NEWS_API_KEY },
      anilist: { configured: true },
    },
    recommendations,
  };
}

export function getScraperRegistry(): ScraperConfig[] {
  return [...SCRAPER_REGISTRY];
}

export function setScraperEnabled(name: string, enabled: boolean): boolean {
  const entry = SCRAPER_REGISTRY.find(s => s.name === name);
  if (entry) {
    entry.enabled = enabled;
    return true;
  }
  return false;
}
