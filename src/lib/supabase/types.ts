// ─── Supabase row types (subset of the 27 tables in supabase/schema.sql) ───

export interface Profile {
  id: string;            // = auth.users.id (UUID)
  email: string;
  display_name: string;
  avatar: string;
  bio: string;
  favorite_genres: string[];
  min_rating: number;
  email_notifications: boolean;
  public_profile: boolean;
  role: 'user' | 'admin' | 'moderator';
  xp: number;
  streak_count: number;
  longest_streak: number;
  last_check_in: string | null;
  taste_dna: Record<string, unknown> | null;
  personality_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv' | 'anime';
  notes: string | null;
  priority: number;
  added_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
  watched_on: string;          // date
  rating: number | null;       // 1–10
  rewatch: boolean;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  movie_id: number;
  movie_title: string;
  rating: number;
  title: string;
  body: string;
  spoiler: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  // joined
  author?: Pick<Profile, 'id' | 'display_name' | 'avatar'>;
}

export interface SceneComment {
  id: string;
  movie_id: number;
  user_id: string;
  timestamp_sec: number;       // seconds into the film
  body: string;
  spoiler: boolean;
  created_at: string;
  author?: Pick<Profile, 'id' | 'display_name' | 'avatar'>;
}

export interface MovieList {
  id: string;
  user_id: string;
  title: string;
  description: string;
  is_public: boolean;
  cover_image: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
  order_index: number;
  note: string | null;
  added_at: string;
}

export interface Follow {
  follower_id: string;
  followee_id: string;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  banner_url: string | null;
  category: string;
  member_count: number;
  created_by: string;
  created_at: string;
}

export interface CommunityMember {
  community_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
}

export interface Post {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  body: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  author?: Pick<Profile, 'id' | 'display_name' | 'avatar'>;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  like_count: number;
  created_at: string;
  author?: Pick<Profile, 'id' | 'display_name' | 'avatar'>;
}

export interface Like {
  user_id: string;
  entity_type: 'post' | 'comment' | 'review' | 'scene_comment';
  entity_id: string;
  value: 1 | -1;
  created_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp: number;
  category: string;
  criteria: Record<string, unknown>;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'follow' | 'like' | 'comment' | 'mention' | 'achievement' | 'watch_party' | 'system';
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface WatchParty {
  id: string;
  host_id: string;
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
  scheduled_for: string;
  room_code: string;
  status: 'scheduled' | 'live' | 'ended';
  attendee_count: number;
  created_at: string;
}

export interface WatchPartyAttendee {
  party_id: string;
  user_id: string;
  rsvp: 'yes' | 'maybe' | 'no';
  joined_at: string;
}

export interface WatchPartyChat {
  id: string;
  party_id: string;
  user_id: string;
  body: string;
  timestamp_sec: number | null;
  created_at: string;
  author?: Pick<Profile, 'id' | 'display_name' | 'avatar'>;
}

export interface TasteTwin {
  user_id: string;
  twin_user_id: string;
  similarity: number;
  shared_count: number;
  computed_at: string;
  twin?: Pick<Profile, 'id' | 'display_name' | 'avatar' | 'bio'>;
}

export interface GameResult {
  id: string;
  user_id: string;
  game_type: 'grid' | 'six_degrees' | 'trivia';
  score: number;
  details: Record<string, unknown>;
  played_at: string;
}

export interface DailyGrid {
  id: string;
  grid_date: string;            // YYYY-MM-DD
  criteria: Record<string, unknown>;
  solution_ids: number[];
  solution_titles: string[];
  solution_posters: string[];
  created_at: string;
}

export interface NewsletterSubscription {
  email: string;
  confirmed: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  created_at: string;
}

export interface SceneReaction {
  id: string;
  movie_id: number;
  user_id: string;
  timestamp_sec: number;
  emoji: string;
  created_at: string;
}

export interface MovieEmbedding {
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
  embedding: number[];          // pgvector 768-dim
  metadata: Record<string, unknown>;
  created_at: string;
}
