'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Users, MessageSquare, ArrowLeft, Plus, Clock,
  Shield, UserPlus, UserMinus, Loader2, Send, X,
  Heart, ThumbsDown, Share2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  CommunityHeaderSkeleton,
  PostCardSkeleton,
  CommentSkeleton,
} from '@/components/skeletons/CommunitySkeleton';
import {
  getUserPostLike,
  getPostLikeCounts,
  togglePostLike,
  getPostComments,
  addComment,
  timeAgo,
} from '@/lib/community-storage';

// ─── Types ───

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
  authorId?: number;
  authorAvatar: string;
  content: string;
  replyCount: number;
  upvoteCount: number;
  createdAt: string;
}

interface CommentData {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: number;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

// ─── LocalStorage Keys ───

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

// ─── Comment Thread Component ───

function CommentThread({ comments, postId, onAddComment, depth = 0 }: {
  comments: CommentData[];
  postId: string;
  onAddComment: (postId: string, parentId: string | null, content: string) => void;
  depth?: number;
}) {
  const { user } = useAuth();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const topLevel = comments.filter(c => c.parentId === null);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  const handleReply = (parentId: string) => {
    if (!replyContent.trim() || !user) return;
    onAddComment(postId, parentId, replyContent.trim());
    setReplyContent('');
    setReplyTo(null);
  };

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-[#1e1e28] pl-4' : ''}>
      {topLevel.map((comment) => (
        <div key={comment.id} className="py-3">
          <div className="flex items-start gap-3">
            <Link href="/profile" className="flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                {comment.authorAvatar ? (
                  <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                ) : (
                  comment.authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link href="/profile" className="text-xs font-semibold text-[#d4a853] hover:underline">{comment.authorName}</Link>
                <span className="text-[10px] text-[#6b7280]">{timeAgo(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-[#9ca3af] leading-relaxed">{comment.content}</p>
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="text-[10px] text-[#6b7280] hover:text-[#d4a853] mt-1 transition-colors"
              >
                Reply
              </button>
            </div>
          </div>

          {/* Reply input */}
          {replyTo === comment.id && (
            <div className="ml-10 mt-2 flex items-center gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 bg-[#050507] border border-[#1e1e28] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853]"
                onKeyDown={(e) => { if (e.key === 'Enter') handleReply(comment.id); }}
              />
              <Button
                size="sm"
                onClick={() => handleReply(comment.id)}
                disabled={!replyContent.trim()}
                className="bg-[#d4a853] hover:bg-[#b8922e] text-white h-8 w-8 p-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Nested replies */}
          {getReplies(comment.id).length > 0 && (
            <CommentThread
              comments={getReplies(comment.id)}
              postId={postId}
              onAddComment={onAddComment}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Post Card Component ───

function PostCard({ post, onLikeToggle, onCommentToggle }: {
  post: CommunityPost;
  onLikeToggle: (postId: string, type: 'like' | 'dislike') => void;
  onCommentToggle: (postId: string) => void;
}) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState<CommentData[]>([]);

  const userLike = user ? getUserPostLike(post.id, user.id) : undefined;
  const likeCounts = getPostLikeCounts(post.id);
  const totalLikes = likeCounts.likes + (post.upvoteCount || 0);

  useEffect(() => {
    setComments(getPostComments(post.id));
  }, [post.id, showComments]);

  const handleComment = () => {
    if (!commentInput.trim() || !user) return;
    const newComment = addComment(
      post.id,
      null,
      user.id,
      user.display_name || 'Anonymous',
      user.avatar || '',
      commentInput.trim()
    );
    setComments(prev => [newComment, ...prev]);
    setCommentInput('');
  };

  const handleAddComment = (postId: string, parentId: string | null, content: string) => {
    if (!user) return;
    const newComment = addComment(
      postId,
      parentId,
      user.id,
      user.display_name || 'Anonymous',
      user.avatar || '',
      content
    );
    setComments(prev => [newComment, ...prev]);
  };

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 sm:p-5 hover:border-[#2a2a35] transition-all group">
      {/* Author + Post Header */}
      <div className="flex items-start gap-3 mb-3">
        <Link href="/profile" className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            {post.authorAvatar ? (
              <img
                src={post.authorAvatar}
                alt={post.author}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              post.author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/profile" className="text-sm font-semibold text-[#d4a853] hover:underline">{post.author}</Link>
            <span className="text-[10px] text-[#6b7280]">{timeAgo(post.createdAt)}</span>
          </div>
          <h3 className="text-base font-semibold text-white group-hover:text-[#d4a853] transition-colors mb-1">
            {post.title}
          </h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed">{post.content}</p>
        </div>
      </div>

      {/* Interaction Bar */}
      <div className="h-px bg-[#1e1e28] my-3" />
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Like */}
        <button
          onClick={() => onLikeToggle(post.id, 'like')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all min-w-[44px] min-h-[44px] justify-center hover:bg-[#111118]"
          style={{ color: userLike?.type === 'like' ? '#d4a853' : '#6b7280' }}
        >
          <Heart
            className="w-[18px] h-[18px]"
            strokeWidth={2.5}
            fill={userLike?.type === 'like' ? '#d4a853' : 'none'}
          />
          <span className="text-xs font-medium">{totalLikes}</span>
        </button>

        {/* Dislike */}
        <button
          onClick={() => onLikeToggle(post.id, 'dislike')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all min-w-[44px] min-h-[44px] justify-center hover:bg-[#111118]"
          style={{ color: userLike?.type === 'dislike' ? '#ef4444' : '#6b7280' }}
        >
          <ThumbsDown className="w-[18px] h-[18px]" strokeWidth={2.5} />
          <span className="text-xs font-medium">{likeCounts.dislikes}</span>
        </button>

        {/* Comment */}
        <button
          onClick={() => {
            setShowComments(!showComments);
            onCommentToggle(post.id);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:text-[#d4a853] transition-all min-w-[44px] min-h-[44px] justify-center hover:bg-[#111118]"
        >
          <MessageSquare className="w-[18px] h-[18px]" strokeWidth={2.5} />
          <span className="text-xs font-medium">{comments.length || post.replyCount}</span>
        </button>

        {/* Share */}
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:text-[#d4a853] transition-all min-w-[44px] min-h-[44px] justify-center hover:bg-[#111118]">
          <Share2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
        </button>

        {/* Timestamp - right aligned, smaller metadata */}
        <span className="text-[10px] text-[#6b7280] ml-auto hidden sm:block">
          {timeAgo(post.createdAt)}
        </span>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 border-t border-[#1e1e28] pt-4">
          {/* Comment Input */}
          {user && (
            <div className="flex items-start gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.display_name} className="w-full h-full object-cover" />
                ) : (
                  user.display_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
                )}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-[#050507] border border-[#1e1e28] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853]"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
                />
                <Button
                  size="sm"
                  onClick={handleComment}
                  disabled={!commentInput.trim()}
                  className="bg-[#d4a853] hover:bg-[#b8922e] text-white h-9 w-9 p-0 flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Comments list */}
          {comments.length > 0 ? (
            <CommentThread
              comments={comments}
              postId={post.id}
              onAddComment={handleAddComment}
            />
          ) : (
            <p className="text-xs text-[#6b7280] text-center py-4">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Community Detail Page ───

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
  const [sortOrder, setSortOrder] = useState<'newest' | 'popular'>('newest');

  const fetchCommunity = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/communities?id=${communityId}`);
      if (res.ok) {
        const data = await res.json();
        setCommunity(data.community);
        const localPosts = getLocalPosts(communityId);
        const apiPosts = data.posts || [];
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
      authorId: user?.id,
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

  const handleLikeToggle = (postId: string, type: 'like' | 'dislike') => {
    if (!user) return;
    togglePostLike(postId, user.id, type);
    // Force re-render by updating posts reference
    setPosts(prev => [...prev]);
  };

  const handleCommentToggle = (_postId: string) => {
    // Already handled inside PostCard component
  };

  // Sorting
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortOrder === 'popular') {
      const aLikes = getPostLikeCounts(a.id).likes + a.upvoteCount;
      const bLikes = getPostLikeCounts(b.id).likes + b.upvoteCount;
      return bLikes - aLikes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050507] pt-20">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
          <CommunityHeaderSkeleton />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-[#050507] pt-20">
        <div className="max-w-[800px] mx-auto px-4 py-16 text-center">
          <Users className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Community not found</h2>
          <p className="text-[#6b7280] mb-6">This community doesn&apos;t exist or has been removed.</p>
          <Link href="/communities">
            <Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white">Browse Communities</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] pt-20">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
        {/* Community Header */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white">{community.name}</h1>
                <span className="text-xs text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full font-medium">
                  {community.type}
                </span>
              </div>
              <p className="text-[#9ca3af] mb-4 text-sm leading-relaxed">{community.description}</p>
              <div className="flex items-center gap-4 text-sm text-[#6b7280] flex-wrap">
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
                  variant={isJoined ? 'outline' : 'default'}
                  className={
                    isJoined
                      ? 'border-[#d4a853] text-[#d4a853] hover:text-white hover:bg-[#d4a853] hover:border-[#d4a853] gap-2 min-h-[44px]'
                      : 'bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]'
                  }
                >
                  {isJoined ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isJoined ? 'Joined' : 'Join Community'}
                </Button>
              ) : (
                <Link href="/login">
                  <Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]">
                    <UserPlus className="w-4 h-4" /> Join Community
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Rules */}
        {community.rules && community.rules.length > 0 && (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#d4a853]" />
              <h2 className="text-sm font-semibold text-white">Community Rules</h2>
            </div>
            <ol className="space-y-2">
              {community.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#9ca3af]">
                  <span className="text-[#6b7280] font-mono text-xs mt-0.5">{i + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Posts Section Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-bold text-white">Discussions</h2>
          <div className="flex items-center gap-2">
            {/* Sort toggle */}
            <div className="flex items-center bg-[#0c0c10] border border-[#1e1e28] rounded-lg overflow-hidden">
              <button
                onClick={() => setSortOrder('newest')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortOrder === 'newest' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortOrder('popular')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortOrder === 'popular' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white'
                }`}
              >
                Popular
              </button>
            </div>
            {isAuthenticated && (
              <Button
                onClick={() => setShowNewPost(!showNewPost)}
                className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]"
                size="sm"
              >
                <Plus className="w-4 h-4" /> New Post
              </Button>
            )}
          </div>
        </div>

        {/* New Post Form */}
        {showNewPost && (
          <div className="bg-[#0c0c10] border border-[#d4a853]/30 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Create a new post</h3>
              <button
                onClick={() => setShowNewPost(false)}
                className="text-[#6b7280] hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] text-sm"
              />
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your thoughts..."
                rows={4}
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] text-sm resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleNewPost}
                  disabled={!newPostTitle.trim() || !newPostContent.trim() || isSubmitting}
                  className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]"
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
        {sortedPosts.length > 0 ? (
          <div className="space-y-3">
            {sortedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeToggle={handleLikeToggle}
                onCommentToggle={handleCommentToggle}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#0c0c10] border border-[#1e1e28] rounded-xl">
            <MessageSquare className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
            <p className="text-[#9ca3af] mb-2">No discussions yet</p>
            <p className="text-sm text-[#6b7280]">Be the first to start a conversation in this community!</p>
          </div>
        )}

        {/* Floating Action Button (Create Post) - visible when joined & scrolled past header */}
        {isAuthenticated && isJoined && !showNewPost && (
          <button
            onClick={() => setShowNewPost(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-[#d4a853] hover:bg-[#b8922e] text-white rounded-full shadow-lg shadow-[#d4a853]/25 flex items-center justify-center transition-all hover:scale-105 z-30 min-w-[44px] min-h-[44px]"
            aria-label="Create post"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        )}

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/communities"
            className="inline-flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#d4a853] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Communities
          </Link>
        </div>
      </div>
    </div>
  );
}
