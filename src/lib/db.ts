/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  TypeScribe — Unified Database Layer (Supabase-backed)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Replaces:
 *    - src/lib/db.ts (Prisma) — not needed, Supabase is the source of truth
 *    - src/lib/community-storage.ts (localStorage) — now durable + cross-device
 *    - in-memory userStore inside auth-config.ts
 *
 *  All functions are isomorphic: they use the server client (cookies) when called
 *  from RSC/route handlers, and the admin client for trusted/aggregate writes.
 */

import { supabaseAdmin } from './supabase/admin';
import { createClient as createServerClient } from './supabase/server';
import type {
  Profile, WatchlistItem, DiaryEntry, Review, SceneComment,
  MovieList, ListItem, Follow, Community, CommunityMember,
  Post, Comment, Like, Achievement, UserAchievement,
  Notification, WatchParty, WatchPartyAttendee, WatchPartyChat,
  TasteTwin, GameResult, DailyGrid, NewsletterSubscription, SceneReaction,
} from './supabase/types';

// ─── helpers ──────────────────────────────────────────────────────────────

/** Get the user's session-aware Supabase client (server-side). */
export async function getSessionClient() {
  return await createServerClient();
}

/** Get the admin client (bypasses RLS). Use sparingly. */
export function getAdmin() {
  return supabaseAdmin;
}

/** Resolve the current user's profile (or null). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const sb = await getSessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

/** Resolve the current user's ID (or null). */
export async function getCurrentUserId(): Promise<string | null> {
  const sb = await getSessionClient();
  const { data: { user } } = await sb.auth.getUser();
  return user?.id ?? null;
}

// ─── Profiles ─────────────────────────────────────────────────────────────

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile,
    'display_name' | 'avatar' | 'bio' | 'favorite_genres' |
    'min_rating' | 'email_notifications' | 'public_profile' | 'taste_dna' | 'personality_type'
  >>,
): Promise<Profile | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();
  return (data as Profile) ?? null;
}

export async function listPublicProfiles(limit = 50): Promise<Profile[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('public_profile', true)
    .order('xp', { ascending: false })
    .limit(limit);
  return (data ?? []) as Profile[];
}

// ─── Watchlist ────────────────────────────────────────────────────────────

export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  const { data } = await supabaseAdmin
    .from('watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  return (data ?? []) as WatchlistItem[];
}

export async function addToWatchlist(
  userId: string,
  movie: { id: number; title: string; poster_path?: string | null; media_type?: string },
): Promise<WatchlistItem | null> {
  const { data } = await supabaseAdmin
    .from('watchlist')
    .insert({
      user_id: userId,
      movie_id: movie.id,
      movie_title: movie.title,
      poster_path: movie.poster_path ?? null,
      media_type: (movie.media_type as 'movie' | 'tv' | 'anime') ?? 'movie',
    })
    .select('*')
    .single();
  return (data as WatchlistItem) ?? null;
}

export async function removeFromWatchlist(userId: string, movieId: number): Promise<void> {
  await supabaseAdmin
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', movieId);
}

export async function isInWatchlist(userId: string, movieId: number): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('watchlist')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('movie_id', movieId);
  return (count ?? 0) > 0;
}

// ─── Diary ────────────────────────────────────────────────────────────────

export async function getDiary(userId: string, limit = 100): Promise<DiaryEntry[]> {
  const { data } = await supabaseAdmin
    .from('watch_diary')
    .select('*')
    .eq('user_id', userId)
    .order('watched_on', { ascending: false })
    .limit(limit);
  return (data ?? []) as DiaryEntry[];
}

export async function logDiary(
  userId: string,
  entry: { movie_id: number; movie_title: string; poster_path?: string | null;
           watched_on?: string; rating?: number | null; rewatch?: boolean;
           location?: string | null; notes?: string | null },
): Promise<DiaryEntry | null> {
  const { data } = await supabaseAdmin
    .from('watch_diary')
    .insert({ user_id: userId, ...entry })
    .select('*')
    .single();
  return (data as DiaryEntry) ?? null;
}

