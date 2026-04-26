'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { newsItems } from '@/lib/data';

export default function NewsSection() {
  return (
    <section id="news" className="py-20 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Latest Movie News</h2>
          <Link href="/news" className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-[#e50914] transition-colors">All News<ArrowUpRight className="w-4 h-4" /></Link>
        </div>
        <div className="card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newsItems.slice(0, 4).map((item) => (
            <Link key={item.id} href={item.url !== '#' ? item.url : '/news'} className="card-reveal group block bg-[#12121a] border border-[#2a2a35] rounded-xl overflow-hidden hover:border-[#3a3a45] hover:shadow-lg transition-all">
              <div className="aspect-[16/10] overflow-hidden"><img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" /></div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-[#e50914] transition-colors leading-snug">{item.title}</h3>
                <p className="text-xs text-[#a0a0b0] line-clamp-2 mb-3 leading-relaxed">{item.excerpt}</p>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2 min-w-0"><span className="text-xs text-[#6b6b7b] truncate">{item.source}</span><span className="text-[#2a2a35] flex-shrink-0">|</span><span className="text-xs text-[#6b6b7b] flex-shrink-0">{item.date}</span></div><ArrowUpRight className="w-3.5 h-3.5 text-[#6b6b7b] group-hover:text-[#e50914] transition-colors flex-shrink-0" /></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
