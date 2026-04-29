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

// ─── Weekly Themes ───

export interface WeeklyTheme {
  communityId: string;
  weekStart: string; // ISO date of Monday
  title: string;
  description: string;
  prompt: string;
  suggestedMovies: Array<{ title: string; slug: string; reason: string }>;
  createdAt: string;
}

const WEEKLY_THEMES_KEY = 'typescribe_community_weekly_themes';

// Community genre profiles for theme generation
const COMMUNITY_GENRE_PROFILES: Record<string, { genres: string[]; vibes: string[] }> = {
  'horror-fans': { genres: ['Horror', 'Thriller', 'Mystery'], vibes: ['spine-chilling', 'unsettling', 'dark', 'atmospheric'] },
  'k-drama-club': { genres: ['Drama', 'Romance'], vibes: ['emotional', 'heartwarming', 'binge-worthy', 'slow-burn'] },
  'nollywood-watchers': { genres: ['Drama', 'Action', 'Comedy'], vibes: ['vibrant', 'culturally rich', 'groundbreaking', 'entertaining'] },
  'nolan-fans': { genres: ['Sci-Fi', 'Thriller', 'Mystery'], vibes: ['mind-bending', 'cerebral', 'epic', 'non-linear'] },
  'anime-explorers': { genres: ['Animation', 'Fantasy', 'Action'], vibes: ['visually stunning', 'imaginative', 'emotional', 'epic'] },
  'classic-cinema': { genres: ['Drama', 'History', 'Romance'], vibes: ['timeless', 'pioneering', 'elegant', 'influential'] },
  'scifi-universe': { genres: ['Science Fiction', 'Adventure', 'Fantasy'], vibes: ['visionary', 'thought-provoking', 'vast', 'futuristic'] },
  'indie-film-lovers': { genres: ['Drama', 'Comedy', 'Romance'], vibes: ['intimate', 'authentic', 'hidden-gem', 'quirky'] },
  'bollywood-beats': { genres: ['Romance', 'Music', 'Drama'], vibes: ['spectacular', 'musical', 'colourful', 'soulful'] },
  'documentary-circle': { genres: ['Documentary', 'History'], vibes: ['eye-opening', 'real', 'investigative', 'impactful'] },
  'romance-fans': { genres: ['Romance', 'Drama', 'Comedy'], vibes: ['heartwarming', 'passionate', 'tender', 'swoon-worthy'] },
  'a24-appreciation': { genres: ['Drama', 'Horror', 'Indie'], vibes: ['avant-garde', 'haunting', 'beautifully strange', 'bold'] },
};

const THEME_TEMPLATES: Array<(vibes: string[]) => { title: string; description: string; prompt: string }> = [
  (vibes) => ({
    title: `Most ${vibes[0]} film of the decade?`,
    description: `Share the film that left the most ${vibes[0]} impression on you from the past 10 years.`,
    prompt: `What film gave you the most ${vibes[0]} experience in the last decade? Why does it stand out above the rest?`,
  }),
  (vibes) => ({
    title: `Underrated ${vibes[1]} picks`,
    description: `Hidden gems that deserve more recognition for their ${vibes[1]} qualities.`,
    prompt: `What's a film with incredible ${vibes[1]} qualities that flew under the radar? Convince us to watch it.`,
  }),
  (vibes) => ({
    title: `${vibes[2]} movie matchups`,
    description: `Compare two films with similar ${vibes[2]} vibes and debate which one did it better.`,
    prompt: `Pick two films that share ${vibes[2]} qualities. Which one executed it better and why?`,
  }),
  (vibes) => ({
    title: `The ${vibes[3]} starter pack`,
    description: `If someone wanted to experience the best ${vibes[3]} cinema, which 3 films would you recommend?`,
    prompt: `You're introducing someone to ${vibes[3]} cinema. What 3 films make the perfect starter pack?`,
  }),
  (vibes) => ({
    title: `Directors who master the ${vibes[0]} craft`,
    description: `Celebrating filmmakers who consistently deliver ${vibes[0]} experiences.`,
    prompt: `Which director consistently delivers the most ${vibes[0]} films? Share your favourite work of theirs.`,
  }),
  (vibes) => ({
    title: `${vibes[1]} scenes that stayed with you`,
    description: `Those unforgettable moments that define why we love ${vibes[1]} cinema.`,
    prompt: `What single scene from a film is permanently etched in your mind for being so ${vibes[1]}? No spoilers!`,
  }),
];

export function getWeeklyTheme(communityId: string): WeeklyTheme | null {
  try {
    const data = localStorage.getItem(WEEKLY_THEMES_KEY);
    const all: WeeklyTheme[] = data ? JSON.parse(data) : [];
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().split('T')[0];
    return all.find(t => t.communityId === communityId && t.weekStart === weekStart) || null;
  } catch { return null; }
}

