/**
 * Browse / Discover configuration for TMDb API integration.
 *
 * Architecture: Format → Country → Genre → Theme
 * Phase 1: Format + Country + Genre (live)
 * Phase 2: Add Themes (keyword-based)
 */

import type { CountryOption, GenreOption, ThemeOption } from '@/lib/types';

// ─── Curated Country List (14 countries + "All") ───

export const COUNTRIES: CountryOption[] = [
  {
    code: 'KR',
    label: 'Korea',
    movieLabel: 'K-Movies',
    seriesLabel: 'K-Dramas',
    flag: '🇰🇷',
    whyInclude: 'Massive global audience, underserved in English',
  },
  {
    code: 'NG',
    label: 'Nigeria',
    movieLabel: 'Nollywood',
    seriesLabel: 'Nollywood Series',
    flag: '🇳🇬',
    whyInclude: 'Fastest-growing film industry, loyal diaspora',
  },
  {
    code: 'US',
    label: 'United States',
    movieLabel: 'Hollywood',
    seriesLabel: 'American TV',
    flag: '🇺🇸',
    whyInclude: 'Default for most users, huge catalog',
  },
  {
    code: 'GB',
    label: 'United Kingdom',
    movieLabel: 'UK Cinema',
    seriesLabel: 'British TV',
    flag: '🇬🇧',
    whyInclude: 'Strong indie and prestige content',
  },
  {
    code: 'IN',
    label: 'India',
    movieLabel: 'Bollywood',
    seriesLabel: 'Indian TV',
    flag: '🇮🇳',
    whyInclude: 'Massive catalog, multiple languages',
  },
  {
    code: 'JP',
    label: 'Japan',
    movieLabel: 'J-Movies',
    seriesLabel: 'J-Drama / Anime',
    flag: '🇯🇵',
    whyInclude: 'Anime alone is a giant niche',
  },
  {
    code: 'CN',
    label: 'China',
    movieLabel: 'C-Movies',
    seriesLabel: 'C-Dramas',
    flag: '🇨🇳',
    whyInclude: 'Growing international interest',
  },
  {
    code: 'TH',
    label: 'Thailand',
    movieLabel: 'Thai Movies',
    seriesLabel: 'Thai Dramas',
    flag: '🇹🇭',
    whyInclude: 'Popular BL and horror content',
  },
  {
    code: 'ZA',
    label: 'South Africa',
    movieLabel: 'SA Movies',
    seriesLabel: 'SA Series',
    flag: '🇿🇦',
    whyInclude: 'Strong English content, growing catalog',
  },
  {
    code: 'TR',
    label: 'Turkey',
    movieLabel: 'Turkish Movies',
    seriesLabel: 'Turkish Dramas',
    flag: '🇹🇷',
    whyInclude: 'Huge global following (dizi)',
  },
  {
    code: 'MX',
    label: 'Mexico',
    movieLabel: 'Mexican Cinema',
    seriesLabel: 'Telenovelas',
    flag: '🇲🇽',
    whyInclude: 'Strong Spanish-language content',
  },
  {
    code: 'BR',
    label: 'Brazil',
    movieLabel: 'Brazilian Movies',
    seriesLabel: 'Brazilian Series',
    flag: '🇧🇷',
    whyInclude: 'Growing Netflix co-productions',
  },
  {
    code: 'PH',
    label: 'Philippines',
    movieLabel: 'Filipino Movies',
    seriesLabel: 'Filipino Series',
    flag: '🇵🇭',
    whyInclude: 'Active fanbase, English-friendly',
  },
  {
    code: 'FR',
    label: 'France',
    movieLabel: 'French Cinema',
    seriesLabel: 'French TV',
    flag: '🇫🇷',
    whyInclude: 'Prestige/arthouse appeal',
  },
];

// ─── Genre Options with separate Movie / TV TMDb IDs ───

export const GENRES: GenreOption[] = [
  { id: 28, tvId: 10759, name: 'Action' },
  { id: 12, tvId: 10759, name: 'Adventure' },
  { id: 16, tvId: 16, name: 'Animation' },
  { id: 35, tvId: 35, name: 'Comedy' },
  { id: 80, tvId: 80, name: 'Crime' },
  { id: 99, tvId: 99, name: 'Documentary' },
  { id: 18, tvId: 18, name: 'Drama' },
  { id: 10751, tvId: 10751, name: 'Family' },
  { id: 14, tvId: 10765, name: 'Fantasy' },
  { id: 36, tvId: 36, name: 'History' },
  { id: 27, tvId: 9648, name: 'Horror' },
  { id: 10402, tvId: 10402, name: 'Music' },
  { id: 9648, tvId: 9648, name: 'Mystery' },
  { id: 10749, tvId: 10749, name: 'Romance' },
  { id: 878, tvId: 10765, name: 'Sci-Fi' },
  { id: 10770, tvId: 10770, name: 'TV Movie' },
  { id: 53, tvId: 10759, name: 'Thriller' },
  { id: 10752, tvId: 10768, name: 'War' },
  { id: 37, tvId: 37, name: 'Western' },
];

