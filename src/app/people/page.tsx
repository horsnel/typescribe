'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Film, Clapperboard, PenSquare, Popcorn, Search,
  ChevronLeft, ChevronRight, Loader2, Star, ArrowRight, Wand2,
} from 'lucide-react';
import type { PersonSearchResult } from '@/lib/types';
import { resolveImageUrl, handleImageError, personSlug, getInitials, PERSON_PLACEHOLDER } from '@/lib/utils';

type DepartmentFilter = 'all' | 'Acting' | 'Directing' | 'Writing' | 'Production' | 'Sound' | 'Art' | 'Camera' | 'Costume';

const DEPARTMENTS: { key: DepartmentFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Users className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { key: 'Acting', label: 'Actors', icon: <Film className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { key: 'Directing', label: 'Directors', icon: <Clapperboard className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { key: 'Writing', label: 'Writers', icon: <PenSquare className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { key: 'Production', label: 'Producers', icon: <Popcorn className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { key: 'Sound', label: 'Sound', icon: <Wand2 className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { key: 'Art', label: 'Art', icon: <Star className="w-3.5 h-3.5" strokeWidth={1.5} /> },
];

function PersonGridCard({ person }: { person: PersonSearchResult }) {
  const profileSrc = resolveImageUrl(person.profile_path, 'w185');
  const isPlaceholder = !person.profile_path || profileSrc === PERSON_PLACEHOLDER;
  const initials = getInitials(person.name);

  return (
    <Link
      href={`/person/${personSlug(person.name, person.id)}`}
      className="group bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden hover:border-[#3a3a45] transition-all hover:shadow-lg hover:shadow-[#D4A853]/5"
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-[#050507]">
        {isPlaceholder ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a22] to-[#0c0c10]">
            <div className="text-center">
              <span className="text-3xl font-bold text-[#6b7280]">{initials}</span>
            </div>
          </div>
        ) : (
          <img
            src={profileSrc}
            alt={person.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => handleImageError(e, 'person')}
          />
        )}
        {/* Department badge */}
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#D4A853]/90 text-white">
            {person.known_for_department}
          </span>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-sm font-medium text-white">View Profile</span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-[#D4A853] transition-colors">
          {person.name}
        </h3>
        {person.known_for.length > 0 && (
          <p className="text-[10px] text-[#6b7280] mt-1 truncate">
            {person.known_for.map((kf) => kf.title).filter(Boolean).slice(0, 2).join(', ')}
          </p>
        )}
      </div>
    </Link>
  );
}

function PeopleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDept = (searchParams.get('department') as DepartmentFilter) || 'all';
  const initialQuery = searchParams.get('q') || '';

  const [department, setDepartment] = useState<DepartmentFilter>(initialDept);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [people, setPeople] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Fetch popular people or search results
  useEffect(() => {
    setLoading(true);
    const fetchPeople = async () => {
      try {
        if (searchQuery.trim()) {
          // Search mode
          const res = await fetch(`/api/people/search?q=${encodeURIComponent(searchQuery)}&page=${page}`);
          if (res.ok) {
            const data = await res.json();
            const filtered = department !== 'all'
              ? (data.results ?? []).filter((p: PersonSearchResult) => p.known_for_department === department)
              : data.results ?? [];
            setPeople(filtered);
            setTotalPages(data.total_pages ?? 1);
            setTotalResults(data.total_results ?? filtered.length);
          }
        } else {
          // Browse mode — popular people
          const res = await fetch(`/api/people/popular?page=${page}`);
          if (res.ok) {
            const data = await res.json();
            const filtered = department !== 'all'
              ? (data.results ?? []).filter((p: PersonSearchResult) => p.known_for_department === department)
              : data.results ?? [];
            setPeople(filtered);
            setTotalPages(Math.min((data.total_pages ?? 1), 500)); // TMDB limit
            setTotalResults(data.total_results ?? 0);
          }
        }
      } catch {
        setPeople([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPeople();
  }, [searchQuery, department, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [department, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">People</h1>
          <p className="text-[#9ca3af] text-sm">Browse actors, directors, writers, and more from the world of film & TV</p>
        </div>

        {/* Search + Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actors, directors, producers..."
              className="w-full bg-[#0c0c10] border border-[#1e1e28] rounded-full py-2.5 pl-11 pr-4 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] text-sm"
            />
          </form>

          {/* Department Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {DEPARTMENTS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setDepartment(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  department === key
                    ? 'bg-[#D4A853] text-white'
                    : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[#6b7280]">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> Loading...
              </span>
            ) : (
              <>
                {people.length} {searchQuery ? 'search' : 'popular'} {people.length === 1 ? 'person' : 'people'}
                {department !== 'all' && <span> in {department}</span>}
              </>
            )}
          </p>
          {!searchQuery && department === 'all' && (
            <span className="text-xs text-[#6b7280]">Page {page} of {totalPages}</span>
          )}
        </div>

        {/* People Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#D4A853] animate-spin" strokeWidth={1.5} />
          </div>
        ) : people.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {people.map((person) => (
              <PersonGridCard key={person.id} person={person} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold text-white mb-2">No people found</h3>
            <p className="text-sm text-[#6b7280] mb-4">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search term.`
                : `No popular people found for the ${department} department.`}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setDepartment('all'); }}
              className="text-sm text-[#D4A853] hover:text-[#B8922F] font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {!loading && people.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-white hover:border-[#3a3a45] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} /> Previous
            </button>
            <span className="text-sm text-[#6b7280]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-2 px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-white hover:border-[#3a3a45] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { Suspense } from 'react';

export default function PeoplePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A853]" strokeWidth={1.5} />
      </div>
    }>
      <PeopleContent />
    </Suspense>
  );
}
