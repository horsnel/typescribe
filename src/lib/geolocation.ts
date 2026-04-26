/**
 * Geolocation Service — Invisible IP-based location detection
 *
 * Uses free IP geolocation API to detect user's country.
 * Suggests content based on location while allowing manual override.
 * All data cached in localStorage for privacy and speed.
 */

// ─── Types ───

export interface GeoLocation {
  countryCode: string;
  countryName: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string;
  detected: boolean;
  timestamp: number;
}

export interface CountrySuggestion {
  code: string;
  name: string;
  flag: string;
  reason: string;
}

// ─── Cache ───

const GEO_CACHE_KEY = 'typescribe_geo';
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const GEO_MANUAL_OVERRIDE_KEY = 'typescribe_geo_override';

function getCachedGeo(): GeoLocation | null {
  try {
    const data = localStorage.getItem(GEO_CACHE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (Date.now() - parsed.timestamp > GEO_CACHE_TTL) {
      localStorage.removeItem(GEO_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedGeo(geo: GeoLocation): void {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
  } catch { /* ignore */ }
}

// ─── Detection ───

/**
 * Detect user's location from IP address.
 * Uses free ipapi.co API (no key needed, 1000/day).
 * Falls back gracefully if detection fails.
 */
export async function detectLocation(): Promise<GeoLocation | null> {
  // Check manual override first
  try {
    const override = localStorage.getItem(GEO_MANUAL_OVERRIDE_KEY);
    if (override) {
      const parsed = JSON.parse(override);
      if (parsed.countryCode) return parsed;
    }
  } catch { /* ignore */ }

  // Check cache
  const cached = getCachedGeo();
  if (cached) return cached;

  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return null;

    const data = await res.json();

    const geo: GeoLocation = {
      countryCode: data.country_code || 'US',
      countryName: data.country_name || 'United States',
      city: data.city || '',
      region: data.region || '',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      timezone: data.timezone || 'UTC',
      detected: true,
      timestamp: Date.now(),
    };

    setCachedGeo(geo);
    return geo;
  } catch (err) {
    console.warn('[GeoLocation] Detection failed:', err);
    return null;
  }
}

/**
 * Set manual country override.
 * User can choose any country regardless of detected location.
 */
export function setCountryOverride(countryCode: string, countryName: string): void {
  const geo: GeoLocation = {
    countryCode,
    countryName,
    city: '',
    region: '',
    latitude: 0,
    longitude: 0,
    timezone: '',
    detected: false,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(GEO_MANUAL_OVERRIDE_KEY, JSON.stringify(geo));
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
  } catch { /* ignore */ }
}

/**
 * Clear the manual override and re-detect from IP.
 */
export function clearCountryOverride(): void {
  try {
    localStorage.removeItem(GEO_MANUAL_OVERRIDE_KEY);
    localStorage.removeItem(GEO_CACHE_KEY);
  } catch { /* ignore */ }
}

/**
 * Get the current effective location (override > cache > default).
 */
export function getCurrentLocation(): GeoLocation | null {
  // Check override first
  try {
    const override = localStorage.getItem(GEO_MANUAL_OVERRIDE_KEY);
    if (override) return JSON.parse(override);
  } catch { /* ignore */ }

  // Then cache
  const cached = getCachedGeo();
  if (cached) return cached;

  return null;
}

// ─── Country Content Suggestions ───

export const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷',
  JP: '🇯🇵', KR: '🇰🇷', CN: '🇨🇳', IN: '🇮🇳', BR: '🇧🇷', MX: '🇲🇽',
  NG: '🇳🇬', ZA: '🇿🇦', KE: '🇰🇪', GH: '🇬🇭', EG: '🇪🇬', IT: '🇮🇹',
  ES: '🇪🇸', NL: '🇳🇱', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', PL: '🇵🇱',
  RU: '🇷🇺', TR: '🇹🇷', SA: '🇸🇦', AE: '🇦🇪', TH: '🇹🇭', PH: '🇵🇭',
  ID: '🇮🇩', MY: '🇲🇾', SG: '🇸🇬', AR: '🇦🇷', CO: '🇨🇴', CL: '🇨🇱',
  PT: '🇵🇹', IE: '🇮🇪', NZ: '🇳🇿', AT: '🇦🇹', CH: '🇨🇭', BE: '🇧🇪',
};

export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', JP: 'Japan', KR: 'South Korea', CN: 'China',
  IN: 'India', BR: 'Brazil', MX: 'Mexico', NG: 'Nigeria', ZA: 'South Africa',
  KE: 'Kenya', GH: 'Ghana', EG: 'Egypt', IT: 'Italy', ES: 'Spain',
  NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', PL: 'Poland',
  RU: 'Russia', TR: 'Turkey', SA: 'Saudi Arabia', AE: 'UAE', TH: 'Thailand',
  PH: 'Philippines', ID: 'Indonesia', MY: 'Malaysia', SG: 'Singapore',
  AR: 'Argentina', CO: 'Colombia', CL: 'Chile', PT: 'Portugal', IE: 'Ireland',
  NZ: 'New Zealand', AT: 'Austria', CH: 'Switzerland', BE: 'Belgium',
};

export const AVAILABLE_COUNTRIES = Object.keys(COUNTRY_FLAGS).sort();

/**
 * Get content suggestion reason based on country.
 */
export function getSuggestionReason(countryCode: string): string {
  const reasons: Record<string, string> = {
    NG: 'Nollywood & African Cinema',
    GH: 'Nollywood & African Cinema',
    KE: 'African Cinema & Documentaries',
    ZA: 'African Cinema & International',
    JP: 'Anime & Japanese Cinema',
    KR: 'K-Drama & Korean Cinema',
    CN: 'Chinese Cinema & Dramas',
    IN: 'Bollywood & Indian Cinema',
    BR: 'Brazilian Cinema & Telenovelas',
    MX: 'Mexican Cinema & Telenovelas',
    FR: 'French Cinema & European Films',
    DE: 'German Cinema & European Films',
    IT: 'Italian Cinema & European Films',
    ES: 'Spanish Cinema & European Films',
    GB: 'British Cinema & TV Series',
    AU: 'Australian Cinema & TV',
    CA: 'Canadian Cinema & International',
    US: 'Hollywood & International',
    TR: 'Turkish Dramas & Cinema',
    SA: 'Arabic Cinema & Dramas',
    AE: 'Arabic Cinema & Dramas',
    TH: 'Thai Cinema & Dramas',
    PH: 'Filipino Cinema & Dramas',
    ID: 'Indonesian Cinema & Dramas',
    KR: 'K-Drama & Korean Cinema',
    AR: 'Latin American Cinema',
    CO: 'Latin American Cinema',
    CL: 'Latin American Cinema',
  };
  return reasons[countryCode] || 'Local & International Films';
}

/**
 * Get TMDb discover parameters for a country.
 */
export function getCountryDiscoverParams(countryCode: string): {
  with_origin_country?: string;
  with_original_language?: string;
  sort_by?: string;
} {
  const params: Record<string, string> = {};

  const languageMap: Record<string, string> = {
    JP: 'ja', KR: 'ko', CN: 'zh', IN: 'hi', FR: 'fr', DE: 'de',
    IT: 'it', ES: 'es', BR: 'pt', MX: 'es', TR: 'tr', TH: 'th',
    RU: 'ru', SA: 'ar', AE: 'ar', NG: 'en', GH: 'en',
  };

  // Use origin country filter for most countries
  if (countryCode !== 'US' && countryCode !== 'GB' && countryCode !== 'CA' && countryCode !== 'AU') {
    params.with_origin_country = countryCode;
  }

  // Add language filter for specific countries
  if (languageMap[countryCode]) {
    params.with_original_language = languageMap[countryCode];
  }

  params.sort_by = 'popularity.desc';

  return params;
}