export function generateWeeklyTheme(communityId: string): WeeklyTheme {
  const profile = COMMUNITY_GENRE_PROFILES[communityId] || { genres: ['Drama'], vibes: ['compelling', 'thoughtful', 'powerful', 'moving'] };
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().split('T')[0];

  // Seeded random based on week + community
  const seed = communityId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + monday.getTime() % 1000;
  const templateIdx = seed % THEME_TEMPLATES.length;
  const template = THEME_TEMPLATES[templateIdx](profile.vibes);

  const theme: WeeklyTheme = {
    communityId,
    weekStart,
    title: template.title,
    description: template.description,
    prompt: template.prompt,
    suggestedMovies: [],
    createdAt: new Date().toISOString(),
  };

  // Save it
  try {
    const data = localStorage.getItem(WEEKLY_THEMES_KEY);
    const all: WeeklyTheme[] = data ? JSON.parse(data) : [];
    const existingIdx = all.findIndex(t => t.communityId === communityId && t.weekStart === weekStart);
    if (existingIdx >= 0) {
      return all[existingIdx];
    }
    all.push(theme);
    localStorage.setItem(WEEKLY_THEMES_KEY, JSON.stringify(all));
  } catch { /* ignore */ }

  return theme;
}

export function getAllWeeklyThemes(): WeeklyTheme[] {
  try {
    const data = localStorage.getItem(WEEKLY_THEMES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

// ─── Taste Match Score ───

export interface TasteMatchResult {
  communityId: string;
  score: number; // 0-100
  matchedGenres: string[];
  totalGenres: string[];
  label: string; // 'Perfect Match', 'Great Match', 'Good Match', 'Different Taste'
}

const COMMUNITY_TASTE_PROFILES: Record<string, { genres: string[]; avgRatingBias: Record<string, number> }> = {
  'horror-fans': { genres: ['Horror', 'Thriller', 'Mystery'], avgRatingBias: { 'Horror': 1.3, 'Thriller': 1.15, 'Mystery': 1.1 } },
  'k-drama-club': { genres: ['Drama', 'Romance'], avgRatingBias: { 'Drama': 1.2, 'Romance': 1.2 } },
  'nollywood-watchers': { genres: ['Drama', 'Action', 'Comedy'], avgRatingBias: { 'Drama': 1.1, 'Action': 1.15, 'Comedy': 1.05 } },
  'nolan-fans': { genres: ['Sci-Fi', 'Thriller', 'Mystery'], avgRatingBias: { 'Sci-Fi': 1.2, 'Thriller': 1.2, 'Mystery': 1.15 } },
  'anime-explorers': { genres: ['Animation', 'Fantasy', 'Action'], avgRatingBias: { 'Animation': 1.3, 'Fantasy': 1.15, 'Action': 1.05 } },
  'classic-cinema': { genres: ['Drama', 'History', 'Romance'], avgRatingBias: { 'Drama': 1.1, 'History': 1.3, 'Romance': 1.0 } },
  'scifi-universe': { genres: ['Science Fiction', 'Adventure', 'Fantasy'], avgRatingBias: { 'Science Fiction': 1.3, 'Adventure': 1.1, 'Fantasy': 1.05 } },
  'indie-film-lovers': { genres: ['Drama', 'Comedy', 'Romance'], avgRatingBias: { 'Drama': 1.15, 'Comedy': 1.1, 'Romance': 1.0 } },
  'bollywood-beats': { genres: ['Romance', 'Music', 'Drama'], avgRatingBias: { 'Romance': 1.2, 'Music': 1.3, 'Drama': 1.05 } },
  'documentary-circle': { genres: ['Documentary', 'History'], avgRatingBias: { 'Documentary': 1.35, 'History': 1.15 } },
  'romance-fans': { genres: ['Romance', 'Drama', 'Comedy'], avgRatingBias: { 'Romance': 1.3, 'Drama': 1.05, 'Comedy': 1.0 } },
  'a24-appreciation': { genres: ['Drama', 'Horror', 'Indie'], avgRatingBias: { 'Drama': 1.2, 'Horror': 1.15, 'Indie': 1.3 } },
};

export function calculateTasteMatch(userGenres: string[], communityId: string): TasteMatchResult {
  const profile = COMMUNITY_TASTE_PROFILES[communityId];
  if (!profile) {
    return { communityId, score: 25, matchedGenres: [], totalGenres: userGenres, label: 'Different Taste' };
  }

  const communityGenres = profile.genres;
  const normalizedUserGenres = userGenres.map(g => g.toLowerCase());
  const normalizedCommunityGenres = communityGenres.map(g => g.toLowerCase());

  // Calculate overlap
  const matchedGenres = communityGenres.filter(g => normalizedUserGenres.includes(g.toLowerCase()));
  const matchCount = matchedGenres.length;
  const totalUnique = new Set([...normalizedUserGenres, ...normalizedCommunityGenres]).size;

  // Base score from Jaccard similarity
  const jaccardScore = totalUnique > 0 ? matchCount / totalUnique : 0;

  // Bonus for high-bias genre alignment
  let biasBonus = 0;
  for (const genre of matchedGenres) {
    const bias = profile.avgRatingBias[genre] || 1.0;
    biasBonus += (bias - 1.0) * 20; // Up to ~6 points per matched genre
  }

  // Calculate final score
  let score = Math.round(jaccardScore * 70 + biasBonus + matchCount * 5);
  score = Math.max(5, Math.min(100, score));

  let label: string;
  if (score >= 85) label = 'Perfect Match';
  else if (score >= 70) label = 'Great Match';
  else if (score >= 50) label = 'Good Match';
  else if (score >= 30) label = 'Worth Exploring';
  else label = 'Different Taste';

  return { communityId, score, matchedGenres, totalGenres: userGenres, label };
}

// ─── Activity Feed & Notifications ───

export type ActivityType = 'new_post' | 'new_comment' | 'new_debate' | 'new_member' | 'weekly_theme' | 'watchlist_vote' | 'like';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  communityId: string;
  communityName: string;
  actorId: number;
  actorName: string;
  actorAvatar: string;
  targetId: string; // post id, debate id, watchlist item id, etc.
  targetTitle: string; // post title, movie title, etc.
  createdAt: string;
  read: boolean;
}

const ACTIVITY_KEY = 'typescribe_community_activity';
const UNREAD_KEY = 'typescribe_community_unread_count';

export function getActivityFeed(communityId?: string, limit: number = 20): ActivityItem[] {
  try {
    const data = localStorage.getItem(ACTIVITY_KEY);
    const all: ActivityItem[] = data ? JSON.parse(data) : [];
    const filtered = communityId ? all.filter(a => a.communityId === communityId) : all;
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  } catch { return []; }
}

export function getMyActivityFeed(joinedCommunityIds: string[], limit: number = 20): ActivityItem[] {
  try {
    const data = localStorage.getItem(ACTIVITY_KEY);
    const all: ActivityItem[] = data ? JSON.parse(data) : [];
    const filtered = all.filter(a => joinedCommunityIds.includes(a.communityId));
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  } catch { return []; }
}

export function addActivity(item: Omit<ActivityItem, 'id' | 'read'>): ActivityItem {
  try {
    const data = localStorage.getItem(ACTIVITY_KEY);
    const all: ActivityItem[] = data ? JSON.parse(data) : [];
    const newActivity: ActivityItem = {
      ...item,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      read: false,
    };
    all.unshift(newActivity);
    // Keep only last 100 activities
    const trimmed = all.slice(0, 100);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed));
    // Update unread count
    const currentUnread = getUnreadCount();
    localStorage.setItem(UNREAD_KEY, JSON.stringify(currentUnread + 1));
    return newActivity;
  } catch { 
    return { ...item, id: `act-${Date.now()}`, read: false }; 
  }
}

