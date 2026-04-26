'use client';

import { useEffect, useState } from 'react';
import { Globe, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { detectLocation, getCurrentLocation, setCountryOverride, COUNTRY_FLAGS, COUNTRY_NAMES, AVAILABLE_COUNTRIES, getSuggestionReason } from '@/lib/geolocation';
import MovieCard from '@/components/movie/MovieCard';
import { movies } from '@/lib/data';

interface LocationData {
  countryCode: string;
  countryName: string;
  flag: string;
  reason: string;
}

export default function LocalPicksSection() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [detecting, setDetecting] = useState(true);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [suggestedMovies, setSuggestedMovies] = useState(movies.slice(0, 6));

  useEffect(() => {
    async function detect() {
      setDetecting(true);
      try {
        // Try to get from cache/override first
        const cached = getCurrentLocation();
        if (cached) {
          const flag = COUNTRY_FLAGS[cached.countryCode] || '🌍';
          const name = COUNTRY_NAMES[cached.countryCode] || cached.countryName;
          setLocation({ countryCode: cached.countryCode, countryName: name, flag, reason: getSuggestionReason(cached.countryCode) });
          setDetecting(false);
          return;
        }

        // Detect from IP
        const geo = await detectLocation();
        if (geo) {
          const flag = COUNTRY_FLAGS[geo.countryCode] || '🌍';
          const name = COUNTRY_NAMES[geo.countryCode] || geo.countryName;
          setLocation({ countryCode: geo.countryCode, countryName: name, flag, reason: getSuggestionReason(geo.countryCode) });
        }
      } catch { /* silent */ }
      setDetecting(false);
    }
    detect();
  }, []);

  const handleCountryChange = (code: string) => {
    const name = COUNTRY_NAMES[code] || code;
    const flag = COUNTRY_FLAGS[code] || '🌍';
    setCountryOverride(code, name);
    setLocation({ countryCode: code, countryName: name, flag, reason: getSuggestionReason(code) });
    setShowCountryPicker(false);
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
                {detecting ? 'Detecting your location...' : location ? `${location.flag} Local Picks` : 'Popular Near You'}
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
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    location?.countryCode === code ? 'bg-[#e50914] text-white' : 'bg-[#0a0a0f] border border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]'
                  }`}
                >
                  {COUNTRY_FLAGS[code]} {COUNTRY_NAMES[code]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Movie Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {suggestedMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </div>
    </section>
  );
}
