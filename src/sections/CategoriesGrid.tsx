'use client';
import Link from 'next/link';
import { genres } from '@/lib/data';
import { Sword, Laugh, Drama, Ghost, Eye, Rocket, Heart, Film, Sparkles, ChevronRight } from 'lucide-react';

const iconConfig: Record<string, { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; color: string; bg: string }> = {
  Sword:  { icon: Sword,  color: 'text-[#d4a853]', bg: 'bg-[#d4a853]/10' },
  Laugh:  { icon: Laugh,  color: 'text-[#d4a853]', bg: 'bg-[#d4a853]/10' },
  Drama:  { icon: Drama,  color: 'text-[#d4a853]', bg: 'bg-[#d4a853]/10' },
  Ghost:  { icon: Ghost,  color: 'text-[#d4a853]', bg: 'bg-[#d4a853]/10' },
  Eye:    { icon: Eye,    color: 'text-[#d4a853]', bg: 'bg-[#d4a853]/10' },
  Rocket: { icon: Rocket, color: 'text-[#d4a853]', bg: 'bg-[#d4a853]/10' },
  Heart:  { icon: Heart,  color: 'text-[#d4a853]', bg: 'bg-[#d4a853]/10' },
  Film:   { icon: Film,   color: 'text-[#d4a853]', bg: 'bg-[#d4a853]/10' },
};

function GenreCard({ genre }: { genre: { id: string; name: string; icon: string; count: number } }) {
  const config = iconConfig[genre.icon] || iconConfig.Film;
  const IconComp = config.icon;
  return (
    <Link
      href={`/category/${genre.id}`}
      className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[#0c0c10] border border-white/[0.06] hover:border-[#d4a853]/30 hover:bg-[#111118] transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Sheen overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)' }} />

      {/* Icon container — glassy orb */}
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center border border-white/[0.06] group-hover:scale-110 transition-transform duration-300`}
        style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.08)' }}
      >
        <IconComp className={`w-5 h-5 ${config.color}`} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className="flex flex-col min-w-0 relative z-10">
        <span className="text-[#f1f1f4] font-semibold text-sm truncate">{genre.name}</span>
        <span className="text-[#6b7280] text-xs mt-0.5">{genre.count.toLocaleString()} movies</span>
      </div>

      {/* Hover arrow */}
      <ChevronRight size={16} className="ml-auto text-[#6b7280] opacity-0 group-hover:opacity-100 transition-opacity relative z-10" strokeWidth={1.5} />
    </Link>
  );
}

function AnimeCard() {
  return (
    <Link
      href="/browse?format=anime"
      className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[#0c0c10] border border-white/[0.06] hover:border-purple-500/30 hover:bg-[#111118] transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center border border-white/[0.06] group-hover:scale-110 transition-transform duration-300"
        style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.08)' }}
      >
        <Sparkles className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
      </div>

      <div className="flex flex-col min-w-0 relative z-10">
        <span className="text-[#f1f1f4] font-semibold text-sm truncate">Anime</span>
        <span className="text-[#6b7280] text-xs mt-0.5">Explore top anime series and films</span>
      </div>

      <ChevronRight size={16} className="ml-auto text-[#6b7280] opacity-0 group-hover:opacity-100 transition-opacity relative z-10" strokeWidth={1.5} />
    </Link>
  );
}

function BollywoodCard() {
  return (
    <Link
      href="/browse?country=IN"
      className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[#0c0c10] border border-white/[0.06] hover:border-orange-500/30 hover:bg-[#111118] transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center border border-white/[0.06] group-hover:scale-110 transition-transform duration-300"
        style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.08)' }}
      >
        <Film className="w-5 h-5 text-orange-400" strokeWidth={1.5} />
      </div>

      <div className="flex flex-col min-w-0 relative z-10">
        <span className="text-[#f1f1f4] font-semibold text-sm truncate">Bollywood</span>
        <span className="text-[#6b7280] text-xs mt-0.5">Discover Indian cinema & series</span>
      </div>

      <ChevronRight size={16} className="ml-auto text-[#6b7280] opacity-0 group-hover:opacity-100 transition-opacity relative z-10" strokeWidth={1.5} />
    </Link>
  );
}

function KDramaCard() {
  return (
    <Link
      href="/browse?country=KR"
      className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[#0c0c10] border border-white/[0.06] hover:border-pink-500/30 hover:bg-[#111118] transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-pink-500/10 flex items-center justify-center border border-white/[0.06] group-hover:scale-110 transition-transform duration-300"
        style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.08)' }}
      >
        <Film className="w-5 h-5 text-pink-400" strokeWidth={1.5} />
      </div>

      <div className="flex flex-col min-w-0 relative z-10">
        <span className="text-[#f1f1f4] font-semibold text-sm truncate">K-Drama & K-Movie</span>
        <span className="text-[#6b7280] text-xs mt-0.5">Explore Korean dramas and films</span>
      </div>

      <ChevronRight size={16} className="ml-auto text-[#6b7280] opacity-0 group-hover:opacity-100 transition-opacity relative z-10" strokeWidth={1.5} />
    </Link>
  );
}

function NollywoodCard() {
  return (
    <Link
      href="/browse?country=NG"
      className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[#0c0c10] border border-white/[0.06] hover:border-green-500/30 hover:bg-[#111118] transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center border border-white/[0.06] group-hover:scale-110 transition-transform duration-300"
        style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.08)' }}
      >
        <Film className="w-5 h-5 text-green-400" strokeWidth={1.5} />
      </div>

      <div className="flex flex-col min-w-0 relative z-10">
        <span className="text-[#f1f1f4] font-semibold text-sm truncate">Nollywood</span>
        <span className="text-[#6b7280] text-xs mt-0.5">Explore Nigerian cinema & series</span>
      </div>

      <ChevronRight size={16} className="ml-auto text-[#6b7280] opacity-0 group-hover:opacity-100 transition-opacity relative z-10" strokeWidth={1.5} />
    </Link>
  );
}

export default function CategoriesGrid() {
  return (
    <section id="categories" className="py-20 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="reveal-section text-2xl sm:text-3xl font-bold text-[#f1f1f4] tracking-tight mb-10">Browse by Genre</h2>
        <div className="card-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {genres.map((genre) => (<div key={genre.id} className="card-reveal"><GenreCard genre={genre} /></div>))}
          <div className="card-reveal"><AnimeCard /></div>
          <div className="card-reveal"><BollywoodCard /></div>
          <div className="card-reveal"><KDramaCard /></div>
          <div className="card-reveal"><NollywoodCard /></div>
        </div>
      </div>
    </section>
  );
}
