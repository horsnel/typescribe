'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar, MapPin, Globe, Star, Film, Tv, Sparkles,
  ArrowLeft, Loader2, ExternalLink, User, Award,
  ChevronDown, Clapperboard, PenSquare, Popcorn, Wand2,
  Users, Link2,
} from 'lucide-react';
import MovieCard from '@/components/movie/MovieCard';
import { Button } from '@/components/ui/button';
import type { Person, PersonCredits, PersonCredit } from '@/lib/types';
import { resolveImageUrl, handleImageError, personIdFromSlug, personSlug, getInitials, PERSON_PLACEHOLDER } from '@/lib/utils';

type CreditTab = 'acting' | 'directing' | 'writing' | 'producing' | 'all';

interface RelatedPerson {
  id: number;
  name: string;
  profile_path: string;
  known_for_department: string;
  shared_credits: number;
  shared_movies: string[];
}

interface JikanCrossRef {
  malId: number;
  name: string;
  imageUrl: string | null;
  about: string | null;
  favourites: number;
  malUrl: string | null;
  birthday: string | null;
  matchConfidence: 'high' | 'medium';
}

export default function PersonPage() {
  const params = useParams();
  const slug = (params?.slug as string[] | undefined)?.[0] || '';
  const personId = personIdFromSlug(slug).toString() || slug;

  const [person, setPerson] = useState<Person | null>(null);
  const [credits, setCredits] = useState<PersonCredits>({ cast: [], crew: [] });
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [creditTab, setCreditTab] = useState<CreditTab>('acting');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'movie' | 'tv'>('all');

  // Related people (People Also Viewed)
  const [relatedPeople, setRelatedPeople] = useState<RelatedPerson[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Jikan cross-reference
  const [jikanRef, setJikanRef] = useState<JikanCrossRef | null>(null);
  const [jikanLoading, setJikanLoading] = useState(false);

  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (!personId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading state before async fetch (React docs: 'You Might Not Need an Effect' § fetch-on-mount)
    setLoading(true);

    fetch(`/api/people/${personId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.person) {
          setPerson(data.person);
          setCredits(data.credits ?? { cast: [], crew: [] });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch related people
    setRelatedLoading(true);
    fetch(`/api/people/${personId}/related`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.results) setRelatedPeople(data.results);
      })
      .catch(() => {})
      .finally(() => setRelatedLoading(false));

    // Fetch Jikan cross-reference
    setJikanLoading(true);
    fetch(`/api/people/${personId}/jikan`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.jikanPerson && data.jikanPerson.malId) {
          setJikanRef({
            malId: data.jikanPerson.malId,
            name: data.jikanPerson.name ?? '',
            imageUrl: data.jikanPerson.imageUrl ?? null,
            about: data.jikanPerson.about ?? null,
            favourites: data.jikanPerson.favourites ?? 0,
            malUrl: data.jikanPerson.malUrl ?? null,
            birthday: data.jikanPerson.birthday ?? null,
            matchConfidence: data.matchConfidence ?? 'medium',
          });
        }
      })
      .catch(() => {})
      .finally(() => setJikanLoading(false));
  }, [personId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4A853] animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center px-6">
          <User className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="text-xl font-bold text-white mb-2">Person Not Found</h1>
          <p className="text-sm text-[#6b7280] mb-6">We couldn&apos;t find information for this person.</p>
          <Link href="/" className="text-[#D4A853] hover:text-[#B8922F] font-medium text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Deduplicate crew credits (same movie, different jobs → combine)
  const crewByDepartment = credits.crew.reduce<Record<string, PersonCredit[]>>((acc, c) => {
    const dept = c.department || 'Other';
    if (!acc[dept]) acc[dept] = [];
    if (!acc[dept].find((existing) => existing.id === c.id)) {
      acc[dept].push(c);
    } else {
      const existing = acc[dept].find((e) => e.id === c.id);
      if (existing && c.job && existing.job && !existing.job.includes(c.job)) {
        existing.job = `${existing.job}, ${c.job}`;
      }
    }
    return acc;
  }, {});

  const directing = crewByDepartment['Directing'] ?? [];
  const writing = crewByDepartment['Writing'] ?? [];
  const producing = crewByDepartment['Production'] ?? [];

  // TV credits (potential anime)
  const tvCredits = credits.cast.filter((c) => c.media_type === 'tv');

  const getFilteredCredits = (): PersonCredit[] => {
    let list: PersonCredit[] = [];
    switch (creditTab) {
      case 'acting': list = credits.cast; break;
      case 'directing': list = directing; break;
      case 'writing': list = writing; break;
      case 'producing': list = producing; break;
      case 'all': list = [...credits.cast, ...credits.crew]; break;
    }

    if (mediaFilter !== 'all') {
      list = list.filter((c) => c.media_type === mediaFilter);
    }

    const seen = new Set<number>();
    return list.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  };

  const filteredCredits = getFilteredCredits();

  const creditsByYear = filteredCredits.reduce<Record<string, PersonCredit[]>>((acc, c) => {
    const year = c.release_date ? new Date(c.release_date).getFullYear().toString() : 'TBA';
    if (!acc[year]) acc[year] = [];
    acc[year].push(c);
    return acc;
  }, {});

  const sortedYears = Object.keys(creditsByYear).sort((a, b) => {
    if (a === 'TBA') return -1;
    if (b === 'TBA') return 1;
    return parseInt(b) - parseInt(a);
  });

  const tabConfig: { key: CreditTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'acting', label: 'Acting', icon: <Film className="w-3.5 h-3.5" strokeWidth={1.5} />, count: credits.cast.length },
    { key: 'directing', label: 'Directing', icon: <Clapperboard className="w-3.5 h-3.5" strokeWidth={1.5} />, count: directing.length },
    { key: 'writing', label: 'Writing', icon: <PenSquare className="w-3.5 h-3.5" strokeWidth={1.5} />, count: writing.length },
    { key: 'producing', label: 'Producing', icon: <Popcorn className="w-3.5 h-3.5" strokeWidth={1.5} />, count: producing.length },
  ];

  const profileSrc = resolveImageUrl(person.profile_path, 'w500');
  const isPlaceholder = !person.profile_path;

  return (
    <div className="min-h-screen bg-[#050507] pt-4 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#9ca3af] hover:text-white transition-colors text-sm mb-6">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-10">
          {/* Profile Image */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-56 h-80 rounded-2xl overflow-hidden bg-[#0c0c10] border border-[#1e1e28] shadow-2xl">
              {isPlaceholder ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a22] to-[#0c0c10]">
                  <User className="w-16 h-16 text-[#6b7280]" strokeWidth={1} />
                </div>
              ) : (
                <img
                  src={profileSrc}
                  alt={person.name}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageError(e, 'person')}
                />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{person.name}</h1>

            {person.known_for_department && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A853]/10 border border-[#D4A853]/20 rounded-full mb-4">
                <Award className="w-3.5 h-3.5 text-[#D4A853]" strokeWidth={1.5} />
                <span className="text-xs font-medium text-[#D4A853]">{person.known_for_department}</span>
              </div>
            )}

            {/* Quick Facts */}
            <div className="flex flex-wrap gap-4 mb-5 justify-center md:justify-start">
              {person.birthday && (
                <div className="flex items-center gap-1.5 text-sm text-[#9ca3af]">
                  <Calendar className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
                  <span>{new Date(person.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  {person.age !== null && <span className="text-[#6b7280]">({person.age} years{person.deathday ? ' old at death' : ' old'})</span>}
                </div>
              )}
              {person.place_of_birth && (
                <div className="flex items-center gap-1.5 text-sm text-[#9ca3af]">
                  <MapPin className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
                  <span>{person.place_of_birth}</span>
                </div>
              )}
              {person.homepage && (
                <a href={person.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#D4A853] transition-colors">
                  <Globe className="w-4 h-4" strokeWidth={1.5} />
                  <span>Website</span>
                  <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                </a>
              )}
              {person.imdb_id && (
                <a href={`https://www.imdb.com/name/${person.imdb_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#D4A853] transition-colors">
                  <span className="bg-[#D4A853] text-black text-[9px] font-bold px-1 py-0.5 rounded">IMDb</span>
                  <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                </a>
              )}
            </div>

            {/* Also Known As */}
            {person.also_known_as.length > 0 && (
              <div className="mb-5">
                <span className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">Also Known As</span>
                <p className="text-sm text-[#9ca3af] mt-1">{person.also_known_as.slice(0, 5).join(' · ')}</p>
              </div>
            )}

            {/* Biography */}
            {person.biography ? (
              <div className="mb-2">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Biography</h2>
                <div className={`text-sm text-[#9ca3af] leading-relaxed ${!bioExpanded ? 'line-clamp-4' : ''}`}>
                  {person.biography.split('\n').map((p, i) => (
                    <p key={i} className="mb-2">{p}</p>
                  ))}
                </div>
                {person.biography.length > 300 && (
                  <button
                    onClick={() => setBioExpanded(!bioExpanded)}
                    className="text-xs text-[#D4A853] hover:text-[#B8922F] font-medium flex items-center gap-1 mt-1"
                  >
                    {bioExpanded ? 'Show Less' : 'Read More'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${bioExpanded ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#6b7280] italic">No biography available.</p>
            )}
          </div>
        </div>

        {/* External Profiles (Jikan Cross-Reference) */}
        {(jikanRef || jikanLoading) && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Link2 className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
              <h2 className="text-lg font-bold text-white">External Profiles</h2>
            </div>

            {jikanLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Searching anime databases...
              </div>
            ) : jikanRef ? (
              <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                <div className="flex items-start gap-4">
                  {/* MAL Profile Image */}
                  {jikanRef.imageUrl && (
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-[#050507] border-2 border-[#1e1e28] flex-shrink-0">
                      <img src={jikanRef.imageUrl} alt={jikanRef.name} className="w-full h-full object-cover" onError={(e) => handleImageError(e, 'person')} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{jikanRef.name}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        jikanRef.matchConfidence === 'high' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {jikanRef.matchConfidence === 'high' ? 'Verified Match' : 'Possible Match'}
                      </span>
                      <Wand2 className="w-3 h-3 text-[#D4A853]" strokeWidth={1.5} />
                      <span className="text-[9px] text-[#6b7280]">MyAnimeList</span>
                    </div>
                    {jikanRef.favourites > 0 && (
                      <p className="text-xs text-[#9ca3af] mb-2">
                        <Star className="w-3 h-3 inline text-[#D4A853] fill-[#D4A853]" strokeWidth={0} /> {jikanRef.favourites.toLocaleString()} favourites on MAL
                      </p>
                    )}
                    {jikanRef.about && (
                      <p className="text-xs text-[#6b7280] line-clamp-2 mb-3">
                        {jikanRef.about.replace(/<[^>]*>/g, '').slice(0, 150)}
                      </p>
                    )}
                    <div className="flex gap-3">
                      {jikanRef.malUrl && (
                        <a href={jikanRef.malUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a22] border border-[#2a2a35] rounded-lg text-xs text-white hover:border-[#D4A853]/50 hover:text-[#D4A853] transition-colors">
                          <Wand2 className="w-3 h-3" strokeWidth={1.5} /> MAL Profile
                          <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.5} />
                        </a>
                      )}
                      <a href={`https://myanimelist.net/people/${jikanRef.malId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a22] border border-[#2a2a35] rounded-lg text-xs text-white hover:border-[#D4A853]/50 hover:text-[#D4A853] transition-colors">
                        <Film className="w-3 h-3" strokeWidth={1.5} /> Anime Credits
                        <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.5} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* Anime Credits (when Jikan match found or TV credits exist) */}
        {jikanRef && tvCredits.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Wand2 className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
              <h2 className="text-lg font-bold text-white">Anime & TV Credits</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tvCredits.slice(0, 10).map((credit) => (
                <Link key={`${credit.id}-${credit.character || credit.job}`} href={`/movie/${credit.slug}`} className="group">
                  <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden hover:border-[#3a3a45] transition-colors">
                    <div className="aspect-[2/3] relative overflow-hidden bg-[#050507]">
                      {credit.poster_path ? (
                        <img src={credit.poster_path} alt={credit.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onError={(e) => handleImageError(e, 'poster')} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Tv className="w-8 h-8 text-[#2a2a35]" strokeWidth={1} /></div>
                      )}
                      <div className="absolute top-2 right-2"><span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-500/80 text-white">TV</span></div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                        <span className="text-[9px] font-medium text-[#D4A853] block truncate">{credit.character || credit.job || 'TV'}</span>
                      </div>
                    </div>
                    <div className="p-2">
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#D4A853] transition-colors">{credit.title}</h4>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Credits Section */}
        <section>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-xl font-bold text-white">Filmography</h2>
            <div className="flex items-center gap-2">
              {(['all', 'movie', 'tv'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMediaFilter(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    mediaFilter === type
                      ? 'bg-[#D4A853] text-white'
                      : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                  }`}
                >
                  {type === 'movie' && <Film className="w-3 h-3" strokeWidth={1.5} />}
                  {type === 'tv' && <Tv className="w-3 h-3" strokeWidth={1.5} />}
                  {type === 'all' && <Sparkles className="w-3 h-3" strokeWidth={1.5} />}
                  {type === 'all' ? 'All' : type === 'movie' ? 'Movies' : 'TV'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabConfig.map(({ key, label, icon, count }) => (
              <button
                key={key}
                onClick={() => { setCreditTab(key); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  creditTab === key
                    ? 'bg-[#D4A853] text-white'
                    : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                }`}
              >
                {icon}
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${creditTab === key ? 'bg-white/20' : 'bg-[#1e1e28]'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {filteredCredits.length > 0 ? (
            <div className="space-y-6">
              {sortedYears.map((year) => (
                <div key={year}>
                  <h3 className="text-sm font-bold text-[#D4A853] mb-3 flex items-center gap-2">
                    <span className="w-8 h-px bg-[#D4A853]/30" />
                    {year}
                    <span className="text-[10px] text-[#6b7280] font-normal">({creditsByYear[year].length} {creditsByYear[year].length === 1 ? 'credit' : 'credits'})</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {creditsByYear[year].map((credit) => (
                      <Link key={`${credit.id}-${credit.character || credit.job}`} href={`/movie/${credit.slug}`} className="group">
                        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden hover:border-[#3a3a45] transition-colors">
                          <div className="aspect-[2/3] relative overflow-hidden bg-[#050507]">
                            {credit.poster_path ? (
                              <img src={credit.poster_path} alt={credit.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onError={(e) => handleImageError(e, 'poster')} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-[#2a2a35]" strokeWidth={1} /></div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                              <span className="text-[9px] font-medium text-[#D4A853] block truncate">{credit.character || credit.job || credit.media_type.toUpperCase()}</span>
                            </div>
                            <div className="absolute top-2 right-2">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                credit.media_type === 'tv' ? 'bg-blue-500/80 text-white' : 'bg-[#D4A853]/80 text-white'
                              }`}>
                                {credit.media_type === 'tv' ? 'TV' : 'FILM'}
                              </span>
                            </div>
                          </div>
                          <div className="p-2">
                            <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#D4A853] transition-colors">{credit.title}</h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              {credit.vote_average > 0 && (
                                <span className="text-[10px] text-[#D4A853] flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-[#D4A853]" strokeWidth={0} />
                                  {credit.vote_average.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Film className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-lg text-[#9ca3af] mb-2">No credits found</p>
              <p className="text-sm text-[#6b7280]">Try a different filter or tab</p>
            </div>
          )}
        </section>

        {/* People Also Viewed */}
        {relatedPeople.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
              <h2 className="text-lg font-bold text-white">People Also Viewed</h2>
              <span className="text-xs text-[#6b7280]">Frequent collaborators</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relatedPeople.map((rp) => {
                const rpProfileSrc = resolveImageUrl(rp.profile_path, 'w185');
                const rpIsPlaceholder = !rp.profile_path || rpProfileSrc === PERSON_PLACEHOLDER;
                const rpInitials = getInitials(rp.name);

                return (
                  <Link
                    key={rp.id}
                    href={`/person/${personSlug(rp.name, rp.id)}`}
                    className="group bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden hover:border-[#3a3a45] transition-all"
                  >
                    <div className="aspect-square relative overflow-hidden bg-[#050507]">
                      {rpIsPlaceholder ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a22] to-[#0c0c10]">
                          <span className="text-2xl font-bold text-[#6b7280]">{rpInitials}</span>
                        </div>
                      ) : (
                        <img src={rpProfileSrc} alt={rp.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" onError={(e) => handleImageError(e, 'person')} />
                      )}
                      {/* Shared credits badge */}
                      <div className="absolute top-2 right-2">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#D4A853] text-white">
                          {rp.shared_credits} {rp.shared_credits === 1 ? 'credit' : 'credits'}
                        </span>
                      </div>
                      {/* Department badge */}
                      <div className="absolute top-2 left-2">
                        <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-black/70 text-white">
                          {rp.known_for_department}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#D4A853] transition-colors">{rp.name}</h4>
                      <p className="text-[9px] text-[#6b7280] truncate mt-0.5">
                        {rp.shared_movies.slice(0, 2).join(', ')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        {relatedLoading && (
          <div className="mt-8 flex items-center gap-2 text-sm text-[#6b7280]">
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Finding related people...
          </div>
        )}
      </div>
    </div>
  );
}
