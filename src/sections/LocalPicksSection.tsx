'use client';

import { useEffect, useState, useCallback } from 'react';
import { Globe, MapPin, ChevronRight, Loader2 } from 'lucide-react';
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
          // Fallback to mock data if API returns empty
          setSuggestedMovies(movies.slice(0, 6));
        }
      } else {
        setSuggestedMovies(movies.slice(0, 6));
      }
    } catch {
      // On error, fall back to mock data
      setSuggestedMovies(movies.slice(0, 6));
    } finally {
      setLoadingMovies(false);
    }
  }, []);

  useEffect(() => {
    async function detect() {
      setDetecting(true);
      try {
        // Try to get from cache/override first
        const cached = getCurrentLocation();
        if (cached) {
          const name = COUNTRY_NAMES[cached.countryCode] || cached.countryName;
          setLocation({ countryCode: cached.countryCode, countryName: name, reason: getSuggestionReason(cached.countryCode) });
          // Fetch country-specific movies
          fetchLocalMovies(cached.countryCode);
          setDetecting(false);
          return;
        }

        // Detect from IP via our API route (which forwards client IP)
        try {
          const geoRes = await fetch('/api/geo');
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.countryCode) {
              const name = COUNTRY_NAMES[geoData.countryCode] || geoData.countryName;
              const loc = { countryCode: geoData.countryCode, countryName: name, reason: getSuggestionReason(geoData.countryCode) };
              setLocation(loc);
              // Cache the result in localStorage
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

        // Fallback to client-side detection
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
    <section className="py-16 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#e50914]/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[#e50914]" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                {detecting ? 'Detecting your location...' : location ? (
                  <span className="flex items-center gap-2">
                    Local Picks from
                    <span className="inline-flex items-center justify-center bg-[#e50914]/15 text-[#e50914] text-sm font-semibold px-3 py-1 rounded-full border border-[#e50914]/25">
                      {location.countryName}
                    </span>
                  </span>
                ) : 'Popular Near You'}
              </h2>
            </div>
            <p className="text-[#a0a0b0] text-sm ml-11">
              {detecting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding content tailored to your region...</span>
              ) : location ? (
                <>
                  {location.reason} — based on {location.countryName}
                  <button
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="ml-2 text-[#e50914] hover:underline inline-flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5" /> Change
                  </button>
                </>
              ) : (
                <>
                  Movies trending in your area
                  <button onClick={() => setShowCountryPicker(!showCountryPicker)} className="ml-2 text-[#e50914] hover:underline inline-flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> Pick region
                  </button>
                </>
              )}
            </p>
          </div>
          <Link href="/browse" className="text-sm text-[#e50914] hover:underline flex items-center gap-1">
            Browse All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Country Picker */}
        {showCountryPicker && (
          <div className="mb-6 bg-[#12121a] border border-[#2a2a35] rounded-xl p-4">
            <p className="text-sm text-[#a0a0b0] mb-3">Select your region to see localized content:</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COUNTRIES.map((code) => (
                <button
                  key={code}
                  onClick={() => handleCountryChange(code)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    location?.countryCode === code ? 'bg-[#e50914] text-white' : 'bg-[#0a0a0f] border border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]'
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
            <Loader2 className="w-8 h-8 animate-spin text-[#e50914]" />
            <span className="ml-3 text-[#a0a0b0]">Loading local picks...</span>
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