export async function getDiaryCount(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('watch_diary')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

// ─── Reviews ──────────────────────────────────────────────────────────────

export async function getReviewsByMovie(movieId: number, limit = 50): Promise<Review[]> {
  const { data } = await supabaseAdmin
    .from('reviews')
    .select('*, author:profiles!reviews_user_id_fkey(id, display_name, avatar)')
    .eq('movie_id', movieId)
    .order('helpful_count', { ascending: false })
    .limit(limit);
  return (data ?? []) as Review[];
}

export async function getReviewsByUser(userId: string, limit = 100): Promise<Review[]> {
  const { data } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as Review[];
}

export async function getReviewCount(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

export async function createReview(
  userId: string,
  review: { movie_id: number; movie_title: string; rating: number;
            title?: string; body?: string; spoiler?: boolean },
): Promise<Review | null> {
  const { data } = await supabaseAdmin
    .from('reviews')
    .insert({ user_id: userId, ...review })
    .select('*')
    .single();
  return (data as Review) ?? null;
}

export async function markReviewHelpful(reviewId: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('review_helpful')
    .insert({ review_id: reviewId, user_id: userId });
  return !error;
}

// ─── Scene Comments (F12) ─────────────────────────────────────────────────

export async function getSceneComments(movieId: number): Promise<SceneComment[]> {
  const { data } = await supabaseAdmin
    .from('scene_comments')
    .select('*, author:profiles!scene_comments_user_id_fkey(id, display_name, avatar)')
    .eq('movie_id', movieId)
    .order('timestamp_sec', { ascending: true });
  return (data ?? []) as SceneComment[];
}

export async function addSceneComment(
  userId: string,
  comment: { movie_id: number; timestamp_sec: number; body: string; spoiler?: boolean },
): Promise<SceneComment | null> {
  const { data } = await supabaseAdmin
    .from('scene_comments')
    .insert({ user_id: userId, ...comment })
    .select('*')
    .single();
  return (data as SceneComment) ?? null;
}

// ─── Lists ────────────────────────────────────────────────────────────────

export async function getLists(userId?: string): Promise<MovieList[]> {
  let q = supabaseAdmin
    .from('lists')
    .select('*')
    .order('updated_at', { ascending: false });
  if (userId) q = q.eq('user_id', userId);
  else q = q.eq('is_public', true);
  const { data } = await q.limit(50);
  return (data ?? []) as MovieList[];
}

export async function createList(
  userId: string,
  list: { title: string; description?: string; is_public?: boolean; cover_image?: string | null },
): Promise<MovieList | null> {
  const { data } = await supabaseAdmin
    .from('lists')
    .insert({ user_id: userId, ...list })
    .select('*')
    .single();
  return (data as MovieList) ?? null;
}

export async function getListItems(listId: string): Promise<ListItem[]> {
  const { data } = await supabaseAdmin
    .from('list_items')
    .select('*')
    .eq('list_id', listId)
    .order('order_index', { ascending: true });
  return (data ?? []) as ListItem[];
}

export async function addListItem(
  listId: string,
  item: { movie_id: number; movie_title: string; poster_path?: string | null;
          order_index?: number; note?: string },
): Promise<ListItem | null> {
  const { data } = await supabaseAdmin
    .from('list_items')
    .insert({ list_id: listId, ...item })
    .select('*')
    .single();
  return (data as ListItem) ?? null;
}

// ─── Follows (F24) ────────────────────────────────────────────────────────

export async function followUser(followerId: string, followeeId: string): Promise<boolean> {
  if (followerId === followeeId) return false;
  const { error } = await supabaseAdmin
    .from('follows')
    .insert({ follower_id: followerId, followee_id: followeeId });
  if (!error) {
    await supabaseAdmin.from('notifications').insert({
      user_id: followeeId,
      type: 'follow',
      actor_id: followerId,
      entity_type: 'profile',
      message: 'started following you',
    });
  }
  return !error;
}

export async function unfollowUser(followerId: string, followeeId: string): Promise<void> {
  await supabaseAdmin
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId);
}

export async function getFollowing(userId: string): Promise<Profile[]> {
  const { data } = await supabaseAdmin
    .from('follows')
    .select('followee:profiles!follows_followee_id_fkey(*)')
    .eq('follower_id', userId);
  return ((data ?? []) as unknown as { followee: Profile }[]).map(d => d.followee);
}

export async function getFollowers(userId: string): Promise<Profile[]> {
  const { data } = await supabaseAdmin
    .from('follows')
    .select('follower:profiles!follows_follower_id_fkey(*)')
    .eq('followee_id', userId);
  return ((data ?? []) as unknown as { follower: Profile }[]).map(d => d.follower);
}

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId);
  return (count ?? 0) > 0;
}

