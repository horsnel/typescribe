'use client';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import type { PersonSearchResult } from '@/lib/types';
import { resolveImageUrl, personSlug, getInitials, PERSON_PLACEHOLDER } from '@/lib/utils';

function PersonCard({ person }: { person: PersonSearchResult }) {
  const profileSrc = resolveImageUrl(person.profile_path, 'w185');
  const hasNoPath = !person.profile_path || profileSrc === PERSON_PLACEHOLDER;
  const initials = getInitials(person.name);
  // Track runtime image-load failures so we can swap to the initials fallback
  // instead of showing the blank silhouette SVG placeholder.
  const [imgFailed, setImgFailed] = useState(false);
  const showInitials = hasNoPath || imgFailed;

  return (
    <Link
      href={`/person/${personSlug(person.name, person.id)}`}
      className="group relative flex-shrink-0 w-[130px] sm:w-[140px] cursor-pointer block"
    >
      <div className="relative w-full aspect-square rounded-full overflow-hidden bg-[#0c0c10] border-2 border-[#1e1e28] group-hover:border-[#D4A853]/50 transition-colors mb-3">
        {showInitials ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a22] to-[#0c0c10]">
            <span className="text-lg font-bold text-[#D4A853]">{initials || '?'}</span>
          </div>
        ) : (
          <img
            src={profileSrc}
            alt={person.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}
        {/* Hover glow ring */}
        <div className="absolute inset-0 rounded-full ring-0 ring-[#D4A853]/0 group-hover:ring-2 transition-all duration-300" />
      </div>
      <h3 className="text-xs font-semibold text-white text-center line-clamp-2 leading-snug min-h-[2rem] group-hover:text-[#D4A853] transition-colors">
        {person.name}
      </h3>
      {person.known_for_department && (
        <span className="block text-[10px] text-[#D4A853] text-center font-medium">
          {person.known_for_department}
        </span>
      )}
      {person.known_for.length > 0 && (
        <p className="text-[9px] text-[#6b7280] text-center mt-0.5 line-clamp-2 leading-snug min-h-[1.5rem]">
          {person.known_for.map((kf) => kf.title).filter(Boolean).slice(0, 2).join(', ')}
        </p>
      )}
    </Link>
  );
}

export default function PopularPeopleSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [people, setPeople] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -500 : 500, behavior: 'smooth' });
  };

  useEffect(() => {
    fetch('/api/people/popular', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.results?.length > 0) {
          setPeople(data.results);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && people.length === 0) return null;

  return (
    <section id="popular-people" className="py-12 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0c0c10] border border-[#D4A853]/25 shadow-sm">
            <Users className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none m-0">Popular People</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-[#D4A853] hover:text-[#D4A853] transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-[#D4A853] hover:text-[#D4A853] transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <Link
              href="/people"
              aria-label="View all popular people"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-[#D4A853] hover:text-[#D4A853] transition-colors"
            >
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#D4A853] animate-spin" strokeWidth={1.5} />
            <span className="ml-3 text-[#6b7280] text-sm">Loading popular people...</span>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-6 px-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {people.map((person) => (
              <div key={person.id} className="snap-start flex-shrink-0">
                <PersonCard person={person} />
              </div>
            ))}
          </div>
        )}
        <style>{`#popular-people > div > div:last-child::-webkit-scrollbar { display: none; }`}</style>
      </div>
    </section>
  );
}
