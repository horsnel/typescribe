'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Loader2, ChevronRight } from 'lucide-react';
import MovieCard from '@/components/movie/MovieCard';
import type { Movie } from '@/lib/types';

const COUNTRY_SECTIONS = [
  { code: 'KR', name: 'Korea', label: 'Trending in Korea' },
  { code: 'NG', name: 'Nigeria', label: 'New from Nollywood' },
  { code: 'JP', name: 'Japan', label: 'Hot in Japan' },
  { code: 'IN', name: 'India', label: 'Bollywood Picks' },
];

interface CountrySectionProps {
  code: string;
  name: string;
  label: string;
}

function CountrySection({ code, name, label }: CountrySectionProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCountry() {
      try {
        const res = await fetch(`/api/browse?country=${code}&sort=popularity.desc&page=1`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data.movies?.slice(0, 8) || []);
        }
      } catch {
        // Fallback: empty
      } finally {
        setLoading(false);
      }
    }
    fetchCountry();
  }, [code]);

  if (!loading && movies.length === 0) return null;

  return (
    <section className="py-10 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center bg-[#D4A853]/10 text-[#D4A853] text-sm font-semibold px-3 py-1 rounded-full border border-[#D4A853]/20">
              {name}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">{label}</h2>
          </div>
          <Link
            href={`/browse?country=${code}`}
            className="flex items-center gap-1 text-sm text-[#D4A853] hover:underline font-medium"
          >
            View all <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-8">
            <Loader2 className="w-6 h-6 text-[#D4A853] animate-spin" strokeWidth={1.5} />
            <span className="text-sm text-[#6b7280]">Loading {name} content...</span>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {movies.map((movie) => (
              <div key={movie.id} className="flex-shrink-0 w-[160px] sm:w-[180px]">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function CountryPicksSection() {
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  useEffect(() => {
    async function detectCountry() {
      try {
        const res = await fetch('/api/geo');
        if (res.ok) {
          const data = await res.json();
          setDetectedCountry(data.countryCode);
        }
      } catch {
        // Use default sections
      }
    }
    detectCountry();
  }, []);

  // Reorder sections: put detected country first
  const sections = [...COUNTRY_SECTIONS].sort((a, b) => {
    if (a.code === detectedCountry) return -1;
    if (b.code === detectedCountry) return 1;
    return 0;
  });

  // Show 2-3 sections
  const displaySections = sections.slice(0, detectedCountry && !COUNTRY_SECTIONS.find(s => s.code === detectedCountry) ? 3 : 2);

  return (
    <div>
      {displaySections.map(section => (
        <CountrySection
          key={section.code}
          code={section.code}
          name={section.name}
          label={section.label}
        />
      ))}
    </div>
  );
}
