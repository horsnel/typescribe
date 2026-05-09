'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { BookmarkCheck, Star, MessageSquare, Newspaper, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface SavedItem {
  id: string;
  type: 'article' | 'review' | 'post';
  title: string;
  excerpt: string;
  source: string;
  savedAt: string;
  link?: string;
}

export default function DashboardSavedPage() {
  const { user, isAuthenticated } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    try {
      const data = localStorage.getItem('typescribe_saved');
      if (data) setSavedItems(JSON.parse(data));
    } catch { /* ignore */ }
  }, []);

  const handleRemove = (id: string) => {
    const updated = savedItems.filter(s => s.id !== id);
    setSavedItems(updated);
    localStorage.setItem('typescribe_saved', JSON.stringify(updated));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'article': return Newspaper;
      case 'review': return Star;
      case 'post': return MessageSquare;
      default: return BookmarkCheck;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'article': return 'text-[#3b82f6]';
      case 'review': return 'text-[#D4A853]';
      case 'post': return 'text-[#22c55e]';
      default: return 'text-[#D4A853]';
    }
  };

  if (!isAuthenticated) {
    return <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to view your saved items.</p><Link href="/login" className="text-[#D4A853] hover:underline text-sm">Sign In</Link></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Saved & Bookmarks</h1>
        <Link href="/news" className="text-sm text-[#D4A853] hover:underline">Browse News</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{savedItems.filter(s => s.type === 'article').length}</p>
          <p className="text-xs text-[#6b7280]">Articles</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{savedItems.filter(s => s.type === 'review').length}</p>
          <p className="text-xs text-[#6b7280]">Reviews</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{savedItems.filter(s => s.type === 'post').length}</p>
          <p className="text-xs text-[#6b7280]">Posts</p>
        </div>
      </div>

      {savedItems.length === 0 ? (
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
          <BookmarkCheck className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-white mb-2">No saved items yet</h2>
          <p className="text-[#9ca3af] mb-1">Bookmark reviews, community posts, and news articles to find them here later.</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Link href="/news" className="text-[#D4A853] hover:underline text-sm">Browse News</Link>
            <Link href="/browse" className="text-[#D4A853] hover:underline text-sm">Browse Movies</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {savedItems.map((item) => {
            const Icon = getIcon(item.type);
            const color = getColor(item.type);
            return (
              <div key={item.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 flex items-start gap-4 hover:border-[#3a3a45] transition-colors">
                <div className="w-10 h-10 rounded-full bg-[#111118] flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[#6b7280] uppercase tracking-wider">{item.type}</span>
                    <span className="text-xs text-[#6b7280]">•</span>
                    <span className="text-xs text-[#6b7280]">{item.source}</span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{item.title}</p>
                  <p className="text-xs text-[#9ca3af] line-clamp-2">{item.excerpt}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.link && (
                    <Link href={item.link} className="p-2 text-[#6b7280] hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                    </Link>
                  )}
                  <button onClick={() => handleRemove(item.id)} className="p-2 text-[#6b7280] hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
