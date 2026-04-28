export interface Movie {
  id: number;
  tmdb_id: number;
  slug: string;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string;
  backdrop_path: string;
  genres: Array<{ id: number; name: string }>;
  runtime: number;
  vote_average: number;
  vote_count: number;
  imdb_rating: string;
  rotten_tomatoes: string;
  metascore: string;
  trailer_youtube_id: string;
  itunes_preview_url?: string;           // iTunes 30-sec trailer preview URL (fallback)
  itunes_artwork_url?: string;           // iTunes trailer artwork URL
  news_headlines: Array<{ title: string; url: string; source: string; date: string }>;
  ai_review: string;
  director: string;
  cast: Array<{ name: string; character: string; profile_path: string }>;
  tagline: string;
  budget: number;
  revenue: number;
  original_language: string;
  origin_country: string;
  media_type: 'movie' | 'tv' | 'anime';
  production_companies: string[];
  status: string;
  created_at: string;

  // ─── Scraped Data Fields (70% of data) ───

  // Rotten Tomatoes extended
  rt_audience_score?: string;           // e.g. "85%"
  rt_consensus?: string;                 // Critic consensus paragraph
  rt_review_count?: number;              // Critic review count

  // Box office (The Numbers / Box Office Mojo)
  box_office_domestic?: number;
  box_office_international?: number;
  box_office_worldwide?: number;
  budget_reported?: number;              // Budget from The Numbers

  // Age ratings (Common Sense Media)
  age_rating?: string;                   // e.g. "13+"
  content_advisories?: string[];         // e.g. ["Violence", "Language"]
  parental_review?: string;

  // Regional ratings (all scraped)
  regional_ratings?: {
    douban?: number;                     // Chinese rating (0-10)
    kinopoisk?: number;                  // Russian rating (0-10)
    filmaffinity?: number;               // Spanish rating (0-10)
    allocine?: number;                   // French rating (0-5)
    senscritique?: number;               // French rating (0-10)
    filmweb?: number;                    // Polish rating (0-10)
    csfd?: number;                       // Czech rating (0-100%)
    mdl?: number;                        // MyDramaList rating (0-10)
  };

  // K-drama specific (MyDramaList + Dramabeans)
  episodes?: number;
  air_schedule?: string;
  dramabeans_recaps?: Array<{ title: string; url: string }>;

  // Wikipedia
  wikipedia_extract?: string;
  wikipedia_url?: string;

  // Fanart.tv (high-quality fan images)
  fanart_logo?: string;             // Transparent logo PNG URL
  fanart_clearart?: string;         // Clearart PNG URL
  fanart_banner?: string;           // Wide banner URL
  fanart_thumb?: string;            // Thumbnail URL

  // ─── Anime-Specific Fields ───
  is_anime?: boolean;                     // Auto-detected from genre + origin country
  anime_mal_id?: number;                  // MyAnimeList ID
  anime_mal_score?: number;               // MAL rating (0-10, weighted)
  anime_mal_rank?: number;               // MAL ranking position
  anime_mal_popularity?: number;         // MAL popularity rank
  anime_mal_members?: number;            // MAL member count
  anime_studios?: string[];              // Animation studios (e.g. ["MAPPA", "Ufotable"])
  anime_source?: string;                 // Source material (e.g. "Manga", "Light Novel", "Original")
  anime_season?: string;                 // e.g. "Fall 2023"
  anime_synonyms?: string[];             // Alternative titles
  anime_tags?: string[];                 // AniList/MAL tags (e.g. ["Isekai", "Shounen", "Action"])
  anime_episodes_aired?: number;         // Episodes aired so far
  anime_next_episode?: string;           // ISO date of next episode
  anime_streaming?: Array<{              // Where to watch (from AniList)
    platform: string;
    url: string;
  }>;
  anime_ann_rating?: number;             // AnimeNewsNetwork rating (0-10)
  anime_ann_review_count?: number;       // ANN review count

  // Streaming availability (future - JustWatch)
  streaming_availability?: Array<{
    platform: string;
    type: 'free' | 'subscription' | 'rent' | 'buy';
    url?: string;
  }>;

  // Pipeline metadata
  scraped_sources?: string[];            // Which scrapers contributed data
  scraped_at?: string;                   // Last scrape timestamp
  data_completeness?: number;            // 0-100 completeness score
}

export interface UserReview {
  id: number;
  movie_id: number;
  user_id: number;
  user_name: string;
  user_avatar: string;
  rating: number;
  text: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  moderated: boolean;
  moderation_note: string;
  reports: ReportEntry[];
}

export interface ReportEntry {
  id: number;
  reporter_id: number;
  reason: ReportReason;
  details: string;
  created_at: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'misinformation'
  | 'off_topic'
  | 'spoiler'
  | 'inappropriate'
  | 'other';

export interface ModerationResult {
  flagged: boolean;
  reason?: string;
  severity: 'none' | 'low' | 'medium' | 'high';
  autoAction?: 'warn' | 'hold' | 'reject';
  confidence: number;
}

export interface User {
  id: number;
  email: string;
  display_name: string;
  avatar: string;
  bio: string;
  favorite_genres: string[];
  min_rating: number;
  email_notifications: boolean;
  public_profile: boolean;
  created_at: string;
}

export interface Genre {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  source: string;
  date: string;
  url: string;
}

export interface TopRatedItem {
  rank: number;
  movie: Movie;
  consensus: string;
}

// ─── Browse / Discover Types ───

export type MediaFormat = 'movie' | 'tv' | 'anime' | 'all';

export interface CountryOption {
  code: string;
  label: string;
  movieLabel: string;
  seriesLabel: string;
  flag: string;
  whyInclude: string;
}

export interface GenreOption {
  id: number;
  tvId: number;
  name: string;
}

export interface ThemeOption {
  id: number;
  name: string;
  tmdbKeywordId: number;
}

export interface BrowseFilters {
  format: MediaFormat;
  country: string;
  genres: number[];
  theme: number | null;
  sort: string;
  minRating: number;
  yearFrom: number;
  yearTo: number;
}
