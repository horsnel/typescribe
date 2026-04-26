'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowLeft, Clock, Newspaper, Loader2 } from 'lucide-react';
import { newsItems, genres } from '@/lib/data';
import { Button } from '@/components/ui/button';

type CategoryFilter = 'all' | string;

interface FullArticle {
  title: string;
  content: string;
  source: string;
  date: string;
  image: string;
  url: string;
}

export default function NewsPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [visibleCount, setVisibleCount] = useState(9);
  const [selectedArticle, setSelectedArticle] = useState<{
    id: number;
    data: FullArticle | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  // Extract categories from news items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    newsItems.forEach((n) => {
      cats.add(n.source);
    });
    return ['all', ...Array.from(cats)];
  }, []);

  const filtered = categoryFilter === 'all'
    ? newsItems
    : newsItems.filter((n) => n.source === categoryFilter);

  const featured = filtered[0];
  const remaining = filtered.slice(1, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const handleArticleClick = useCallback(async (id: number) => {
    setSelectedArticle({ id, data: null, loading: true, error: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await fetch(`/api/news/${id}`);
      if (!res.ok) throw new Error('Failed to fetch article');
      const data: FullArticle = await res.json();
      setSelectedArticle({ id, data, loading: false, error: null });
    } catch {
      setSelectedArticle({ id, data: null, loading: false, error: 'Failed to load full article' });
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedArticle(null);
  }, []);

  // ─── Full Article View ───
  if (selectedArticle) {
    const originalItem = newsItems.find((n) => n.id === selectedArticle.id);

    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-8 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
          <nav className="flex items-center gap-2 text-sm text-[#6b6b7b] mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <button onClick={handleBack} className="hover:text-white transition-colors">News</button>
            <span>/</span>
            <span className="text-[#a0a0b0] truncate max-w-[200px]">{originalItem?.title}</span>
          </nav>

          <Button
            onClick={handleBack}
            variant="outline"
            size="sm"
            className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45] mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to News
          </Button>

          {selectedArticle.loading ? (
            <div className="space-y-6">
              {/* Loading skeleton */}
              <div className="animate-pulse">
                <div className="h-8 bg-[#1a1a25] rounded w-3/4 mb-4" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-4 bg-[#1a1a25] rounded w-24" />
                  <div className="h-4 bg-[#1a1a25] rounded w-32" />
                </div>
                <div className="aspect-[16/9] bg-[#1a1a25] rounded-xl mb-8" />
                <div className="space-y-3">
                  <div className="h-4 bg-[#1a1a25] rounded w-full" />
                  <div className="h-4 bg-[#1a1a25] rounded w-full" />
                  <div className="h-4 bg-[#1a1a25] rounded w-5/6" />
                  <div className="h-4 bg-[#1a1a25] rounded w-full" />
                  <div className="h-4 bg-[#1a1a25] rounded w-4/5" />
                  <div className="h-4 bg-[#1a1a25] rounded w-full" />
                  <div className="h-4 bg-[#1a1a25] rounded w-3/4" />
                </div>
              </div>
            </div>
          ) : selectedArticle.error ? (
            <div className="text-center py-16">
              <Newspaper className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
              <p className="text-[#a0a0b0] mb-1">Could not load full article</p>
              <p className="text-sm text-[#6b6b7b] mb-4">{selectedArticle.error}</p>
              <Button onClick={handleBack} variant="outline" className="border-[#2a2a35] text-[#a0a0b0] hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to News
              </Button>
            </div>
          ) : selectedArticle.data ? (
            <article>
              {/* Article header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-[#6b6b7b]">{selectedArticle.data.source}</span>
                <span className="text-[#2a2a35]">·</span>
                <span className="text-xs text-[#6b6b7b]">{selectedArticle.data.date}</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-extrabold text-white leading-tight mb-6">
                {selectedArticle.data.title}
              </h1>

              {/* Article image */}
              {selectedArticle.data.image && (
                <div className="aspect-[16/9] overflow-hidden rounded-xl mb-8">
                  <img
                    src={selectedArticle.data.image}
                    alt={selectedArticle.data.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

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
                <div className="mt-8 pt-6 border-t border-[#2a2a35]">
                  <a
                    href={selectedArticle.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#e50914] hover:underline"
                  >
                    Read original article <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </article>
          ) : null}
        </div>
      </div>
    );
  }

  // ─── News List View ───
  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b6b7b] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#a0a0b0]">News</span>
        </nav>

        <div className="flex items-center gap-3 mb-2">
          <Newspaper className="w-7 h-7 text-[#e50914]" />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Movie News</h1>
        </div>
        <p className="text-[#6b6b7b] mb-8">The latest stories from the world of cinema — industry insights, festival coverage, and cultural analysis.</p>

        {/* Category Filter */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setVisibleCount(9); }}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#e50914] text-white'
                  : 'bg-[#12121a] border border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]'
              }`}
            >
              {cat === 'all' ? 'All Sources' : cat}
            </button>
          ))}
        </div>

        {/* Featured Article */}
        {featured && (
          <button
            onClick={() => handleArticleClick(featured.id)}
            className="group block w-full text-left bg-[#12121a] border border-[#2a2a35] rounded-xl overflow-hidden hover:border-[#3a3a45] hover:shadow-xl transition-all mb-10"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="aspect-[16/10] lg:aspect-auto overflow-hidden">
                <img src={featured.image} alt={featured.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="p-6 lg:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#e50914] text-white px-2.5 py-1 rounded">Featured</span>
                  <span className="text-xs text-[#6b6b7b]">{featured.source} · {featured.date}</span>
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-[#e50914] transition-colors leading-snug">{featured.title}</h2>
                <p className="text-sm text-[#a0a0b0] leading-relaxed mb-4">{featured.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-sm text-[#e50914] font-medium group-hover:underline">Read Full Story <ArrowUpRight className="w-3.5 h-3.5" /></span>
              </div>
            </div>
          </button>
        )}

        {/* News Grid */}
        {remaining.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {remaining.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleArticleClick(item.id)}
                  className="group block w-full text-left bg-[#12121a] border border-[#2a2a35] rounded-xl overflow-hidden hover:border-[#3a3a45] hover:shadow-lg transition-all"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3 h-3 text-[#6b6b7b]" />
                      <span className="text-xs text-[#6b6b7b]">{item.source} · {item.date}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-[#e50914] transition-colors leading-snug">{item.title}</h3>
                    <p className="text-xs text-[#a0a0b0] line-clamp-2 mb-3 leading-relaxed">{item.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6b6b7b]">Read more</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#6b6b7b] group-hover:text-[#e50914]" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <Button onClick={() => setVisibleCount((v) => v + 6)} variant="outline" className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] gap-2">
                  Load More Stories
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Newspaper className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
            <p className="text-[#a0a0b0] mb-1">No news articles found</p>
            <p className="text-sm text-[#6b6b7b]">Try a different source filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
