'use client';

// ─── Community Social Storage (localStorage-backed) ───

const LIKES_KEY = 'typescribe_post_likes';
const COMMENTS_KEY = 'typescribe_post_comments';
const FOLLOWING_KEY = 'typescribe_following';
const COMMUNITY_META_KEY = 'typescribe_community_meta';
const JOINED_COMMUNITIES_KEY = 'typescribe_joined_communities';

// ─── Types ───

export interface PostLike {
  postId: string;
  userId: number;
  type: 'like' | 'dislike';
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: number;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface FollowStatus {
  followingId: number;
  createdAt: string;
}

export interface CommunityMeta {
  communityId: string;
  backgroundUrl: string;
  creatorId: number;
  creatorName: string;
  description: string;
  rules: string[];
}

// ─── Likes ───

export function getPostLikes(): PostLike[] {
  try {
    const data = localStorage.getItem(LIKES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function savePostLikes(likes: PostLike[]) {
  localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
}

export function getUserPostLike(postId: string, userId: number): PostLike | undefined {
  return getPostLikes().find(l => l.postId === postId && l.userId === userId);
}

export function getPostLikeCounts(postId: string): { likes: number; dislikes: number } {
  const likes = getPostLikes().filter(l => l.postId === postId);
  return {
    likes: likes.filter(l => l.type === 'like').length,
    dislikes: likes.filter(l => l.type === 'dislike').length,
  };
}

export function togglePostLike(postId: string, userId: number, type: 'like' | 'dislike'): PostLike | null {
  const likes = getPostLikes();
  const existingIdx = likes.findIndex(l => l.postId === postId && l.userId === userId);

  if (existingIdx >= 0) {
    const existing = likes[existingIdx];
    if (existing.type === type) {
      likes.splice(existingIdx, 1);
      savePostLikes(likes);
      return null;
    } else {
      likes[existingIdx] = { ...existing, type, createdAt: new Date().toISOString() };
      savePostLikes(likes);
      return likes[existingIdx];
    }
  }

  const newLike: PostLike = { postId, userId, type, createdAt: new Date().toISOString() };
  likes.push(newLike);
  savePostLikes(likes);
  return newLike;
}

// ─── Comments ───

export function getComments(): Comment[] {
  try {
    const data = localStorage.getItem(COMMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveComments(comments: Comment[]) {
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
}

export function getPostComments(postId: string): Comment[] {
  return getComments().filter(c => c.postId === postId);
}

export function addComment(postId: string, parentId: string | null, authorId: number, authorName: string, authorAvatar: string, content: string): Comment {
  const comments = getComments();
  const newComment: Comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    postId, parentId, authorId, authorName, authorAvatar,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  comments.unshift(newComment);
  saveComments(comments);
  return newComment;
}

export function deleteComment(commentId: string): void {
  const comments = getComments().filter(c => c.id !== commentId);
  saveComments(comments);
}

// ─── Following ───

export function getFollowing(): FollowStatus[] {
  try {
    const data = localStorage.getItem(FOLLOWING_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveFollowing(follows: FollowStatus[]) {
  localStorage.setItem(FOLLOWING_KEY, JSON.stringify(follows));
}

export function isFollowing(followingId: number): boolean {
  return getFollowing().some(f => f.followingId === followingId);
}

export function toggleFollow(followingId: number): boolean {
  const follows = getFollowing();
  const existingIdx = follows.findIndex(f => f.followingId === followingId);
  if (existingIdx >= 0) {
    follows.splice(existingIdx, 1);
    saveFollowing(follows);
    return false;
  }
  follows.push({ followingId, createdAt: new Date().toISOString() });
  saveFollowing(follows);
  return true;
}

export function getFollowerCount(userId: number): number {
  const localCount = getFollowing().filter(f => f.followingId === userId).length;
  // Add mock baseline for users who aren't followed locally yet
  return localCount + Math.floor(Math.random() * 50) + 5;
}

export function getFollowingCount(userId: number): number {
  return getFollowing().length + Math.floor(Math.random() * 30) + 3;
}

// ─── Community Meta (background, creator, editable rules/description) ───

export function getCommunityMeta(communityId: string): CommunityMeta | null {
  try {
    const data = localStorage.getItem(COMMUNITY_META_KEY);
    const all: CommunityMeta[] = data ? JSON.parse(data) : [];
    return all.find(m => m.communityId === communityId) || null;
  } catch { return null; }
}

export function getAllCommunityMeta(): CommunityMeta[] {
  try {
    const data = localStorage.getItem(COMMUNITY_META_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveAllCommunityMeta(meta: CommunityMeta[]) {
  localStorage.setItem(COMMUNITY_META_KEY, JSON.stringify(meta));
}

export function saveCommunityMeta(meta: CommunityMeta) {
  const all = getAllCommunityMeta();
  const idx = all.findIndex(m => m.communityId === meta.communityId);
  if (idx >= 0) {
    all[idx] = meta;
  } else {
    all.push(meta);
  }
  saveAllCommunityMeta(all);
}

// ─── Joined Communities ───

export function getJoinedCommunities(): string[] {
  try {
    const data = localStorage.getItem(JOINED_COMMUNITIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function saveJoinedCommunities(ids: string[]): void {
  localStorage.setItem(JOINED_COMMUNITIES_KEY, JSON.stringify(ids));
}

// ─── Mock Users Database (for public profile lookups) ───

export interface MockUser {
  id: number;
  display_name: string;
  avatar: string;
  bio: string;
  favorite_genres: string[];
  created_at: string;
  reviewCount: number;
  isCreator: boolean;
  createdCommunities: string[];
}

const MOCK_USERS_DB_KEY = 'typescribe_mock_users';

export function getMockUsers(): MockUser[] {
  try {
    const data = localStorage.getItem(MOCK_USERS_DB_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }

  // Initialize with default mock users
  const defaults: MockUser[] = [
    { id: 201, display_name: 'FilmBuff42', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix', bio: 'Horror aficionado and indie film lover. Always hunting for the next great scare.', favorite_genres: ['Horror', 'Thriller', 'Indie'], created_at: '2024-01-15T00:00:00Z', reviewCount: 47, isCreator: true, createdCommunities: ['horror-fans'] },
    { id: 202, display_name: 'HorrorHound', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster', bio: 'If it goes bump in the night, I want to watch it. Horror director specialist.', favorite_genres: ['Horror', 'Mystery'], created_at: '2024-03-10T00:00:00Z', reviewCount: 23, isCreator: false, createdCommunities: [] },
    { id: 203, display_name: 'CinePhreak', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke', bio: 'Film history nerd. Pre-70s cinema is my playground.', favorite_genres: ['Classic', 'Drama'], created_at: '2024-05-22T00:00:00Z', reviewCount: 31, isCreator: false, createdCommunities: [] },
    { id: 204, display_name: 'DramaQueen', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka', bio: 'K-drama addict since 2019. My watchlist is never empty.', favorite_genres: ['Drama', 'Romance'], created_at: '2024-02-14T00:00:00Z', reviewCount: 56, isCreator: true, createdCommunities: ['k-drama-club'] },
    { id: 205, display_name: 'SeoulSister', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna', bio: 'Plot-driven drama enthusiast. No patience for filler episodes.', favorite_genres: ['Drama', 'Action'], created_at: '2024-04-08T00:00:00Z', reviewCount: 19, isCreator: false, createdCommunities: [] },
    { id: 206, display_name: 'OtakuPrime', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper', bio: 'Seasonal anime tracker. Currently watching 14 shows simultaneously.', favorite_genres: ['Anime', 'Sci-Fi'], created_at: '2023-11-01T00:00:00Z', reviewCount: 89, isCreator: true, createdCommunities: ['anime-explorers'] },
    { id: 207, display_name: 'MangaFan99', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Midnight', bio: 'Read the manga first, watch the anime second. Always.', favorite_genres: ['Anime', 'Fantasy'], created_at: '2024-06-20T00:00:00Z', reviewCount: 34, isCreator: false, createdCommunities: [] },
    { id: 208, display_name: 'Nolanite', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow', bio: 'Christopher Nolan is the GOAT. The Prestige > Inception. Fight me.', favorite_genres: ['Sci-Fi', 'Thriller'], created_at: '2024-01-05T00:00:00Z', reviewCount: 42, isCreator: true, createdCommunities: ['nolan-fans'] },
    { id: 209, display_name: 'SpaceNerd', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Simba', bio: 'Space operas and hard sci-fi are my bread and butter.', favorite_genres: ['Sci-Fi', 'Adventure'], created_at: '2024-02-14T00:00:00Z', reviewCount: 28, isCreator: false, createdCommunities: [] },
    { id: 210, display_name: 'IndieLover', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe', bio: 'A24 is a lifestyle. Moonlight changed my life.', favorite_genres: ['Indie', 'Drama'], created_at: '2024-01-15T00:00:00Z', reviewCount: 67, isCreator: true, createdCommunities: ['a24-appreciation'] },
  ];
  localStorage.setItem(MOCK_USERS_DB_KEY, JSON.stringify(defaults));
  return defaults;
}

export function getMockUserById(id: number): MockUser | undefined {
  return getMockUsers().find(u => u.id === id);
}

export function getMockUserByName(name: string): MockUser | undefined {
  return getMockUsers().find(u => u.display_name === name);
}

// ─── Time formatting ───

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── Community Watchlist ───

export interface WatchlistItem {
  id: string;
  communityId: string;
  movieId: number;
  movieTitle: string;
  movieSlug: string;
  posterPath: string;
  addedBy: string;
  addedById: number;
  votes: number;
  votedUsers: number[]; // user IDs who voted
  addedAt: string;
}

// ─── Community Movie Rating ───

export interface CommunityMovieRating {
  communityId: string;
  movieId: number;
  movieSlug: string;
  averageRating: number;
  ratingCount: number;
  ratings: Array<{ userId: number; rating: number }>;
}

// ─── Community Debate Link ───

export interface CommunityDebate {
  id: string;
  communityId: string;
  movieSlug: string;
  movieTitle: string;
  proposition: string;
  author: string;
  defending: number;
  challenging: number;
  createdAt: string;
}

// ─── Watchlist Functions ───

const WATCHLIST_KEY = 'typescribe_community_watchlists';

export function getCommunityWatchlist(communityId: string): WatchlistItem[] {
  try {
    const data = localStorage.getItem(WATCHLIST_KEY);
    const all: Record<string, WatchlistItem[]> = data ? JSON.parse(data) : {};
    return all[communityId] || [];
  } catch { return []; }
}

function saveAllWatchlists(all: Record<string, WatchlistItem[]>) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(all));
}

export function addWatchlistItem(item: Omit<WatchlistItem, 'id' | 'votes' | 'votedUsers' | 'addedAt'>): WatchlistItem {
  const all: Record<string, WatchlistItem[]> = (() => {
    try {
      const data = localStorage.getItem(WATCHLIST_KEY);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  })();
  
  const newItem: WatchlistItem = {
    ...item,
    id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    votes: 1,
    votedUsers: [item.addedById],
    addedAt: new Date().toISOString(),
  };
  
  if (!all[item.communityId]) all[item.communityId] = [];
  all[item.communityId].unshift(newItem);
  saveAllWatchlists(all);
  return newItem;
}

export function voteWatchlistItem(communityId: string, itemId: string, userId: number): WatchlistItem | null {
  const all: Record<string, WatchlistItem[]> = (() => {
    try {
      const data = localStorage.getItem(WATCHLIST_KEY);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  })();
  
  if (!all[communityId]) return null;
  const idx = all[communityId].findIndex(i => i.id === itemId);
  if (idx < 0) return null;
  
  const item = all[communityId][idx];
  if (item.votedUsers.includes(userId)) {
    // Remove vote
    item.votes = Math.max(0, item.votes - 1);
    item.votedUsers = item.votedUsers.filter(id => id !== userId);
  } else {
    // Add vote
    item.votes += 1;
    item.votedUsers.push(userId);
  }
  
  all[communityId][idx] = item;
  saveAllWatchlists(all);
  return item;
}

export function removeWatchlistItem(communityId: string, itemId: string): void {
  const all: Record<string, WatchlistItem[]> = (() => {
    try {
      const data = localStorage.getItem(WATCHLIST_KEY);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  })();
  
  if (!all[communityId]) return;
  all[communityId] = all[communityId].filter(i => i.id !== itemId);
  saveAllWatchlists(all);
}

export function getWeeklyPick(communityId: string): WatchlistItem | null {
  const items = getCommunityWatchlist(communityId);
  if (items.length === 0) return null;
  // Sort by votes descending, return top item
  return [...items].sort((a, b) => b.votes - a.votes)[0];
}

// ─── Community Rating Functions ───

const COMMUNITY_RATINGS_KEY = 'typescribe_community_ratings';

export function getCommunityRatings(movieId: number): CommunityMovieRating[] {
  try {
    const data = localStorage.getItem(COMMUNITY_RATINGS_KEY);
    const all: CommunityMovieRating[] = data ? JSON.parse(data) : [];
    return all.filter(r => r.movieId === movieId);
  } catch { return []; }
}

export function getCommunityRatingForMovie(communityId: string, movieId: number): CommunityMovieRating | null {
  try {
    const data = localStorage.getItem(COMMUNITY_RATINGS_KEY);
    const all: CommunityMovieRating[] = data ? JSON.parse(data) : [];
    return all.find(r => r.communityId === communityId && r.movieId === movieId) || null;
  } catch { return null; }
}

export function setCommunityRating(communityId: string, movieId: number, movieSlug: string, userId: number, rating: number): CommunityMovieRating {
  let all: CommunityMovieRating[] = [];
  try {
    const data = localStorage.getItem(COMMUNITY_RATINGS_KEY);
    all = data ? JSON.parse(data) : [];
  } catch { /* ignore */ }
  
  const idx = all.findIndex(r => r.communityId === communityId && r.movieId === movieId);
  
  if (idx >= 0) {
    // Update existing
    const existing = all[idx];
    const userRatingIdx = existing.ratings.findIndex(r => r.userId === userId);
    if (userRatingIdx >= 0) {
      existing.ratings[userRatingIdx].rating = rating;
    } else {
      existing.ratings.push({ userId, rating });
    }
    existing.ratingCount = existing.ratings.length;
    existing.averageRating = existing.ratings.reduce((sum, r) => sum + r.rating, 0) / existing.ratings.length;
    all[idx] = existing;
  } else {
    // Create new
    all.push({
      communityId,
      movieId,
      movieSlug,
      averageRating: rating,
      ratingCount: 1,
      ratings: [{ userId, rating }],
    });
  }
  
  localStorage.setItem(COMMUNITY_RATINGS_KEY, JSON.stringify(all));
  return all.find(r => r.communityId === communityId && r.movieId === movieId)!;
}

export function generateMockCommunityRatings(movieId: number, genres: Array<{ id: number; name: string }>, generalRating: number): CommunityMovieRating[] {
  // Generate realistic community-specific ratings based on genre alignment
  const communities = [
    { id: 'horror-fans', genres: ['Horror', 'Thriller'], bias: 1.2 },
    { id: 'scifi-universe', genres: ['Science Fiction', 'Adventure'], bias: 1.15 },
    { id: 'anime-explorers', genres: ['Animation', 'Anime'], bias: 1.25 },
    { id: 'nolan-fans', genres: ['Thriller', 'Science Fiction'], bias: 1.1 },
    { id: 'a24-appreciation', genres: ['Drama', 'Indie'], bias: 1.05 },
    { id: 'classic-cinema', genres: ['Drama', 'History'], bias: 0.9 },
    { id: 'bollywood-beats', genres: ['Romance', 'Music'], bias: 1.0 },
    { id: 'k-drama-club', genres: ['Drama', 'Romance'], bias: 1.1 },
    { id: 'documentary-circle', genres: ['Documentary'], bias: 0.95 },
    { id: 'romance-fans', genres: ['Romance'], bias: 1.05 },
    { id: 'indie-film-lovers', genres: ['Drama', 'Comedy'], bias: 1.0 },
    { id: 'nollywood-watchers', genres: ['Drama', 'Action'], bias: 1.1 },
  ];
  
  const movieGenreNames = genres.map(g => g.name);
  
  // Find communities that match this movie's genres
  const matching = communities.filter(c => 
    c.genres.some(cg => movieGenreNames.includes(cg))
  );
  
  // Also include 2-3 random communities for variety
  const nonMatching = communities.filter(c => !matching.includes(c));
  const randomExtra = nonMatching.sort(() => Math.random() - 0.5).slice(0, 2);
  
  const relevant = [...matching, ...randomExtra];
  
  return relevant.map(c => {
    const isGenreMatch = c.genres.some(cg => movieGenreNames.includes(cg));
    // Genre-matching communities rate higher, others rate slightly lower
    const variance = (Math.random() - 0.5) * 1.5;
    const baseAdjust = isGenreMatch ? c.bias : 0.85;
    const avgRating = Math.max(1, Math.min(10, Math.round((generalRating * baseAdjust + variance) * 10) / 10));
    const ratingCount = isGenreMatch 
      ? Math.floor(Math.random() * 80) + 20 
      : Math.floor(Math.random() * 30) + 5;
    
    return {
      communityId: c.id,
      movieId,
      movieSlug: '',
      averageRating: avgRating,
      ratingCount,
      ratings: [],
    };
  }).filter(r => r.ratingCount > 0);
}

// ─── Community Debate Functions ───

export function getDebatesForCommunity(communityId: string): CommunityDebate[] {
  try {
    const data = localStorage.getItem('typescribe_community_debates');
    const all: CommunityDebate[] = data ? JSON.parse(data) : [];
    return all.filter(d => d.communityId === communityId);
  } catch { return []; }
}

export function addDebateToCommunity(debate: Omit<CommunityDebate, 'id'>): CommunityDebate {
  let all: CommunityDebate[] = [];
  try {
    const data = localStorage.getItem('typescribe_community_debates');
    all = data ? JSON.parse(data) : [];
  } catch { /* ignore */ }
  
  // Check if already linked
  const exists = all.some(d => 
    d.communityId === debate.communityId && 
    d.movieSlug === debate.movieSlug && 
    d.proposition === debate.proposition
  );
  if (exists) return all.find(d => d.communityId === debate.communityId && d.movieSlug === debate.movieSlug && d.proposition === debate.proposition)!;
  
  const newDebate: CommunityDebate = {
    ...debate,
    id: `cd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  all.push(newDebate);
  localStorage.setItem('typescribe_community_debates', JSON.stringify(all));
  return newDebate;
}

// Map genres to community IDs for auto-linking debates
export function getCommunitiesForGenres(genres: Array<{ id: number; name: string }>): string[] {
  const genreToCommunity: Record<string, string[]> = {
    'Horror': ['horror-fans'],
    'Thriller': ['horror-fans', 'nolan-fans'],
    'Science Fiction': ['scifi-universe', 'nolan-fans'],
    'Action': ['nollywood-watchers'],
    'Drama': ['a24-appreciation', 'classic-cinema', 'k-drama-club', 'indie-film-lovers'],
    'Comedy': ['indie-film-lovers'],
    'Romance': ['romance-fans', 'bollywood-beats', 'k-drama-club'],
    'Animation': ['anime-explorers'],
    'Anime': ['anime-explorers'],
    'Documentary': ['documentary-circle'],
    'Adventure': ['scifi-universe'],
    'Fantasy': ['anime-explorers', 'scifi-universe'],
    'Mystery': ['horror-fans', 'nolan-fans'],
    'Music': ['bollywood-beats'],
  };
  
  const communityIds = new Set<string>();
  for (const genre of genres) {
    const mapped = genreToCommunity[genre.name] || [];
    mapped.forEach(id => communityIds.add(id));
  }
  return Array.from(communityIds);
}