// ─── Theme Options (TMDb Keywords) — Phase 2 ───

export const THEMES: ThemeOption[] = [
  { id: 1, name: 'High School', tmdbKeywordId: 6270 },
  { id: 2, name: 'Teenager', tmdbKeywordId: 3335 },
  { id: 3, name: 'Workplace', tmdbKeywordId: 10065 },
  { id: 4, name: 'Coming of Age', tmdbKeywordId: 10683 },
  { id: 5, name: 'Small Town', tmdbKeywordId: 10420 },
  { id: 6, name: 'Family Relationships', tmdbKeywordId: 160462 },
  { id: 7, name: 'Revenge', tmdbKeywordId: 9749 },
  { id: 8, name: 'Forbidden Love', tmdbKeywordId: 160900 },
  { id: 9, name: 'Survival', tmdbKeywordId: 10092 },
  { id: 10, name: 'Time Travel', tmdbKeywordId: 4344 },
  { id: 11, name: 'Superhero', tmdbKeywordId: 9660 },
  { id: 12, name: 'Zombie', tmdbKeywordId: 818 },
  { id: 13, name: 'Vampire', tmdbKeywordId: 10596 },
  { id: 14, name: 'Dystopia', tmdbKeywordId: 9875 },
  { id: 15, name: 'Based on True Story', tmdbKeywordId: 210724 },
];

// ─── Sort Options ───

export const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'popularity.asc', label: 'Least Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'vote_average.asc', label: 'Lowest Rated' },
  { value: 'primary_release_date.desc', label: 'Newest First' },
  { value: 'primary_release_date.asc', label: 'Oldest First' },
  { value: 'revenue.desc', label: 'Top Box Office' },
  { value: 'title.asc', label: 'A–Z Title' },
] as const;

// ─── TMDb API URL Builder ───

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function tmdbImageUrl(path: string, size: 'w200' | 'w400' | 'w500' | 'original' = 'w500'): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Build a TMDb discover URL based on the browse filters.
 * This is ready to use once you plug in your TMDb API key.
 */
export function buildTmdbDiscoverUrl(
  apiKey: string,
  filters: {
    format: 'movie' | 'tv';
    country?: string;
    genreIds?: number[];
    themeKeywordId?: number | null;
    sort?: string;
    minRating?: number;
    yearFrom?: number;
    yearTo?: number;
    page?: number;
  }
): string {
  const endpoint = filters.format === 'tv' ? 'tv' : 'movie';
  const params = new URLSearchParams({
    api_key: apiKey,
    sort_by: filters.sort || 'popularity.desc',
    'vote_count.gte': '50',
    page: String(filters.page || 1),
  });

  if (filters.country && filters.country !== 'all') {
    params.append('with_origin_country', filters.country);
  }

  if (filters.genreIds && filters.genreIds.length > 0) {
    // Use the correct genre IDs based on format
    const genreIds = filters.genreIds.map((id) => {
      const genre = GENRES.find((g) => g.id === id);
      if (genre) {
        return filters.format === 'tv' ? genre.tvId : genre.id;
      }
      return id;
    });
    params.append('with_genres', genreIds.join(','));
  }

  if (filters.themeKeywordId) {
    params.append('with_keywords', String(filters.themeKeywordId));
  }

  if (filters.minRating && filters.minRating > 0) {
    params.append('vote_average.gte', String(filters.minRating));
  }

  if (filters.yearFrom) {
    const key = filters.format === 'tv' ? 'first_air_date.gte' : 'primary_release_date.gte';
    params.append(key, `${filters.yearFrom}-01-01`);
  }

  if (filters.yearTo) {
    const key = filters.format === 'tv' ? 'first_air_date.lte' : 'primary_release_date.lte';
    params.append(key, `${filters.yearTo}-12-31`);
  }

  return `${TMDB_BASE}/discover/${endpoint}?${params.toString()}`;
}

// ─── Mock Data Helpers (for demo before API keys are connected) ───

export function getCountryByCode(code: string): CountryOption | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function getCountryLabel(code: string, format: 'movie' | 'tv'): string {
  if (code === 'all') return format === 'tv' ? 'All Series' : 'All Movies';
  const country = getCountryByCode(code);
  if (!country) return 'All';
  return format === 'tv' ? country.seriesLabel : country.movieLabel;
}
