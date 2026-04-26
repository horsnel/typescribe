/**
 * ScrapingBee Transport Client — BACKWARD COMPATIBILITY LAYER
 *
 * This module now delegates to ScrapingAnt with 5 API keys.
 * All existing code that imports from this module will work seamlessly.
 *
 * Migration: ScrapingBee → ScrapingAnt (5 keys, round-robin)
 * Reason: ScrapingBee usage hit 98% — ScrapingAnt provides 5 keys for fallback.
 */

// Re-export everything from the new ScrapingAnt client
export {
  scrapeUrl,
  scrapeAndParse,
  scrapeHtml,
  scrapeJsonLd,
  isScrapingAntConfigured as isScrapingBeeConfigured,
  getScrapingAntStats as getScrapingBeeStats,
  getScrapingAntDailyStats as getScrapingBeeDailyStats,
} from './scraping-ant';

// Re-export types for backward compatibility
export type {
  ScrapingAntOptions as ScrapingBeeOptions,
  ScrapingAntResponse as ScrapingBeeResponse,
  ScrapingAntDailyStats as ScrapingBeeDailyStats,
} from './scraping-ant';
