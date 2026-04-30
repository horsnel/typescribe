'use client';

import { useEffect, useState, useCallback } from 'react';
import { Globe, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { detectLocation, getCurrentLocation, setCountryOverride, COUNTRY_NAMES, AVAILABLE_COUNTRIES, getSuggestionReason } from '@/lib/geolocation';
import MovieCard from '@/components/movie/MovieCard';
import { movies } from '@/lib/data';
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
  const [suggestedMovies, setSuggestedMovies] = useState<Movie[]>(movies.slice(0, 6));
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
          setSuggestedMovies(movies.slice(0, 6));
        }
      } else {
        setSuggestedMovies(movies.slice(0, 6));
      }
    } catch {
      setSuggestedMovies(movies.slice(0, 6));
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
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">
                {detecting ? 'Detecting your location...' : location ? (
                  <span className="flex items-center gap-2">
                    Local Picks from
                    <span className="inline-flex items-center justify-center bg-[#d4a853]/10 text-[#d4a853] text-sm font-semibold px-3 py-1 rounded-full border border-[#d4a853]/20">
                      {location.countryName}
                    </span>
                  </span>
                ) : 'Popular Near You'}
              </h2>
            </div>
            <p className="text-[#9ca3af] text-sm">
              {detecting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> Finding content tailored to your region...</span>
              ) : location ? (
                <>
                  {location.reason} — based on {location.countryName}
                  <button
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="ml-2 text-[#d4a853] hover:underline inline-flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5" strokeWidth={1.5} /> Change
                  </button>
                </>
              ) : (
                <>
                  Movies trending in your area
                  <button onClick={() => setShowCountryPicker(!showCountryPicker)} className="ml-2 text-[#d4a853] hover:underline inline-flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" strokeWidth={1.5} /> Pick region
                  </button>
                </>
              )}
            </p>
          </div>
          <Link href="/browse" className="text-sm text-[#d4a853] hover:underline flex items-center gap-1">
            Browse All <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
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
                    location?.countryCode === code ? 'bg-[#d4a853] text-white' : 'bg-[#050507] border border-white/[0.06] text-[#9ca3af] hover:text-white hover:border-[#d4a853]/30'
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
            <Loader2 className="w-8 h-8 animate-spin text-[#d4a853]" strokeWidth={1.5} />
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
