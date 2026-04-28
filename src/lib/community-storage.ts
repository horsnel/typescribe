'use client';

// ─── Community Social Storage (localStorage-backed) ───

const LIKES_KEY = 'typescribe_post_likes';
const COMMENTS_KEY = 'typescribe_post_comments';
const FOLLOWING_KEY = 'typescribe_following';
const COMMUNITY_META_KEY = 'typescribe_community_meta';

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
