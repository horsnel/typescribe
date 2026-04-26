'use client';
import Link from 'next/link';
import { genres } from '@/lib/data';
import { Sword, Laugh, Drama, Ghost, Eye, Rocket, Heart, Film } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = { Sword, Laugh, Drama, Ghost, Eye, Rocket, Heart, Film };

function GenreCard({ genre }: { genre: { id: string; name: string; icon: string; count: number } }) {
  const IconComp = iconMap[genre.icon];
  return (
    <Link href={`/category/${genre.id}`} className="group bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 hover:border-[#e50914]/40 hover:shadow-lg hover:shadow-[#e50914]/5 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#e50914]/10 flex items-center justify-center group-hover:bg-[#e50914]/20 transition-colors">
          {IconComp && <IconComp className="w-5 h-5 text-[#e50914]" />}
        </div>
        <h3 className="text-base font-semibold text-white group-hover:text-[#e50914] transition-colors">{genre.name}</h3>
      </div>
      <p className="text-sm text-[#6b6b7b]">{genre.count.toLocaleString()} movies</p>
    </Link>
  );
}

export default function CategoriesGrid() {
  return (
    <section id="categories" className="py-20 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="reveal-section text-2xl sm:text-3xl font-bold text-white tracking-tight mb-10">Browse by Genre</h2>
        <div className="card-grid grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {genres.map((genre) => (<div key={genre.id} className="card-reveal"><GenreCard genre={genre} /></div>))}
        </div>
      </div>
    </section>
  );
}
