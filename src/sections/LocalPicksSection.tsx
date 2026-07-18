'use client';

import { useEffect, useState, useCallback } from 'react';
import { Globe, ChevronRight, Loader2, MapPin } from 'lucide-react';
import Link from 'next/link';
import { detectLocation, getCurrentLocation, setCountryOverride, COUNTRY_NAMES, AVAILABLE_COUNTRIES, getSuggestionReason } from '@/lib/geolocation';
import MovieCard from '@/components/movie/MovieCard';
// No longer importing mock data from @/lib/data
import type { Movie } from '@/lib/types';

interface LocationData {
  countryCode: string;
  countryName: string;
  reason: string;
}

export default function LocalPicksSection() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [detecting, setDetecting] = useState(true);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [suggestedMovies, setSuggestedMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);

  // Fetch movies from the discover/local API based on the detected country
  const fetchLocalMovies = useCallback(async (countryCode: string) => {
    setLoadingMovies(true);
    try {
      const res = await fetch(`/api/discover/local?countryCode=${encodeURIComponent(countryCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.movies && data.movies.length > 0) {
          setSuggestedMovies(data.movies.slice(0, 12));
        } else {
          // No local movies found — fall back to trending
          try {
            const trendRes = await fetch('/api/browse?source=trending');
            if (trendRes.ok) {
              const trendData = await trendRes.json();
              if (trendData.movies?.length > 0) {
                setSuggestedMovies(trendData.movies.slice(0, 12));
              }
            }
          } catch { /* ignore */ }
        }
      } else {
        // API error — fall back to trending
        try {
          const trendRes = await fetch('/api/browse?source=trending');
          if (trendRes.ok) {
            const trendData = await trendRes.json();
            if (trendData.movies?.length > 0) {
              setSuggestedMovies(trendData.movies.slice(0, 12));
            }
          }
        } catch { /* ignore */ }
      }
    } catch {
      // API error — fall back to trending
      try {
        const trendRes = await fetch('/api/browse?source=trending');
        if (trendRes.ok) {
          const trendData = await trendRes.json();
          if (trendData.movies?.length > 0) {
            setSuggestedMovies(trendData.movies.slice(0, 12));
          }
        }
      } catch { /* ignore */ }
    } finally {
      setLoadingMovies(false);
    }
  }, []);

  useEffect(() => {
    async function detect() {
      setDetecting(true);
      try {
        const cached = getCurrentLocation();
        if (cached) {
          const name = COUNTRY_NAMES[cached.countryCode] || cached.countryName;
          setLocation({ countryCode: cached.countryCode, countryName: name, reason: getSuggestionReason(cached.countryCode) });
          fetchLocalMovies(cached.countryCode);
          setDetecting(false);
          return;
        }

        try {
          const geoRes = await fetch('/api/geo');
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.countryCode) {
              const name = COUNTRY_NAMES[geoData.countryCode] || geoData.countryName;
              const loc = { countryCode: geoData.countryCode, countryName: name, reason: getSuggestionReason(geoData.countryCode) };
              setLocation(loc);
              try {
                localStorage.setItem('typescribe_geo', JSON.stringify({
                  countryCode: geoData.countryCode,
                  countryName: geoData.countryName || name,
                  city: geoData.city || '',
                  region: geoData.region || '',
                  latitude: 0,
                  longitude: 0,
                  timezone: geoData.timezone || 'UTC',
                  detected: true,
                  timestamp: Date.now(),
                }));
              } catch { /* ignore */ }
              fetchLocalMovies(geoData.countryCode);
              setDetecting(false);
              return;
            }
          }
        } catch { /* API route failed, continue with client-side detection */ }

        const geo = await detectLocation();
        if (geo) {
          const name = COUNTRY_NAMES[geo.countryCode] || geo.countryName;
          setLocation({ countryCode: geo.countryCode, countryName: name, reason: getSuggestionReason(geo.countryCode) });
          fetchLocalMovies(geo.countryCode);
        }
      } catch { /* silent */ }
      setDetecting(false);
    }
    detect();
  }, [fetchLocalMovies]);

  const handleCountryChange = (code: string) => {
    const name = COUNTRY_NAMES[code] || code;
    setCountryOverride(code, name);
    setLocation({ countryCode: code, countryName: name, reason: getSuggestionReason(code) });
    setShowCountryPicker(false);
    fetchLocalMovies(code);
  };

  return (
    <section className="py-12 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0c0c10] border border-[#D4A853]/25 shadow-sm mb-2">
              <MapPin className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none m-0">
                {detecting ? 'Detecting your location...' : location ? (
                  <span className="flex items-center gap-2">
                    Local Picks from
                    <span className="inline-flex items-center justify-center bg-[#D4A853]/10 text-[#D4A853] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#D4A853]/20">
                      {location.countryName}
                    </span>
                  </span>
                ) : 'Popular Near You'}
              </h2>
            </div>
            <p className="text-[#9ca3af] text-sm ml-1">
              {detecting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> Finding content tailored to your region...</span>
              ) : location ? (
                <button
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="text-[#D4A853] hover:underline inline-flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" strokeWidth={1.5} /> Change region
                </button>
              ) : (
                <button onClick={() => setShowCountryPicker(!showCountryPicker)} className="text-[#D4A853] hover:underline inline-flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" strokeWidth={1.5} /> Pick region
                </button>
              )}
            </p>
          </div>
          <Link
            href="/browse"
            aria-label="Browse all local picks"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-[#D4A853] hover:text-[#D4A853] transition-colors"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Country Picker */}
        {showCountryPicker && (
          <div className="mb-6 bg-[#0c0c10] border border-white/[0.06] rounded-xl p-4">
            <p className="text-sm text-[#9ca3af] mb-3">Select your region to see localized content:</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COUNTRIES.map((code) => (
                <button
                  key={code}
                  onClick={() => handleCountryChange(code)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    location?.countryCode === code ? 'bg-[#D4A853] text-white' : 'bg-[#050507] border border-white/[0.06] text-[#9ca3af] hover:text-white hover:border-[#D4A853]/30'
                  }`}
                >
                  {COUNTRY_NAMES[code]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Movie Grid */}
        {loadingMovies ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A853]" strokeWidth={1.5} />
            <span className="ml-3 text-[#9ca3af]">Loading local picks...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {suggestedMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
