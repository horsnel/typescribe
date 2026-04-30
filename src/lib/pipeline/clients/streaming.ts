/**
 * Streaming / Where to Watch Provider
 *
 * Uses TMDb watch providers endpoint for movies/TV
 * and Kitsu for anime streaming links.
 * Free — uses existing TMDb API key.
 */

import { getTmdbApiKey, tmdbImageUrl } from './tmdb';
import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';

// ─── Types ───

export interface StreamingProvider {
  id: number;
  name: string;
  logoUrl: string;
  flatrate: boolean;  // Subscription / streaming
  rent: boolean;
  buy: boolean;
  free: boolean;
  links: {
    streaming?: string;
    rent?: string;
    buy?: string;
    free?: string;
  };
}

export interface WatchProvidersResult {
  tmdbId: number;
  link: string;       // JustWatch link
  providers: StreamingProvider[];
  countries: Record<string, StreamingProvider[]>;  // By country code
}

// ─── TMDb Watch Providers ───

export async function getMovieWatchProviders(
  tmdbId: number,
): Promise<WatchProvidersResult | null> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) return null;

  try {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${apiKey}`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } }, 10_000);

    if (!res) {
      console.error('[WatchProviders] Request failed (timeout/network) for movie ' + tmdbId);
      return null;
    }
    if (!res.ok) {
      console.warn(`[WatchProviders] HTTP ${res.status} for movie ${tmdbId}`);
      return null;
    }

    const data = await safeJsonParse<any>(res);
    if (!data) {
      console.error('[WatchProviders] Failed to parse JSON response for movie ' + tmdbId);
      return null;
    }
    return transformWatchProviders(tmdbId, data);
  } catch (err) {
    console.warn(`[WatchProviders] Failed for movie ${tmdbId}:`, err);
    return null;
  }
}

export async function getTvWatchProviders(
  tmdbId: number,
): Promise<WatchProvidersResult | null> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) return null;

  try {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}/watch/providers?api_key=${apiKey}`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } }, 10_000);

    if (!res) {
      console.error('[WatchProviders] Request failed (timeout/network) for TV ' + tmdbId);
      return null;
    }
    if (!res.ok) {
      console.warn(`[WatchProviders] HTTP ${res.status} for TV ${tmdbId}`);
      return null;
    }

    const data = await safeJsonParse<any>(res);
    if (!data) {
      console.error('[WatchProviders] Failed to parse JSON response for TV ' + tmdbId);
      return null;
    }
    return transformWatchProviders(tmdbId, data);
  } catch (err) {
    console.warn(`[WatchProviders] Failed for TV ${tmdbId}:`, err);
    return null;
  }
}

// ─── Transform ───

function transformWatchProviders(
  tmdbId: number,
  data: any,
): WatchProvidersResult {
  const providers: StreamingProvider[] = [];
  const countries: Record<string, StreamingProvider[]> = {};
  const link = data.link || '';

  // Process US as default (most comprehensive)
  const usResults = data.results?.US;
  if (usResults) {
    const usProviders = parseCountryProviders(usResults);
    providers.push(...usProviders);
    countries['US'] = usProviders;
  }

  // Process other major countries
  const majorCountries = ['GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'KR', 'IN', 'BR', 'MX'];
  for (const code of majorCountries) {
    const countryData = data.results?.[code];
    if (countryData) {
      countries[code] = parseCountryProviders(countryData);
    }
  }

  // If no US results, try first available country
  if (providers.length === 0 && data.results) {
    const firstKey = Object.keys(data.results).find(k => k !== 'link');
    if (firstKey) {
      const firstData = data.results[firstKey];
      if (firstData) {
        const firstProviders = parseCountryProviders(firstData);
        providers.push(...firstProviders);
        countries[firstKey] = firstProviders;
      }
    }
  }

  return { tmdbId, link, providers, countries };
}

function parseCountryProviders(countryData: any): StreamingProvider[] {
  const providerMap = new Map<number, StreamingProvider>();

  // Flatrate (subscription streaming)
  for (const p of countryData.flatrate || []) {
    const existing = providerMap.get(p.provider_id);
    if (existing) {
      existing.flatrate = true;
      existing.links.streaming = countryData.link;
    } else {
      providerMap.set(p.provider_id, {
        id: p.provider_id,
        name: p.provider_name,
        logoUrl: p.logo_path ? tmdbImageUrl(p.logo_path, 'w92') : '',
        flatrate: true,
        rent: false,
        buy: false,
        free: false,
        links: { streaming: countryData.link },
      });
    }
  }

  // Rent
  for (const p of countryData.rent || []) {
    const existing = providerMap.get(p.provider_id);
    if (existing) {
      existing.rent = true;
      existing.links.rent = countryData.link;
    } else {
      providerMap.set(p.provider_id, {
        id: p.provider_id,
        name: p.provider_name,
        logoUrl: p.logo_path ? tmdbImageUrl(p.logo_path, 'w92') : '',
        flatrate: false,
        rent: true,
        buy: false,
        free: false,
        links: { rent: countryData.link },
      });
    }
  }

  // Buy
  for (const p of countryData.buy || []) {
    const existing = providerMap.get(p.provider_id);
    if (existing) {
      existing.buy = true;
      existing.links.buy = countryData.link;
    } else {
      providerMap.set(p.provider_id, {
        id: p.provider_id,
        name: p.provider_name,
        logoUrl: p.logo_path ? tmdbImageUrl(p.logo_path, 'w92') : '',
        flatrate: false,
        rent: false,
        buy: true,
        free: false,
        links: { buy: countryData.link },
      });
    }
  }

  // Free (ad-supported)
  for (const p of countryData.free || []) {
    const existing = providerMap.get(p.provider_id);
    if (existing) {
      existing.free = true;
      existing.links.free = countryData.link;
    } else {
      providerMap.set(p.provider_id, {
        id: p.provider_id,
        name: p.provider_name,
        logoUrl: p.logo_path ? tmdbImageUrl(p.logo_path, 'w92') : '',
        flatrate: false,
        rent: false,
        buy: false,
        free: true,
        links: { free: countryData.link },
      });
    }
  }

  return Array.from(providerMap.values());
}
