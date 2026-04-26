'use client';
import { Play, Star } from 'lucide-react';
import Link from 'next/link';
import type { Movie } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MovieCardProps { movie: Movie; className?: string; }

export default function MovieCard({ movie, className }: MovieCardProps) {
  const year = movie.release_date ? movie.release_date.split('-')[0] : '';
  const genreNames = movie.genres.slice(0, 2).map((g) => g.name);
  return (
    <Link href={`/movie/${movie.slug}`} className={cn('group relative flex-shrink-0 w-[180px] sm:w-[200px] cursor-pointer block', className)}>
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#12121a]">
        <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.03]" loading="lazy" />
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#f5c518] text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
          <Star className="w-3 h-3 fill-black" />{movie.vote_average.toFixed(1)}
        </div>
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <Play className="w-4 h-4 text-white fill-white" /><span className="text-sm font-medium text-white">Watch Trailer</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-[#e50914] transition-colors">{movie.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          {year && <span className="text-xs text-[#a0a0b0]">{year}</span>}
          {year && genreNames.length > 0 && <span className="text-[#2a2a35]">·</span>}
          {genreNames.map((g) => (<span key={g} className="text-[10px] font-medium text-[#a0a0b0] bg-[#12121a] border border-[#2a2a35] px-2 py-0.5 rounded-full">{g}</span>))}
        </div>
      </div>
    </Link>
  );
}