export async function getFollowerCount(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('followee_id', userId);
  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);
  return count ?? 0;
}

// ─── Communities ──────────────────────────────────────────────────────────

export async function getCommunities(limit = 50): Promise<Community[]> {
  const { data } = await supabaseAdmin
    .from('communities')
    .select('*')
    .order('member_count', { ascending: false })
    .limit(limit);
  return (data ?? []) as Community[];
}

export async function getCommunityBySlug(slug: string): Promise<Community | null> {
  const { data } = await supabaseAdmin
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  return (data as Community) ?? null;
}

export async function createCommunity(
  userId: string,
  c: { name: string; description?: string; category?: string; banner_url?: string | null },
): Promise<Community | null> {
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const { data } = await supabaseAdmin
    .from('communities')
    .insert({ ...c, slug, created_by: userId })
    .select('*')
    .single();
  if (data) {
    await supabaseAdmin
      .from('community_members')
      .insert({ community_id: data.id, user_id: userId, role: 'admin' });
  }
  return (data as Community) ?? null;
}

export async function joinCommunity(communityId: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('community_members')
    .insert({ community_id: communityId, user_id: userId, role: 'member' });
  return !error;
}

export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
  await supabaseAdmin
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);
}

export async function isCommunityMember(communityId: string, userId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

// ─── Posts + Comments + Likes ─────────────────────────────────────────────

export async function getPosts(communityId: string, limit = 50): Promise<Post[]> {
  const { data } = await supabaseAdmin
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(id, display_name, avatar)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as Post[];
}

export async function createPost(
  userId: string,
  post: { community_id: string; title: string; body: string },
): Promise<Post | null> {
  const { data } = await supabaseAdmin
    .from('posts')
    .insert({ author_id: userId, ...post })
    .select('*')
    .single();
  return (data as Post) ?? null;
}

export async function getComments(postId: string): Promise<Comment[]> {
  const { data } = await supabaseAdmin
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(id, display_name, avatar)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return (data ?? []) as Comment[];
}

export async function createComment(
  userId: string,
  comment: { post_id: string; body: string; parent_id?: string | null },
): Promise<Comment | null> {
  const { data } = await supabaseAdmin
    .from('comments')
    .insert({ author_id: userId, ...comment })
    .select('*')
    .single();
  return (data as Comment) ?? null;
}

export async function toggleLike(
  userId: string,
  entityType: 'post' | 'comment' | 'review' | 'scene_comment',
  entityId: string,
  value: 1 | -1 = 1,
): Promise<boolean> {
  // First try to delete existing
  await supabaseAdmin
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  const { error } = await supabaseAdmin
    .from('likes')
    .insert({ user_id: userId, entity_type: entityType, entity_id: entityId, value });
  return !error;
}

// ─── Achievements (F23) ───────────────────────────────────────────────────

export async function getAllAchievements(): Promise<Achievement[]> {
  const { data } = await supabaseAdmin
    .from('achievements')
    .select('*')
    .order('xp', { ascending: true });
  return (data ?? []) as Achievement[];
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data } = await supabaseAdmin
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });
  return (data ?? []) as UserAchievement[];
}

export async function unlockAchievement(userId: string, code: string): Promise<boolean> {
  const { data: ach } = await supabaseAdmin
    .from('achievements')
    .select('id, title')
    .eq('code', code)
    .maybeSingle();
  if (!ach) return false;

  const { error } = await supabaseAdmin
    .from('user_achievements')
    .upsert({ user_id: userId, achievement_id: ach.id }, { onConflict: 'user_id,achievement_id' });

  if (!error) {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'achievement',
      entity_type: 'achievement',
      entity_id: ach.id,
      message: `Achievement unlocked: ${ach.title}`,
    });
  }
  return !error;
}