export function getUnreadCount(): number {
  try {
    const data = localStorage.getItem(UNREAD_KEY);
    return data ? JSON.parse(data) : 0;
  } catch { return 0; }
}

export function markActivitiesRead(communityId?: string): void {
  try {
    const data = localStorage.getItem(ACTIVITY_KEY);
    const all: ActivityItem[] = data ? JSON.parse(data) : [];
    all.forEach(a => {
      if (!communityId || a.communityId === communityId) {
        a.read = true;
      }
    });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all));
    localStorage.setItem(UNREAD_KEY, JSON.stringify(0));
  } catch { /* ignore */ }
}

export function generateSeedActivity(communityId: string, communityName: string): void {
  // Generate some realistic seed activity for a community
  const actors = getMockUsers();
  const now = Date.now();
  const seedActivities: Array<Omit<ActivityItem, 'id' | 'read'>> = [
    {
      type: 'new_post',
      communityId,
      communityName,
      actorId: actors[0]?.id || 201,
      actorName: actors[0]?.display_name || 'FilmBuff42',
      actorAvatar: actors[0]?.avatar || '',
      targetId: `post-${communityId}-1`,
      targetTitle: 'What are your top 3 films this year?',
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'new_comment',
      communityId,
      communityName,
      actorId: actors[1]?.id || 202,
      actorName: actors[1]?.display_name || 'HorrorHound',
      actorAvatar: actors[1]?.avatar || '',
      targetId: `post-${communityId}-1`,
      targetTitle: 'What are your top 3 films this year?',
      createdAt: new Date(now - 1.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'watchlist_vote',
      communityId,
      communityName,
      actorId: actors[2]?.id || 203,
      actorName: actors[2]?.display_name || 'CinePhreak',
      actorAvatar: actors[2]?.avatar || '',
      targetId: `wl-${communityId}-1`,
      targetTitle: 'Dune: Part Two',
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
    },
    {
      type: 'new_member',
      communityId,
      communityName,
      actorId: actors[3]?.id || 204,
      actorName: actors[3]?.display_name || 'DramaQueen',
      actorAvatar: actors[3]?.avatar || '',
      targetId: `member-${communityId}-1`,
      targetTitle: 'joined the community',
      createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
    },
  ];

  for (const activity of seedActivities) {
    addActivity(activity);
  }
}

// ─── Cross-Community Rating Comparisons ───

export interface CrossCommunityComparison {
  movieId: number;
  movieTitle: string;
  movieSlug: string;
  posterPath: string;
  communityRatings: Array<{
    communityId: string;
    communityName: string;
    averageRating: number;
    ratingCount: number;
    trend: 'higher' | 'lower' | 'same';
  }>;
  generalRating: number;
  biggestDivide: number; // difference between highest and lowest community rating
}

export function getCrossCommunityComparisons(communityIds: string[], limit: number = 5): CrossCommunityComparison[] {
  // Generate cross-community comparisons based on stored ratings
  try {
    const data = localStorage.getItem(COMMUNITY_RATINGS_KEY);
    const allRatings: CommunityMovieRating[] = data ? JSON.parse(data) : [];
    
    // Group by movie
    const movieMap = new Map<number, CommunityMovieRating[]>();
    for (const r of allRatings) {
      if (!movieMap.has(r.movieId)) movieMap.set(r.movieId, []);
      movieMap.get(r.movieId)!.push(r);
    }

    const comparisons: CrossCommunityComparison[] = [];
    for (const [movieId, ratings] of movieMap) {
      const filteredRatings = ratings.filter(r => communityIds.includes(r.communityId));
      if (filteredRatings.length < 2) continue;

      const communityRatings = filteredRatings.map(r => {
        const name = COMMUNITY_NAMES_LOOKUP[r.communityId] || r.communityId;
        const avg = r.averageRating;
        const general = 7.0; // approximate
        return {
          communityId: r.communityId,
          communityName: name,
          averageRating: avg,
          ratingCount: r.ratingCount,
          trend: avg > general + 0.3 ? 'higher' as const : avg < general - 0.3 ? 'lower' as const : 'same' as const,
        };
      });

      const maxRating = Math.max(...communityRatings.map(r => r.averageRating));
      const minRating = Math.min(...communityRatings.map(r => r.averageRating));

      comparisons.push({
        movieId,
        movieTitle: filteredRatings[0]?.movieSlug || `Movie ${movieId}`,
        movieSlug: filteredRatings[0]?.movieSlug || '',
        posterPath: '',
        communityRatings,
        generalRating: 7.0,
        biggestDivide: Math.round((maxRating - minRating) * 10) / 10,
      });
    }

    return comparisons.sort((a, b) => b.biggestDivide - a.biggestDivide).slice(0, limit);
  } catch { return []; }
}

const COMMUNITY_NAMES_LOOKUP: Record<string, string> = {
  'horror-fans': 'Horror Fans',
  'k-drama-club': 'K-Drama Club',
  'nollywood-watchers': 'Nollywood Watchers',
  'nolan-fans': 'Nolan Fans',
  'anime-explorers': 'Anime Explorers',
  'classic-cinema': 'Classic Cinema',
  'scifi-universe': 'Sci-Fi Universe',
  'indie-film-lovers': 'Indie Film Lovers',
  'bollywood-beats': 'Bollywood Beats',
  'documentary-circle': 'Documentary Circle',
  'romance-fans': 'Romance Fans',
  'a24-appreciation': 'A24 Appreciation',
};

// ─── Tier 3: Milestones & Achievements ───

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji or icon key
  category: 'contribution' | 'social' | 'streak' | 'special';
  requirement: number; // e.g. 10 posts, 5 debates, 7-day streak
  communityId?: string; // if community-specific
}

