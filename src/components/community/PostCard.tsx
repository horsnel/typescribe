'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Heart, MessageSquare, Share2, Check, Send,
  Bookmark, BookmarkCheck, Flame, Zap, Crown,
  ChevronDown, ChevronUp, MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  getUserPostLike,
  getPostLikeCounts,
  togglePostLike,
  getPostComments,
  addComment,
  timeAgo,
} from '@/lib/community-storage';

// ─── Types ───

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

interface PostCardProps {
  post: CommunityPost;
  communityId: string;
  onLikeToggle: (postId: string, type: 'like' | 'dislike') => void;
  onCommentToggle: (postId: string) => void;
  /** Index in the list for staggered animations */
  index?: number;
}

// ─── Post Type Detection ───

type PostType = 'discussion' | 'review' | 'recommendation' | 'hot-take' | 'question';

function detectPostType(title: string, content: string): PostType {
  const combined = (title + ' ' + content).toLowerCase();
  if (combined.includes('recommend') || combined.includes('must watch') || combined.includes('you should')) return 'recommendation';
  if (combined.includes('?') && (combined.includes('anyone') || combined.includes('what do you') || combined.includes('how do'))) return 'question';
  if (combined.includes('review') || combined.includes('rating') || combined.includes('/10') || combined.includes('out of 10')) return 'review';
  if (combined.includes('hot take') || combined.includes('unpopular opinion') || combined.includes('controversial')) return 'hot-take';
  return 'discussion';
}

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof Flame }> = {
  'discussion': { label: 'Discussion', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', icon: MessageSquare },
  'review': { label: 'Review', color: 'text-[#d4a853]', bgColor: 'bg-[#d4a853]/10', borderColor: 'border-[#d4a853]/20', icon: Crown },
  'recommendation': { label: 'Recommendation', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', icon: Zap },
  'hot-take': { label: 'Hot Take', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', icon: Flame },
  'question': { label: 'Question', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', icon: MessageSquare },
};

// ─── Engagement Score Ring ───

function EngagementRing({ score, size = 36 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  const color = score >= 70 ? '#4ade80' : score >= 40 ? '#d4a853' : '#6b7280';

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1e1e28"
        strokeWidth={2.5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={size < 36 ? 8 : 10}
        fontWeight="700"
        fontFamily="system-ui"
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Heart Burst Particles ───

function HeartBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    angle: (i / 6) * 360,
    delay: i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-[#d4a853]"
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{ scale: [0, 1.2, 0], x: Math.cos((p.angle * Math.PI) / 180) * 18, y: Math.sin((p.angle * Math.PI) / 180) * 18, opacity: [1, 0.8, 0] }}
          transition={{ duration: 0.5, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ─── Comment Thread (imported inline to avoid circular deps) ───

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
      {topLevel.map((comment) => {
        const profileHref = comment.authorId ? `/profile/${comment.authorId}` : '/profile';
        return (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="py-3"
          >
            <div className="flex items-start gap-3">
              <Link href={profileHref} className="flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden ring-2 ring-[#0c0c10]">
                  {comment.authorAvatar ? (
                    <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                  ) : (
                    comment.authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={profileHref} className="text-xs font-semibold text-[#d4a853] hover:underline">{comment.authorName}</Link>
                  <span className="text-[10px] text-[#6b7280]">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-[#9ca3af] leading-relaxed">{comment.content}</p>
                <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-[10px] text-[#6b7280] hover:text-[#d4a853] mt-1 transition-colors">Reply</button>
              </div>
            </div>
            <AnimatePresence>
              {replyTo === comment.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-10 mt-2 flex items-center gap-2 overflow-hidden"
                >
                  <input type="text" value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Write a reply..." className="flex-1 bg-[#050507] border border-[#1e1e28] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853]" onKeyDown={(e) => { if (e.key === 'Enter') handleReply(comment.id); }} />
                  <Button size="sm" onClick={() => handleReply(comment.id)} disabled={!replyContent.trim()} className="bg-[#d4a853] hover:bg-[#b8922e] text-white h-8 w-8 p-0"><Send className="w-3.5 h-3.5" strokeWidth={1.5} /></Button>
                </motion.div>
              )}
            </AnimatePresence>
            {getReplies(comment.id).length > 0 && <CommentThread comments={getReplies(comment.id)} postId={postId} onAddComment={onAddComment} depth={depth + 1} />}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main PostCard Component ───

export default function PostCard({ post, communityId, onLikeToggle, onCommentToggle, index = 0 }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState<CommentData[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const userLike = user ? getUserPostLike(post.id, user.id) : undefined;
  const likeCounts = getPostLikeCounts(post.id);
  const totalLikes = likeCounts.likes + (post.upvoteCount || 0);
  const totalEngagement = totalLikes + likeCounts.dislikes + comments.length + post.replyCount;

  const postType = detectPostType(post.title, post.content);
  const typeConfig = POST_TYPE_CONFIG[postType];
  const TypeIcon = typeConfig.icon;

  const profileHref = post.authorId ? `/profile/${post.authorId}` : '/profile';

  // Engagement score (0-100 heuristic)
  const engagementScore = Math.min(100, Math.round(
    (totalLikes * 3 + comments.length * 5 + post.replyCount * 2 + (post.upvoteCount || 0) * 2) / 1.5
  ));

  // Reading time estimate
  const readingTime = Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200));

  // Content truncation
  const isLongContent = post.content.length > 280;
  const displayContent = isLongContent && !expanded ? post.content.slice(0, 280) : post.content;

  useEffect(() => { setComments(getPostComments(post.id)); }, [post.id, showComments]);

  // Load bookmark state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`typescribe_bookmark_${post.id}`);
      setBookmarked(saved === 'true');
    } catch {}
  }, [post.id]);

  const handleComment = () => {
    if (!commentInput.trim() || !user) return;
    const newComment = addComment(post.id, null, user.id, user.display_name || 'Anonymous', user.avatar || '', commentInput.trim());
    setComments(prev => [newComment, ...prev]);
    setCommentInput('');
  };

  const handleAddComment = (postId: string, parentId: string | null, content: string) => {
    if (!user) return;
    const newComment = addComment(postId, parentId, user.id, user.display_name || 'Anonymous', user.avatar || '', content);
    setComments(prev => [newComment, ...prev]);
  };

  const onShare = async () => {
    const url = `${window.location.origin}/community/${communityId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleLike = () => {
    if (!user) return;
    onLikeToggle(post.id, 'like');
    if (userLike?.type !== 'like') {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
  };

  const toggleBookmark = () => {
    const newState = !bookmarked;
    setBookmarked(newState);
    try {
      localStorage.setItem(`typescribe_bookmark_${post.id}`, String(newState));
    } catch {}
  };

  // Author role detection (simple heuristic for now)
  const authorInitials = post.author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isAuthorOP = post.authorId && post.authorId < 10; // early users

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative"
    >
      {/* Glow border on hover */}
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#d4a853]/0 via-[#d4a853]/0 to-purple-500/0 group-hover:from-[#d4a853]/20 group-hover:via-purple-500/10 group-hover:to-[#d4a853]/20 transition-all duration-500 blur-sm" />

      <div className="relative bg-[#0c0c10]/95 backdrop-blur-sm border border-[#1e1e28] rounded-xl overflow-hidden group-hover:border-[#2a2a35] transition-all duration-300">
        {/* ─── Card Header ─── */}
        <div className="p-4 sm:p-5 pb-0">
          <div className="flex items-start gap-3">
            {/* Author Avatar with ring */}
            <Link href={profileHref} className="flex-shrink-0 relative">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-2 ring-[#0c0c10] group-hover:ring-[#d4a853]/30 transition-all duration-300`}>
                {post.authorAvatar ? (
                  <img src={post.authorAvatar} alt={post.author} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  authorInitials
                )}
              </div>
              {/* Online indicator (decorative) */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0c0c10]" />
            </Link>

            <div className="flex-1 min-w-0">
              {/* Author row */}
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <Link href={profileHref} className="text-sm font-semibold text-[#d4a853] hover:underline">{post.author}</Link>
                {isAuthorOP && (
                  <span className="text-[9px] font-bold text-[#d4a853] bg-[#d4a853]/15 px-1.5 py-0.5 rounded-full border border-[#d4a853]/20 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" strokeWidth={1.5} /> OP
                  </span>
                )}
                <span className="text-[10px] text-[#6b7280]">{timeAgo(post.createdAt)}</span>
                <span className="text-[10px] text-[#4a4a55]">{readingTime} min read</span>
              </div>

              {/* Post Title + Type Badge */}
              <div className="flex items-start gap-2 mb-1.5">
                <h3 className="text-base font-semibold text-white group-hover:text-[#d4a853] transition-colors leading-snug flex-1">{post.title}</h3>
              </div>

              {/* Post type badge */}
              <div className={`inline-flex items-center gap-1 text-[10px] font-semibold ${typeConfig.color} ${typeConfig.bgColor} border ${typeConfig.borderColor} px-2 py-0.5 rounded-full mb-3`}>
                <TypeIcon className="w-3 h-3" strokeWidth={1.5} />
                {typeConfig.label}
              </div>
            </div>

            {/* Engagement Ring + Bookmark */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {engagementScore > 10 && <EngagementRing score={engagementScore} />}
              <button
                onClick={toggleBookmark}
                className="text-[#6b7280] hover:text-[#d4a853] transition-colors p-1"
                aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
              >
                {bookmarked ? <BookmarkCheck className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} /> : <Bookmark className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Content Area ─── */}
        <div className="px-4 sm:px-5 pb-3">
          <p className="text-sm text-[#9ca3af] leading-relaxed whitespace-pre-line">{displayContent}</p>

          {/* Read more gradient fade */}
          {isLongContent && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-1 text-xs font-medium text-[#d4a853] hover:text-[#e8be6a] transition-colors flex items-center gap-1"
            >
              Read more <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
            </button>
          )}
          {isLongContent && expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="mt-1 text-xs font-medium text-[#d4a853] hover:text-[#e8be6a] transition-colors flex items-center gap-1"
            >
              Show less <ChevronUp className="w-3 h-3" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* ─── Engagement Preview Bar ─── */}
        {totalEngagement > 0 && !showComments && (
          <div className="mx-4 sm:mx-5 mb-3 flex items-center gap-3 text-[10px] text-[#6b7280]">
            {totalLikes > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-[#d4a853]/50" strokeWidth={1.5} fill={totalLikes > 5 ? '#d4a85350' : 'none'} />
                {totalLikes} {totalLikes === 1 ? 'like' : 'likes'}
              </span>
            )}
            {(comments.length || post.replyCount) > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-blue-400/50" strokeWidth={1.5} />
                {comments.length || post.replyCount} {comments.length + post.replyCount === 1 ? 'reply' : 'replies'}
              </span>
            )}
            {engagementScore >= 50 && (
              <span className="flex items-center gap-1 text-orange-400/70">
                <Flame className="w-3 h-3" strokeWidth={1.5} />
                Trending
              </span>
            )}
          </div>
        )}

        {/* ─── Action Bar ─── */}
        <div className="border-t border-[#1e1e28]/60 px-2 sm:px-3 py-1.5 flex items-center gap-0.5 sm:gap-1">
          {/* Like Button with heart burst */}
          <div className="relative">
            <HeartBurst active={heartBurst} />
            <motion.button
              onClick={handleLike}
              whileTap={{ scale: 0.85 }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm transition-all min-w-[44px] min-h-[40px] justify-center hover:bg-[#111118] relative z-10"
              style={{ color: userLike?.type === 'like' ? '#d4a853' : '#6b7280' }}
            >
              <motion.div
                animate={userLike?.type === 'like' ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Heart className="w-[17px] h-[17px]" strokeWidth={1.5} fill={userLike?.type === 'like' ? '#d4a853' : 'none'} />
              </motion.div>
              <span className="text-xs font-medium">{totalLikes}</span>
            </motion.button>
          </div>

          {/* Comment Button */}
          <motion.button
            onClick={() => { setShowComments(!showComments); onCommentToggle(post.id); }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm transition-all min-w-[44px] min-h-[40px] justify-center hover:bg-[#111118] ${showComments ? 'text-[#d4a853]' : 'text-[#6b7280] hover:text-[#d4a853]'}`}
          >
            <MessageSquare className="w-[17px] h-[17px]" strokeWidth={1.5} />
            <span className="text-xs font-medium">{comments.length || post.replyCount}</span>
          </motion.button>

          {/* Share Button */}
          <motion.button
            onClick={onShare}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm transition-all min-w-[44px] min-h-[40px] justify-center hover:bg-[#111118] text-[#6b7280] hover:text-[#d4a853]"
          >
            {shareCopied ? <Check className="w-[17px] h-[17px] text-[#d4a853]" strokeWidth={1.5} /> : <Share2 className="w-[17px] h-[17px]" strokeWidth={1.5} />}
            <span className="text-xs font-medium hidden sm:inline">{shareCopied ? 'Copied!' : 'Share'}</span>
          </motion.button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Relative time on right */}
          <span className="text-[10px] text-[#4a4a55] hidden sm:block">{timeAgo(post.createdAt)}</span>
        </div>

        {/* ─── Comments Section ─── */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="border-t border-[#1e1e28]/60 px-4 sm:px-5 py-4">
                {/* Comment Input */}
                {user && (
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0 ring-2 ring-[#0c0c10]">
                      {user.avatar ? <img src={user.avatar} alt={user.display_name} className="w-full h-full object-cover" /> : user.display_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-[#050507] border border-[#1e1e28] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] transition-colors"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
                      />
                      <motion.div whileTap={{ scale: 0.9 }}>
                        <Button size="sm" onClick={handleComment} disabled={!commentInput.trim()} className="bg-[#d4a853] hover:bg-[#b8922e] text-white h-9 w-9 p-0 flex-shrink-0">
                          <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                )}

                {comments.length > 0 ? (
                  <CommentThread comments={comments} postId={post.id} onAddComment={handleAddComment} />
                ) : (
                  <p className="text-xs text-[#6b7280] text-center py-4">No comments yet. Be the first to share your thoughts!</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