/** Check & unlock any achievements the user qualifies for based on counters. */
export async function checkAndUnlockAchievements(userId: string): Promise<void> {
  const [diaryCount, reviewCount, listCount, followerCount] = await Promise.all([
    getDiaryCount(userId),
    getReviewCount(userId),
    supabaseAdmin.from('lists').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      .then(r => r.count ?? 0),
    getFollowerCount(userId),
  ]);

  const codes: string[] = [];
  if (reviewCount >= 1) codes.push('first_review');
  if (reviewCount >= 10) codes.push('ten_reviews');
  if (reviewCount >= 50) codes.push('fifty_reviews');
  if (diaryCount >= 1) codes.push('first_diary');
  if (diaryCount >= 10) codes.push('ten_diary');
  if (diaryCount >= 50) codes.push('fifty_diary');
  if (diaryCount >= 100) codes.push('hundred_diary');
  if (listCount >= 1) codes.push('first_list');
  if (listCount >= 5) codes.push('five_lists');
  if (followerCount >= 10) codes.push('ten_followers');
  if (followerCount >= 100) codes.push('hundred_followers');

  await Promise.all(codes.map(c => unlockAchievement(userId, c)));
}

// ─── Notifications ────────────────────────────────────────────────────────

export async function getNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const { data } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count ?? 0;
}

// ─── Watch Parties (F21) ──────────────────────────────────────────────────

export async function getWatchParties(limit = 30): Promise<WatchParty[]> {
  const { data } = await supabaseAdmin
    .from('watch_parties')
    .select('*')
    .order('scheduled_for', { ascending: true })
    .limit(limit);
  return (data ?? []) as WatchParty[];
}

export async function getWatchParty(id: string): Promise<WatchParty | null> {
  const { data } = await supabaseAdmin
    .from('watch_parties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as WatchParty) ?? null;
}

export async function createWatchParty(
  userId: string,
  party: { movie_id: number; movie_title: string; poster_path?: string | null; scheduled_for: string },
): Promise<WatchParty | null> {
  const room_code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data } = await supabaseAdmin
    .from('watch_parties')
    .insert({ host_id: userId, room_code, ...party })
    .select('*')
    .single();
  if (data) {
    await supabaseAdmin.from('watch_party_attendees').insert({
      party_id: data.id, user_id: userId, rsvp: 'yes',
    });
  }
  return (data as WatchParty) ?? null;
}

export async function rsvpWatchParty(partyId: string, userId: string, rsvp: 'yes' | 'maybe' | 'no'): Promise<void> {
  await supabaseAdmin
    .from('watch_party_attendees')
    .upsert({ party_id: partyId, user_id: userId, rsvp }, { onConflict: 'party_id,user_id' });
}

export async function getWatchPartyChat(partyId: string, limit = 200): Promise<WatchPartyChat[]> {
  const { data } = await supabaseAdmin
    .from('watch_party_chat')
    .select('*, author:profiles!watch_party_chat_user_id_fkey(id, display_name, avatar)')
    .eq('party_id', partyId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as WatchPartyChat[];
}

export async function sendWatchPartyChat(
  partyId: string, userId: string, body: string, timestamp_sec: number | null = null,
): Promise<WatchPartyChat | null> {
  const { data } = await supabaseAdmin
    .from('watch_party_chat')
    .insert({ party_id: partyId, user_id: userId, body, timestamp_sec })
    .select('*')
    .single();
  return (data as WatchPartyChat) ?? null;
}

// ─── Taste Twins (F7) ─────────────────────────────────────────────────────

export async function getTasteTwins(userId: string, limit = 5): Promise<TasteTwin[]> {
  const { data } = await supabaseAdmin
    .from('taste_twins')
    .select('*, twin:profiles!taste_twins_twin_user_id_fkey(id, display_name, avatar, bio)')
    .eq('user_id', userId)
    .order('similarity', { ascending: false })
    .limit(limit);
  return (data ?? []) as TasteTwin[];
}

// ─── Game Results ─────────────────────────────────────────────────────────

export async function recordGameResult(
  userId: string,
  gameType: 'grid' | 'six_degrees' | 'trivia',
  score: number,
  details: Record<string, unknown>,
): Promise<void> {
  await supabaseAdmin.from('game_results').insert({
    user_id: userId, game_type: gameType, score, details,
  });
}

export async function getGameResults(
  userId: string, gameType: 'grid' | 'six_degrees' | 'trivia', limit = 20,
): Promise<GameResult[]> {
  const { data } = await supabaseAdmin
    .from('game_results')
    .select('*')
    .eq('user_id', userId)
    .eq('game_type', gameType)
    .order('played_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as GameResult[];
}

export async function getGridLeaderboard(limit = 20): Promise<Array<{ user_id: string; total: number; display_name: string; avatar: string }>> {
  const { data } = await supabaseAdmin
    .from('game_results')
    .select('user_id, score, profiles!game_results_user_id_fkey(display_name, avatar)')
    .eq('game_type', 'grid')
    .order('score', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    user_id: r.user_id,
    total: r.score,
    display_name: r.profiles?.display_name ?? 'Anonymous',
    avatar: r.profiles?.avatar ?? '',
  }));
}