export interface UserAchievement {
  achievementId: string;
  userId: number;
  communityId: string;
  unlockedAt: string;
  progress: number; // 0-100
}

export interface ContributionStreak {
  communityId: string;
  userId: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // ISO date
}

const ACHIEVEMENTS_KEY = 'typescribe_achievements';
const USER_ACHIEVEMENTS_KEY = 'typescribe_user_achievements';
const STREAKS_KEY = 'typescribe_contribution_streaks';

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Contribution milestones
  { id: 'first-post', title: 'First Words', description: 'Created your first post in a community', icon: '✏️', category: 'contribution', requirement: 1 },
  { id: 'prolific-poster', title: 'Prolific Poster', description: 'Created 10 posts across communities', icon: '📝', category: 'contribution', requirement: 10 },
  { id: 'community-pillar', title: 'Community Pillar', description: 'Created 25 posts — your voice matters', icon: '🏛️', category: 'contribution', requirement: 25 },
  { id: 'first-comment', title: 'Conversation Starter', description: 'Posted your first comment', icon: '💬', category: 'contribution', requirement: 1 },
  { id: 'commentator', title: 'The Commentator', description: 'Left 20 comments across communities', icon: '🎙️', category: 'contribution', requirement: 20 },
  { id: 'first-rating', title: 'Critical Eye', description: 'Rated your first movie in a community', icon: '⭐', category: 'contribution', requirement: 1 },
  { id: 'connoisseur', title: 'Connoisseur', description: 'Rated 10 movies in communities', icon: '🏆', category: 'contribution', requirement: 10 },
  // Social milestones
  { id: 'first-like', title: 'Received Love', description: 'Got your first like on a post', icon: '❤️', category: 'social', requirement: 1 },
  { id: 'popular', title: 'Popular Voice', description: 'Accumulated 50 likes across posts', icon: '🔥', category: 'social', requirement: 50 },
  { id: 'first-debate', title: 'Debater', description: 'Started your first debate', icon: '⚔️', category: 'social', requirement: 1 },
  { id: 'debate-master', title: 'Debate Master', description: 'Started 5 debates across communities', icon: '🗡️', category: 'social', requirement: 5 },
  { id: 'community-joiner', title: 'Social Butterfly', description: 'Joined 3 communities', icon: '🦋', category: 'social', requirement: 3 },
  { id: 'community-creator', title: 'Founder', description: 'Created your own community', icon: '👑', category: 'social', requirement: 1 },
  // Streak milestones
  { id: 'week-streak', title: 'Week Warrior', description: '7-day contribution streak in a community', icon: '📅', category: 'streak', requirement: 7 },
  { id: 'month-streak', title: 'Monthly Maven', description: '30-day contribution streak in a community', icon: '🗓️', category: 'streak', requirement: 30 },
  // Special
  { id: 'watchlist-voter', title: 'Watchlist Curator', description: 'Voted on 10 watchlist items', icon: '🗳️', category: 'special', requirement: 10 },
  { id: 'taste-explorer', title: 'Taste Explorer', description: 'Joined communities in 3 different categories', icon: '🧭', category: 'special', requirement: 3 },
  { id: 'cross-community', title: 'Bridge Builder', description: 'Active in 5+ communities simultaneously', icon: '🌉', category: 'special', requirement: 5 },
];

