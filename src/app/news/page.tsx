'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowLeft, Clock, Newspaper, Loader2, MessageCircle, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleImageError } from '@/lib/utils';

type CategoryFilter = 'all' | string;

interface NewsArticle {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  source: string;
  date: string;
  url: string;
}

interface FullArticle {
  title: string;
  content: string;
  source: string;
  date: string;
  image: string;
  url: string;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

const COMMENTS_KEY = 'typescribe_news_comments';

function getComments(articleId: number): Comment[] {
  try {
    const data = localStorage.getItem(COMMENTS_KEY);
    const all: Record<string, Comment[]> = data ? JSON.parse(data) : {};
    return all[String(articleId)] || [];
  } catch {
    return [];
  }
}

function saveComment(articleId: number, comment: Comment): void {
  try {
    const data = localStorage.getItem(COMMENTS_KEY);
    const all: Record<string, Comment[]> = data ? JSON.parse(data) : {};
    const key = String(articleId);
    if (!all[key]) all[key] = [];
    all[key].unshift(comment);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Reusable news image with fallback icon */
function NewsImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`w-full h-full bg-[#1e1e28] flex items-center justify-center ${className}`}>
        <Newspaper className="w-8 h-8 text-[#2a2a35]" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover ${className}`}
      onError={(e) => handleImageError(e, 'poster')}
    />
  );
}

export default function NewsPage() {
  useEffect(() => { document.querySelector('main')?.scrollTo({ top: 0 }) || window.scrollTo(0, 0); }, []);

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>('mock');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [visibleCount, setVisibleCount] = useState(9);
  const [selectedArticle, setSelectedArticle] = useState<{
    id: number;
    data: FullArticle | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Fetch articles from API
  useEffect(() => {
    async function fetchNews() {
      setLoading(true);
      try {
        const res = await fetch('/api/news');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setArticles(data.articles || []);
        setDataSource(data.source || 'mock');
      } catch (err) {
        console.error('Failed to load news:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  // Load comments when selecting an article
  useEffect(() => {
    if (selectedArticle?.id) {
      setComments(getComments(selectedArticle.id));
      setCommentText('');
    }
  }, [selectedArticle?.id]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach((n) => {
      cats.add(n.source);
    });
    return ['all', ...Array.from(cats)];
  }, [articles]);

  const filtered = categoryFilter === 'all'
    ? articles
    : articles.filter((n) => n.source === categoryFilter);

  const featured = filtered[0];
  const remaining = filtered.slice(1, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const handleArticleClick = useCallback(async (id: number) => {
    setSelectedArticle({ id, data: null, loading: true, error: null });
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior }) || window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior });

    try {
      const res = await fetch(`/api/news/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch article');
      const data: FullArticle = await res.json();
      setSelectedArticle({ id, data, loading: false, error: null });
    } catch {
      setSelectedArticle({ id, data: null, loading: false, error: 'Failed to load full article' });
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedArticle(null);
    setComments([]);
    setCommentText('');
  }, []);

  const handleAddComment = useCallback(() => {
    if (!commentText.trim() || !selectedArticle) return;
    setCommentSubmitting(true);

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: 'You',
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    saveComment(selectedArticle.id, newComment);
    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
    setCommentSubmitting(false);
  }, [commentText, selectedArticle]);

  // ─── Full Article View ───
  if (selectedArticle) {
    const originalItem = articles.find((n) => n.id === selectedArticle.id);
    const commentCount = comments.length;

    return (
      <div className="min-h-screen bg-[#050507] pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
          <Button
            onClick={handleBack}
            variant="outline"
            size="sm"
            className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45] mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back to News
          </Button>

          {selectedArticle.loading ? (
            <div className="space-y-6">
              <div className="animate-pulse">
                <div className="h-8 bg-[#111118] rounded w-3/4 mb-4" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-4 bg-[#111118] rounded w-24" />
                  <div className="h-4 bg-[#111118] rounded w-32" />
                </div>
                <div className="aspect-[16/9] bg-[#111118] rounded-xl mb-8" />
                <div className="space-y-3">
                  <div className="h-4 bg-[#111118] rounded w-full" />
                  <div className="h-4 bg-[#111118] rounded w-full" />
                  <div className="h-4 bg-[#111118] rounded w-5/6" />
                  <div className="h-4 bg-[#111118] rounded w-full" />
                  <div className="h-4 bg-[#111118] rounded w-4/5" />
                  <div className="h-4 bg-[#111118] rounded w-full" />
                  <div className="h-4 bg-[#111118] rounded w-3/4" />
                </div>
              </div>
            </div>
          ) : selectedArticle.error ? (
            <div className="text-center py-16">
              <Newspaper className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#9ca3af] mb-1">Could not load full article</p>
              <p className="text-sm text-[#6b7280] mb-4">{selectedArticle.error}</p>
              <Button onClick={handleBack} variant="outline" className="border-[#1e1e28] text-[#9ca3af] hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} /> Back to News
              </Button>
            </div>
          ) : selectedArticle.data ? (
            <article>
              {/* Article header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-[#6b7280]">{selectedArticle.data.source}</span>
                <span className="text-[#2a2a35]">·</span>
                <span className="text-xs text-[#6b7280]">{selectedArticle.data.date}</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-extrabold text-white leading-tight mb-6">
                {selectedArticle.data.title}
              </h1>

              {/* Article image */}
              <div className="aspect-[16/9] overflow-hidden rounded-xl mb-8 bg-[#1e1e28]">
                <NewsImage src={selectedArticle.data.image} alt={selectedArticle.data.title} />
              </div>

              {/* Article content */}
              <div className="prose prose-invert max-w-none">
                {selectedArticle.data.content.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-[#c0c0d0] text-base leading-relaxed mb-5">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Source link */}
              {selectedArticle.data.url !== '#' && (
                <div className="mt-8 pt-6 border-t border-[#1e1e28]">
                  <a
                    href={selectedArticle.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#d4a853] hover:underline"
                  >
                    Read original article <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </a>
                </div>
              )}

              {/* Comment Section */}
              <div className="mt-10 pt-8 border-t border-[#1e1e28]">
                <div className="flex items-center gap-3 mb-6">
                  <MessageCircle className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
                  <h2 className="text-lg font-bold text-white">Comments</h2>
                  <span className="px-2 py-0.5 bg-[#d4a853] text-white text-xs font-bold rounded-full">{commentCount}</span>
                </div>

                {/* Comment Input */}
                <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 mb-6">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts on this article..."
                    rows={3}
                    className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] resize-none text-sm"
                  />
                  <div className="flex justify-end mt-3">
                    <Button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || commentSubmitting}
                      className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {commentSubmitting ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                {comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {comment.author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span className="text-sm font-medium text-white">{comment.author}</span>
                          <span className="text-xs text-[#6b7280]">{formatTimeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-[#9ca3af] leading-relaxed pl-10">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 text-[#2a2a35] mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-[#6b7280] text-sm">No comments yet. Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </article>
          ) : null}
        </div>
      </div>
    );
  }

  // ─── News List View ───
  return (
    <div className="min-h-screen bg-[#050507] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Newspaper className="w-7 h-7 text-[#d4a853]" strokeWidth={1.5} />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Movie News</h1>
        </div>
        <p className="text-[#6b7280] mb-2">The latest stories from the world of cinema — industry insights, festival coverage, and cultural analysis.</p>
        <p className="text-xs text-[#6b7280] mb-8">
          {dataSource === 'mock' ? 'Curated stories' : 'Coverage'}
        </p>

        {/* Category Filter */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setVisibleCount(9); }}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#d4a853] text-white'
                  : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
              }`}
            >
              {cat === 'all' ? 'All Sources' : cat}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-10">
            {/* Featured Skeleton */}
            <div className="animate-pulse bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="aspect-[16/10] lg:aspect-auto bg-[#111118]" />
                <div className="p-6 lg:p-8 flex flex-col justify-center gap-3">
                  <div className="h-6 bg-[#111118] rounded w-16" />
                  <div className="h-6 bg-[#111118] rounded w-3/4" />
                  <div className="h-4 bg-[#111118] rounded w-full" />
                  <div className="h-4 bg-[#111118] rounded w-2/3" />
                </div>
              </div>
            </div>
            {/* Grid Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
                  <div className="aspect-[16/10] bg-[#111118]" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-[#111118] rounded w-20" />
                    <div className="h-4 bg-[#111118] rounded w-full" />
                    <div className="h-3 bg-[#111118] rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Featured Article */}
            {featured && (
              <button
                onClick={() => handleArticleClick(featured.id)}
                className="group block w-full text-left bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden hover:border-[#3a3a45] hover:shadow-xl transition-all mb-10"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                  <div className="aspect-[16/10] lg:aspect-auto overflow-hidden">
                    <NewsImage src={featured.image} alt={featured.title} className="transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="p-6 lg:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#d4a853] text-white px-2.5 py-1 rounded">Featured</span>
                      <span className="text-xs text-[#6b7280]">{featured.source} · {featured.date}</span>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-[#d4a853] transition-colors leading-snug">{featured.title}</h2>
                    <p className="text-sm text-[#9ca3af] leading-relaxed mb-4">{featured.excerpt}</p>
                    <span className="inline-flex items-center gap-1 text-sm text-[#d4a853] font-medium group-hover:underline">Read Full Story <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} /></span>
                  </div>
                </div>
              </button>
            )}

            {/* News Grid */}
            {remaining.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {remaining.map((item) => {
                    const articleComments = getComments(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleArticleClick(item.id)}
                        className="group block w-full text-left bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden hover:border-[#3a3a45] hover:shadow-lg transition-all"
                      >
                        <div className="aspect-[16/10] overflow-hidden">
                          <NewsImage src={item.image} alt={item.title} className="transition-transform duration-300 group-hover:scale-105" />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-3 h-3 text-[#6b7280]" strokeWidth={1.5} />
                            <span className="text-xs text-[#6b7280]">{item.source} · {item.date}</span>
                            {articleComments.length > 0 && (
                              <>
                                <span className="text-[#2a2a35]">·</span>
                                <span className="flex items-center gap-1 text-xs text-[#6b7280]">
                                  <MessageCircle className="w-3 h-3" strokeWidth={1.5} />
                                  {articleComments.length}
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-[#d4a853] transition-colors leading-snug">{item.title}</h3>
                          <p className="text-xs text-[#9ca3af] line-clamp-2 mb-3 leading-relaxed">{item.excerpt}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#6b7280]">Read more</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#6b7280] group-hover:text-[#d4a853]" strokeWidth={1.5} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="text-center mt-10">
                    <Button onClick={() => setVisibleCount((v) => v + 6)} variant="outline" className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] gap-2">
                      Load More Stories
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Newspaper className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[#9ca3af] mb-1">No news articles found</p>
                <p className="text-sm text-[#6b7280]">Try a different source filter</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
