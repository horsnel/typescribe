'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Users, MessageSquare, ArrowLeft, Plus, ChevronUp, Clock,
  Shield, UserPlus, UserMinus, Loader2, Send, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

interface Community {
  id: string;
  name: string;
  description: string;
  type: string;
  members: number;
  posts: number;
  rules: string[];
  createdAt: string;
}

interface CommunityPost {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  content: string;
  replyCount: number;
  upvoteCount: number;
  createdAt: string;
}

const JOINED_KEY = 'typescribe_joined_communities';
const POSTS_KEY = 'typescribe_community_posts';

function getJoinedCommunities(): string[] {
  try {
    const data = localStorage.getItem(JOINED_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveJoinedCommunities(ids: string[]) {
  localStorage.setItem(JOINED_KEY, JSON.stringify(ids));
}

function getLocalPosts(communityId: string): CommunityPost[] {
  try {
    const data = localStorage.getItem(POSTS_KEY);
    const allPosts: Record<string, CommunityPost[]> = data ? JSON.parse(data) : {};
    return allPosts[communityId] || [];
  } catch { return []; }
}

function saveLocalPosts(communityId: string, posts: CommunityPost[]) {
  try {
    const data = localStorage.getItem(POSTS_KEY);
    const allPosts: Record<string, CommunityPost[]> = data ? JSON.parse(data) : {};
    allPosts[communityId] = posts;
    localStorage.setItem(POSTS_KEY, JSON.stringify(allPosts));
  } catch { /* ignore */ }
}

function timeAgo(dateStr: string): string {
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

export default function CommunityDetailPage() {
  const params = useParams();
  const communityId = params.id as string;
  const { isAuthenticated, user } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCommunity = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/communities?id=${communityId}`);
      if (res.ok) {
        const data = await res.json();
        setCommunity(data.community);
        // Merge API posts with local posts
        const localPosts = getLocalPosts(communityId);
        const apiPosts = data.posts || [];
        // Local posts first (most recent), then API posts
        setPosts([...localPosts, ...apiPosts]);
      }
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  useEffect(() => {
    const joined = getJoinedCommunities();
    setIsJoined(joined.includes(communityId));
  }, [communityId]);

  const handleJoinToggle = () => {
    const joined = getJoinedCommunities();
    if (isJoined) {
      const updated = joined.filter(id => id !== communityId);
      saveJoinedCommunities(updated);
      setIsJoined(false);
      if (community) {
        setCommunity({ ...community, members: Math.max(0, community.members - 1) });
      }
    } else {
      joined.push(communityId);
      saveJoinedCommunities(joined);
      setIsJoined(true);
      if (community) {
        setCommunity({ ...community, members: community.members + 1 });
      }
    }
  };

  const handleNewPost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    setIsSubmitting(true);

    const newPost: CommunityPost = {
      id: `local-${Date.now()}`,
      title: newPostTitle.trim(),
      author: user?.display_name || 'Anonymous',
      authorAvatar: user?.avatar || '/images/avatar-1.jpg',
      content: newPostContent.trim(),
      replyCount: 0,
      upvoteCount: 1,
      createdAt: new Date().toISOString(),
    };

    const localPosts = getLocalPosts(communityId);
    localPosts.unshift(newPost);
    saveLocalPosts(communityId, newPost);
    setPosts([newPost, ...posts.filter(p => !p.id.startsWith('local-'))]);
    setNewPostTitle('');
    setNewPostContent('');
    setShowNewPost(false);
    setIsSubmitting(false);

    if (community) {
      setCommunity({ ...community, posts: community.posts + 1 });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e50914] animate-spin" />
        <span className="ml-3 text-[#6b6b7b]">Loading community...</span>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-20">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Users className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Community not found</h2>
          <p className="text-[#6b6b7b] mb-6">This community doesn&apos;t exist or has been removed.</p>
          <Link href="/communities">
            <Button className="bg-[#e50914] hover:bg-[#b20710] text-white">Browse Communities</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#6b6b7b] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <Link href="/communities" className="hover:text-white transition-colors">Communities</Link>
          <span>/</span>
          <span className="text-[#a0a0b0]">{community.name}</span>
        </nav>

        {/* Community Header */}
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white">{community.name}</h1>
                <span className="text-xs text-[#e50914] bg-[#e50914]/10 px-2 py-0.5 rounded-full font-medium">
                  {community.type}
                </span>
              </div>
              <p className="text-[#a0a0b0] mb-4">{community.description}</p>
              <div className="flex items-center gap-4 text-sm text-[#6b6b7b]">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {community.members.toLocaleString()} members
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> {community.posts} posts
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Created {new Date(community.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Button
                  onClick={handleJoinToggle}
                  className={isJoined
                    ? 'bg-[#12121a] border border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] hover:border-[#3a3a45] gap-2'
                    : 'bg-[#e50914] hover:bg-[#b20710] text-white gap-2'
                  }
                >
                  {isJoined ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isJoined ? 'Leave' : 'Join Community'}
                </Button>
              ) : (
                <Link href="/login">
                  <Button className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2">
                    <UserPlus className="w-4 h-4" /> Join Community
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Rules */}
        {community.rules && community.rules.length > 0 && (
          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#e50914]" />
              <h2 className="text-sm font-semibold text-white">Community Rules</h2>
            </div>
            <ol className="space-y-2">
              {community.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#a0a0b0]">
                  <span className="text-[#6b6b7b] font-mono text-xs mt-0.5">{i + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Posts Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Discussions</h2>
          {isAuthenticated && (
            <Button
              onClick={() => setShowNewPost(!showNewPost)}
              className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" /> New Post
            </Button>
          )}
        </div>

        {/* New Post Form */}
        {showNewPost && (
          <div className="bg-[#12121a] border border-[#e50914]/30 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Create a new post</h3>
              <button
                onClick={() => setShowNewPost(false)}
                className="text-[#6b6b7b] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Post title"
                className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] text-sm"
              />
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your thoughts..."
                rows={4}
                className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] text-sm resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleNewPost}
                  disabled={!newPostTitle.trim() || !newPostContent.trim() || isSubmitting}
                  className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2"
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Posts List */}
        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* Upvote column */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button className="text-[#6b6b7b] hover:text-[#e50914] transition-colors">
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-bold text-[#a0a0b0]">{post.upvoteCount}</span>
                  </div>

                  {/* Post content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white group-hover:text-[#e50914] transition-colors mb-1">
                      {post.title}
                    </h3>
                    <p className="text-sm text-[#a0a0b0] line-clamp-2 mb-2">{post.content}</p>
                    <div className="flex items-center gap-3 text-xs text-[#6b6b7b]">
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-[#2a2a35] overflow-hidden">
                          <img
                            src={post.authorAvatar}
                            alt={post.author}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {post.replyCount} replies
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#12121a] border border-[#2a2a35] rounded-xl">
            <MessageSquare className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
            <p className="text-[#a0a0b0] mb-2">No discussions yet</p>
            <p className="text-sm text-[#6b6b7b]">Be the first to start a conversation in this community!</p>
          </div>
        )}

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/communities"
            className="inline-flex items-center gap-2 text-sm text-[#6b6b7b] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Communities
          </Link>
        </div>
      </div>
    </div>
  );
}
