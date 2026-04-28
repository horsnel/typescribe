'use client';

// ─── Community Social Storage (localStorage-backed) ───
// Follows the existing pattern in the codebase

const LIKES_KEY = 'typescribe_post_likes';
const COMMENTS_KEY = 'typescribe_post_comments';
const FOLLOWING_KEY = 'typescribe_following';

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
      // Remove the like/dislike (toggle off)
      likes.splice(existingIdx, 1);
      savePostLikes(likes);
      return null;
    } else {
      // Switch from like to dislike or vice versa
      likes[existingIdx] = { ...existing, type, createdAt: new Date().toISOString() };
      savePostLikes(likes);
      return likes[existingIdx];
    }
  }

  // New like/dislike
  const newLike: PostLike = {
    postId,
    userId,
    type,
    createdAt: new Date().toISOString(),
  };
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
    postId,
    parentId,
    authorId,
    authorName,
    authorAvatar,
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
  // In a real app this would be server-side. For mock, return a plausible number.
  return getFollowing().filter(f => f.followingId === userId).length + Math.floor(Math.random() * 50) + 5;
}

export function getFollowingCount(userId: number): number {
  return getFollowing().length + Math.floor(Math.random() * 30) + 3;
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