export function getUserAchievements(userId: number, communityId?: string): UserAchievement[] {
  try {
    const data = localStorage.getItem(USER_ACHIEVEMENTS_KEY);
    const all: UserAchievement[] = data ? JSON.parse(data) : [];
    return all.filter(a => a.userId === userId && (!communityId || a.communityId === communityId));
  } catch { return []; }
}

export function unlockAchievement(achievementId: string, userId: number, communityId: string): UserAchievement | null {
  try {
    const data = localStorage.getItem(USER_ACHIEVEMENTS_KEY);
    const all: UserAchievement[] = data ? JSON.parse(data) : [];
    
    // Check if already unlocked
    if (all.some(a => a.achievementId === achievementId && a.userId === userId && a.communityId === communityId)) {
      return null;
    }
    
    const newAchievement: UserAchievement = {
      achievementId,
      userId,
      communityId,
      unlockedAt: new Date().toISOString(),
      progress: 100,
    };
    all.push(newAchievement);
    localStorage.setItem(USER_ACHIEVEMENTS_KEY, JSON.stringify(all));
    return newAchievement;
  } catch { return null; }
}

export function updateAchievementProgress(achievementId: string, userId: number, communityId: string, progress: number): void {
  try {
    const data = localStorage.getItem(USER_ACHIEVEMENTS_KEY);
    const all: UserAchievement[] = data ? JSON.parse(data) : [];
    const idx = all.findIndex(a => a.achievementId === achievementId && a.userId === userId && a.communityId === communityId);
    if (idx >= 0) {
      all[idx].progress = Math.min(100, progress);
    } else if (progress > 0) {
      all.push({ achievementId, userId, communityId, unlockedAt: '', progress: Math.min(100, progress) });
    }
    localStorage.setItem(USER_ACHIEVEMENTS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function getContributionStreak(communityId: string, userId: number): ContributionStreak {
  try {
    const data = localStorage.getItem(STREAKS_KEY);
    const all: ContributionStreak[] = data ? JSON.parse(data) : [];
    return all.find(s => s.communityId === communityId && s.userId === userId) || {
      communityId, userId, currentStreak: 0, longestStreak: 0, lastActiveDate: '',
    };
  } catch {
    return { communityId, userId, currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
  }
}

export function recordContribution(communityId: string, userId: number): ContributionStreak {
  const all: ContributionStreak[] = (() => {
    try {
      const data = localStorage.getItem(STREAKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  })();
  
  const today = new Date().toISOString().split('T')[0];
  const idx = all.findIndex(s => s.communityId === communityId && s.userId === userId);
  
  if (idx >= 0) {
    const streak = all[idx];
    if (streak.lastActiveDate === today) return streak; // Already contributed today
    
    const lastDate = new Date(streak.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak.currentStreak += 1;
    } else {
      streak.currentStreak = 1;
    }
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    streak.lastActiveDate = today;
    all[idx] = streak;
  } else {
    all.push({ communityId, userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today });
  }
  
  localStorage.setItem(STREAKS_KEY, JSON.stringify(all));
  return all.find(s => s.communityId === communityId && s.userId === userId)!;
}

export function checkAndUnlockAchievements(userId: number, communityId: string): UserAchievement[] {
  const newlyUnlocked: UserAchievement[] = [];
  
  // Count user contributions from localStorage
  const postsData = localStorage.getItem('typescribe_community_posts');
  const allPosts: Record<string, Array<{ authorId?: number }>> = postsData ? JSON.parse(postsData) : {};
  let totalPosts = 0;
  for (const posts of Object.values(allPosts)) {
    totalPosts += posts.filter(p => p.authorId === userId).length;
  }
  
  const comments = getComments().filter(c => c.authorId === userId);
  const likes = getPostLikes().filter(l => l.userId === userId);
  const joined = getJoinedCommunities();
  const streak = getContributionStreak(communityId, userId);
  
  // Check post achievements
  if (totalPosts >= 1) { const a = unlockAchievement('first-post', userId, communityId); if (a) newlyUnlocked.push(a); }
  if (totalPosts >= 10) { const a = unlockAchievement('prolific-poster', userId, communityId); if (a) newlyUnlocked.push(a); }
  if (totalPosts >= 25) { const a = unlockAchievement('community-pillar', userId, communityId); if (a) newlyUnlocked.push(a); }
  
  // Check comment achievements
  if (comments.length >= 1) { const a = unlockAchievement('first-comment', userId, communityId); if (a) newlyUnlocked.push(a); }
  if (comments.length >= 20) { const a = unlockAchievement('commentator', userId, communityId); if (a) newlyUnlocked.push(a); }
  
  // Check like achievements
  const receivedLikes = getPostLikes().filter(l => {
    // Approximate: count likes on posts by this user
    return true; // simplified
  }).length;
  if (receivedLikes >= 1) { const a = unlockAchievement('first-like', userId, communityId); if (a) newlyUnlocked.push(a); }
  if (receivedLikes >= 50) { const a = unlockAchievement('popular', userId, communityId); if (a) newlyUnlocked.push(a); }
  
  // Check community achievements
  if (joined.length >= 3) { const a = unlockAchievement('community-joiner', userId, communityId); if (a) newlyUnlocked.push(a); }
  if (joined.length >= 5) { const a = unlockAchievement('cross-community', userId, communityId); if (a) newlyUnlocked.push(a); }
  
  // Check streak achievements
  if (streak.currentStreak >= 7) { const a = unlockAchievement('week-streak', userId, communityId); if (a) newlyUnlocked.push(a); }
  if (streak.currentStreak >= 30) { const a = unlockAchievement('month-streak', userId, communityId); if (a) newlyUnlocked.push(a); }
  
  // Update progress for in-progress achievements
  updateAchievementProgress('prolific-poster', userId, communityId, Math.min(100, (totalPosts / 10) * 100));
  updateAchievementProgress('community-pillar', userId, communityId, Math.min(100, (totalPosts / 25) * 100));
  updateAchievementProgress('commentator', userId, communityId, Math.min(100, (comments.length / 20) * 100));
  updateAchievementProgress('week-streak', userId, communityId, Math.min(100, (streak.currentStreak / 7) * 100));
  
  return newlyUnlocked;
}

// ─── Tier 3: Movie Clubs (Group Watches) ───

export interface MovieClub {
  id: string;
  communityId: string;
  name: string;
  description: string;
  movieTitle: string;
  movieSlug: string;
  posterPath: string;
  scheduledDate: string; // ISO date of the watch
  scheduledTime: string; // e.g. "20:00 UTC"
  hostId: number;
  hostName: string;
  hostAvatar: string;
  attendees: Array<{ userId: number; userName: string; avatar: string }>;
  maxAttendees: number;
  status: 'upcoming' | 'watching' | 'completed';
  discussionPrompt: string;
  createdAt: string;
}

const MOVIE_CLUBS_KEY = 'typescribe_movie_clubs';

export function getMovieClubs(communityId: string): MovieClub[] {
  try {
    const data = localStorage.getItem(MOVIE_CLUBS_KEY);
    const all: MovieClub[] = data ? JSON.parse(data) : [];
    return all.filter(c => c.communityId === communityId).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  } catch { return []; }
}

export function getUpcomingMovieClubs(communityIds: string[]): MovieClub[] {
  try {
    const data = localStorage.getItem(MOVIE_CLUBS_KEY);
    const all: MovieClub[] = data ? JSON.parse(data) : [];
    const now = new Date().toISOString();
    return all
      .filter(c => communityIds.includes(c.communityId) && c.status === 'upcoming' && c.scheduledDate > now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  } catch { return []; }
}

export function createMovieClub(club: Omit<MovieClub, 'id' | 'attendees' | 'createdAt'>): MovieClub {
  const all: MovieClub[] = (() => {
    try {
      const data = localStorage.getItem(MOVIE_CLUBS_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  })();
  
  const newClub: MovieClub = {
    ...club,
    id: `mc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    attendees: [{ userId: club.hostId, userName: club.hostName, avatar: club.hostAvatar }],
    createdAt: new Date().toISOString(),
  };
  
  all.push(newClub);
  localStorage.setItem(MOVIE_CLUBS_KEY, JSON.stringify(all));
  return newClub;
}

export function joinMovieClub(clubId: string, userId: number, userName: string, avatar: string): MovieClub | null {
  const all: MovieClub[] = (() => {
    try {
      const data = localStorage.getItem(MOVIE_CLUBS_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  })();
  
  const idx = all.findIndex(c => c.id === clubId);
  if (idx < 0) return null;
  
  const club = all[idx];
  if (club.attendees.some(a => a.userId === userId)) return club; // Already joined
  if (club.attendees.length >= club.maxAttendees) return null; // Full
  
  club.attendees.push({ userId, userName, avatar });
  all[idx] = club;
  localStorage.setItem(MOVIE_CLUBS_KEY, JSON.stringify(all));
  return club;
}

export function leaveMovieClub(clubId: string, userId: number): MovieClub | null {
  const all: MovieClub[] = (() => {
    try {
      const data = localStorage.getItem(MOVIE_CLUBS_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  })();
  
  const idx = all.findIndex(c => c.id === clubId);
  if (idx < 0) return null;
  
  all[idx].attendees = all[idx].attendees.filter(a => a.userId !== userId);
  localStorage.setItem(MOVIE_CLUBS_KEY, JSON.stringify(all));
  return all[idx];
}

// ─── Tier 3: Leaderboard & Stats ───

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  avatar: string;
  postsCount: number;
  commentsCount: number;
  likesReceived: number;
  debatesCount: number;
  streak: number;
  totalScore: number;
  rank: number;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Newcomer';
}

export interface CommunityStats {
  communityId: string;
  totalMembers: number;
  totalPosts: number;
  totalComments: number;
  totalDebates: number;
  activeThisWeek: number;
  avgRating: number;
  topGenre: string;
  growthRate: number; // percentage
  hottestMovie: string;
  weeklyTrend: 'up' | 'down' | 'stable';
}

export function getCommunityLeaderboard(communityId: string): LeaderboardEntry[] {
  const users = getMockUsers();
  const postsData = localStorage.getItem('typescribe_community_posts');
  const allPosts: Record<string, Array<{ authorId?: number; author: string; authorAvatar: string }>> = postsData ? JSON.parse(postsData) : {};
  const communityPosts = allPosts[communityId] || [];
  
  // Build per-user stats
  const userStats = new Map<number, { posts: number; comments: number; likes: number; debates: number; streak: number }>();
  
  // Count posts
  for (const post of communityPosts) {
    const id = post.authorId || 0;
    if (!userStats.has(id)) userStats.set(id, { posts: 0, comments: 0, likes: 0, debates: 0, streak: 0 });
    userStats.get(id)!.posts += 1;
  }
  
  // Count comments
  for (const comment of getComments()) {
    const id = comment.authorId;
    if (!userStats.has(id)) userStats.set(id, { posts: 0, comments: 0, likes: 0, debates: 0, streak: 0 });
    userStats.get(id)!.comments += 1;
  }
  
  // Add mock users with seed data for realistic leaderboard
  const mockEntries: LeaderboardEntry[] = users.slice(0, 8).map((user, idx) => {
    const stats = userStats.get(user.id) || { posts: 0, comments: 0, likes: 0, debates: 0, streak: 0 };
    const posts = stats.posts || (Math.floor(Math.random() * 30) + 5);
    const comments = stats.comments || (Math.floor(Math.random() * 60) + 10);
    const likes = stats.likes || (Math.floor(Math.random() * 100) + 15);
    const debates = stats.debates || (Math.floor(Math.random() * 5));
    const streak = stats.streak || (Math.floor(Math.random() * 14) + 1);
    
    const totalScore = posts * 10 + comments * 5 + likes * 2 + debates * 15 + streak * 3;
    
    let tier: LeaderboardEntry['tier'] = 'Newcomer';
    if (totalScore >= 500) tier = 'Platinum';
    else if (totalScore >= 300) tier = 'Gold';
    else if (totalScore >= 150) tier = 'Silver';
    else if (totalScore >= 50) tier = 'Bronze';
    
    return {
      userId: user.id,
      userName: user.display_name,
      avatar: user.avatar,
      postsCount: posts,
      commentsCount: comments,
      likesReceived: likes,
      debatesCount: debates,
      streak,
      totalScore,
      rank: 0,
      tier,
    };
  });
  
  // Sort by score
  mockEntries.sort((a, b) => b.totalScore - a.totalScore);
  mockEntries.forEach((entry, idx) => entry.rank = idx + 1);
  
  return mockEntries;
}

export function getCommunityStats(communityId: string): CommunityStats {
  const meta = getCommunityMeta(communityId);
  const profile = COMMUNITY_GENRE_PROFILES[communityId];
  
  // Seed stats based on community data
  const memberCounts: Record<string, number> = {
    'horror-fans': 1240, 'k-drama-club': 3420, 'nollywood-watchers': 890,
    'nolan-fans': 2100, 'anime-explorers': 5600, 'classic-cinema': 780,
    'scifi-universe': 2800, 'indie-film-lovers': 950, 'bollywood-beats': 1650,
    'documentary-circle': 620, 'romance-fans': 1100, 'a24-appreciation': 3400,
  };
  
  const totalMembers = memberCounts[communityId] || 500;
  const weeklyActivePercent = Math.floor(Math.random() * 30) + 20;
  
  return {
    communityId,
    totalMembers,
    totalPosts: Math.floor(totalMembers * 0.3),
    totalComments: Math.floor(totalMembers * 1.2),
    totalDebates: Math.floor(totalMembers * 0.05),
    activeThisWeek: Math.floor(totalMembers * weeklyActivePercent / 100),
    avgRating: Math.round((6.5 + Math.random() * 2) * 10) / 10,
    topGenre: profile?.genres[0] || 'Drama',
    growthRate: Math.round((Math.random() * 15 + 2) * 10) / 10,
    hottestMovie: 'Trending Now',
    weeklyTrend: Math.random() > 0.3 ? 'up' : Math.random() > 0.5 ? 'stable' : 'down',
  };
}

// ─── Tier 3: Smart Community Recommendations ───

export interface CommunityRecommendation {
  communityId: string;
  communityName: string;
  reason: string;
  matchScore: number; // 0-100
  tags: string[];
  memberCount: number;
  isJoined: boolean;
}

export function getSmartRecommendations(userGenres: string[], joinedCommunityIds: string[]): CommunityRecommendation[] {
  const allCommunities = [
    { id: 'horror-fans', name: 'Horror Fans', genres: ['Horror', 'Thriller', 'Mystery'], members: 1240, type: 'Genre' },
    { id: 'k-drama-club', name: 'K-Drama Club', genres: ['Drama', 'Romance'], members: 3420, type: 'Country' },
    { id: 'nollywood-watchers', name: 'Nollywood Watchers', genres: ['Drama', 'Action', 'Comedy'], members: 890, type: 'Country' },
    { id: 'nolan-fans', name: 'Christopher Nolan Fans', genres: ['Sci-Fi', 'Thriller', 'Mystery'], members: 2100, type: 'Creator' },
    { id: 'anime-explorers', name: 'Anime Explorers', genres: ['Animation', 'Fantasy', 'Action'], members: 5600, type: 'Theme' },
    { id: 'classic-cinema', name: 'Classic Cinema', genres: ['Drama', 'History', 'Romance'], members: 780, type: 'Theme' },
    { id: 'scifi-universe', name: 'Sci-Fi Universe', genres: ['Science Fiction', 'Adventure', 'Fantasy'], members: 2800, type: 'Genre' },
    { id: 'indie-film-lovers', name: 'Indie Film Lovers', genres: ['Drama', 'Comedy', 'Romance'], members: 950, type: 'Theme' },
    { id: 'bollywood-beats', name: 'Bollywood Beats', genres: ['Romance', 'Music', 'Drama'], members: 1650, type: 'Country' },
    { id: 'documentary-circle', name: 'Documentary Circle', genres: ['Documentary', 'History'], members: 620, type: 'Genre' },
    { id: 'romance-fans', name: 'Romance Readers & Watchers', genres: ['Romance', 'Drama', 'Comedy'], members: 1100, type: 'Genre' },
    { id: 'a24-appreciation', name: 'A24 Appreciation', genres: ['Drama', 'Horror', 'Indie'], members: 3400, type: 'Creator' },
  ];
  
  const recommendations: CommunityRecommendation[] = [];
  const normalizedUserGenres = userGenres.map(g => g.toLowerCase());
  
  for (const community of allCommunities) {
    const isJoined = joinedCommunityIds.includes(community.id);
    const normalizedCommGenres = community.genres.map(g => g.toLowerCase());
    
    // Calculate match score
    const genreOverlap = community.genres.filter(g => normalizedUserGenres.includes(g.toLowerCase()));
    const overlapScore = genreOverlap.length / Math.max(1, new Set([...normalizedUserGenres, ...normalizedCommGenres]).size);
    
    // Bonus: communities you haven't joined yet get a discovery bonus
    const discoveryBonus = isJoined ? 0 : 15;
    // Bonus: larger active communities
    const activityBonus = Math.min(10, community.members / 500);
    // Penalty: already joined
    const joinedPenalty = isJoined ? -30 : 0;
    
    const matchScore = Math.max(5, Math.min(100, Math.round(overlapScore * 70 + discoveryBonus + activityBonus + joinedPenalty)));
    
    // Generate reason
    let reason: string;
    if (genreOverlap.length >= 2) {
      reason = `You love ${genreOverlap.join(' & ')} — this community is a perfect fit!`;
    } else if (genreOverlap.length === 1) {
      reason = `Matches your interest in ${genreOverlap[0]} with a twist you might enjoy.`;
    } else if (isJoined) {
      reason = `You're already a member. Explore new discussions this week!`;
    } else {
      reason = `Step outside your comfort zone — discover something new.`;
    }
    
    recommendations.push({
      communityId: community.id,
      communityName: community.name,
      reason,
      matchScore,
      tags: community.genres.slice(0, 3),
      memberCount: community.members,
      isJoined,
    });
  }
  
  // Sort: unjoined first by match score, then joined
  return recommendations.sort((a, b) => {
    if (a.isJoined !== b.isJoined) return a.isJoined ? 1 : -1;
    return b.matchScore - a.matchScore;
  });
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
