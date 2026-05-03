'use client';
import Link from 'next/link';
import { Film, Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { movies } from '@/lib/data';
import MovieCard from '@/components/movie/MovieCard';

export default function NotFound() {
  const suggestions = movies.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center py-16">
        {/* 404 Animation */}
        <div className="mb-8">
          <div className="text-8xl sm:text-9xl font-extrabold text-[#8B5CF6]/20 mb-4">404</div>
          <Film className="w-16 h-16 text-[#8B5CF6] mx-auto mb-4" strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-[#9ca3af] mb-2 max-w-md mx-auto">
          Looks like this scene got cut from the final edit. The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <p className="text-sm text-[#6b7280] mb-8">
          Try searching for what you need, or head back to the main page.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap mb-12">
          <Link href="/">
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2">
              <Home className="w-4 h-4" strokeWidth={1.5} /> Go Home
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" className="border-[#1e1e28] text-white hover:bg-[#111118] gap-2">
              <Search className="w-4 h-4" strokeWidth={1.5} /> Search Movies
            </Button>
          </Link>
          <Link href="/browse">
            <Button variant="outline" className="border-[#1e1e28] text-white hover:bg-[#111118] gap-2">
              <Film className="w-4 h-4" strokeWidth={1.5} /> Browse
            </Button>
          </Link>
        </div>

        {/* Suggested Movies */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">While you&apos;re here, check out these movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {suggestions.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
