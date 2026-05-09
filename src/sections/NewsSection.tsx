'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Newspaper } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
  image: string;
}

export default function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/news')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.articles && data.articles.length > 0) {
          const items: NewsItem[] = data.articles.slice(0, 4).map((a: any, i: number) => ({
            id: a.id || `news-${i}`,
            title: a.title || 'Untitled',
            excerpt: a.description || a.excerpt || '',
            source: a.source?.name || a.source || 'Unknown',
            date: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (a.date || ''),
            url: a.url || '#',
            image: a.urlToImage || a.image || '',
          }));
          setNews(items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && news.length === 0) return null;

  return (
    <section id="news" className="py-20 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-[#D4A853]" strokeWidth={1.5} />
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Latest Movie News</h2>
          </div>
          <Link href="/news" className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#D4A853] transition-colors">All News<ArrowUpRight className="w-4 h-4" strokeWidth={1.5} /></Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#0c0c10] border border-white/[0.06] rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[16/10] bg-[#111118]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[#111118] rounded w-3/4" />
                  <div className="h-3 bg-[#111118] rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {news.map((item) => (
              <Link key={item.id} href={item.url !== '#' ? item.url : '/news'} target={item.url !== '#' ? '_blank' : undefined} rel={item.url !== '#' ? 'noopener noreferrer' : undefined} className="card-reveal group block bg-[#0c0c10] border border-white/[0.06] rounded-xl overflow-hidden hover:border-[#D4A853]/30 hover:shadow-lg transition-all">
                <div className="aspect-[16/10] overflow-hidden bg-[#111118]">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const p = (e.target as HTMLImageElement).nextElementSibling as HTMLElement; if (p) { p.style.display = 'flex'; } }} />
                  ) : null}
                  <div className={`w-full h-full items-center justify-center ${item.image ? 'hidden' : 'flex'}`}>
                    <Newspaper className="w-8 h-8 text-[#2a2a35]" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-[#D4A853] transition-colors leading-snug">{item.title}</h3>
                  <p className="text-xs text-[#9ca3af] line-clamp-2 mb-3 leading-relaxed">{item.excerpt}</p>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 min-w-0"><span className="text-xs text-[#6b7280] truncate">{item.source}</span>{item.date && <><span className="text-[#1e1e28] flex-shrink-0">|</span><span className="text-xs text-[#6b7280] flex-shrink-0">{item.date}</span></>}</div><ArrowUpRight className="w-3.5 h-3.5 text-[#6b7280] group-hover:text-[#D4A853] transition-colors flex-shrink-0" strokeWidth={1.5} /></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