// ─── Daily Grids (F32) ────────────────────────────────────────────────────

export async function getDailyGrid(date: string): Promise<DailyGrid | null> {
  const { data } = await supabaseAdmin
    .from('daily_grids')
    .select('*')
    .eq('grid_date', date)
    .maybeSingle();
  return (data as DailyGrid) ?? null;
}

export async function upsertDailyGrid(grid: Omit<DailyGrid, 'id' | 'created_at'>): Promise<DailyGrid | null> {
  const { data } = await supabaseAdmin
    .from('daily_grids')
    .upsert(grid, { onConflict: 'grid_date' })
    .select('*')
    .single();
  return (data as DailyGrid) ?? null;
}

// ─── Newsletter ───────────────────────────────────────────────────────────

export async function subscribeNewsletter(email: string, frequency: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('newsletter_subscriptions')
    .upsert({ email, frequency }, { onConflict: 'email' });
  return !error;
}

// ─── Scene Reactions ──────────────────────────────────────────────────────

export async function addSceneReaction(
  userId: string, movieId: number, timestamp_sec: number, emoji: string,
): Promise<void> {
  await supabaseAdmin.from('scene_reactions').upsert({
    user_id: userId, movie_id: movieId, timestamp_sec, emoji,
  }, { onConflict: 'user_id,mood,movie_id' });
}

export async function getSceneReactions(movieId: number): Promise<SceneReaction[]> {
  const { data } = await supabaseAdmin
    .from('scene_reactions')
    .select('*')
    .eq('movie_id', movieId)
    .order('timestamp_sec', { ascending: true });
  return (data ?? []) as SceneReaction[];
}

// ─── Daily Streak (F34) ───────────────────────────────────────────────────

export async function checkIn(userId: string): Promise<{ currentStreak: number; isNew: boolean }> {
  const profile = await getProfileById(userId);
  if (!profile) return { currentStreak: 0, isNew: false };

  const today = new Date().toISOString().slice(0, 10);
  const lastCheckIn = profile.last_check_in ? profile.last_check_in.toString().slice(0, 10) : null;

  if (lastCheckIn === today) {
    return { currentStreak: profile.streak_count, isNew: false };
  }

  let newStreak = 1;
  if (lastCheckIn) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastCheckIn === yesterday) {
      newStreak = profile.streak_count + 1;
    }
  }

  await supabaseAdmin.from('profiles').update({
    last_check_in: today,
    streak_count: newStreak,
    longest_streak: Math.max(profile.longest_streak, newStreak),
  }).eq('id', userId);

  // Streak achievements
  if (newStreak >= 3) await unlockAchievement(userId, 'streak_3');
  if (newStreak >= 7) await unlockAchievement(userId, 'streak_7');
  if (newStreak >= 30) await unlockAchievement(userId, 'streak_30');
  if (newStreak >= 100) await unlockAchievement(userId, 'streak_100');

  return { currentStreak: newStreak, isNew: true };
}
