'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Grid3X3, List, X, SlidersHorizontal, Film, Tv,
  ChevronDown, Globe, Sparkles, Star, TrendingUp, Clock, Loader2, Zap, Wand2,
} from 'lucide-react';
import { movies, genres } from '@/lib/data';
import { COUNTRIES, GENRES, THEMES, SORT_OPTIONS, getCountryLabel } from '@/lib/browse-config';
import type { MediaFormat, BrowseFilters, Movie } from '@/lib/types';
import MovieCard from '@/components/movie/MovieCard';
import { Button } from '@/components/ui/button';

type ViewMode = 'grid' | 'list';

export default function BrowsePage() {
  const [view, setView] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<BrowseFilters>({
    format: 'all',
    country: 'all',
    genres: [],
    theme: null,
    sort: 'popularity.desc',
    minRating: 0,
    yearFrom: 1990,
    yearTo: 2026,
  });
  const [query, setQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [countryExpanded, setCountryExpanded] = useState(false);
  const [genreExpanded, setGenreExpanded] = useState(false);
  const [themeExpanded, setThemeExpanded] = useState(false);

  // ─── API Integration State ───
  const [apiMovies, setApiMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fromAPI, setFromAPI] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch from API when filters change
  const fetchFromAPI = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.format !== 'all') params.set('format', filters.format);
      if (filters.country !== 'all') params.set('country', filters.country);
      if (filters.genres.length > 0) params.set('genres', filters.genres.join(','));
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.minRating > 0) params.set('minRating', String(filters.minRating));
      if (filters.yearFrom !== 1990) params.set('yearFrom', String(filters.yearFrom));
      if (filters.yearTo !== 2026) params.set('yearTo', String(filters.yearTo));
      params.set('page', String(currentPage));

      const res = await fetch(`/api/browse?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setApiMovies(data.movies || []);
        setFromAPI(data.fromAPI || false);
        setTotalPages(data.totalPages || 1);
        setTotalResults(data.totalResults || 0);
      }
    } catch (err) {
      console.warn('[Browse] API fetch failed, using mock data', err);
      setFromAPI(false);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchFromAPI();
  }, [fetchFromAPI]);

  // ─── Filter Handlers ───

  const updateFilter = <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleGenre = (id: number) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(id) ? prev.genres.filter((g) => g !== id) : [...prev.genres, id],
    }));
  };

  const clearAll = () => {
    setFilters({
      format: 'all',
      country: 'all',
      genres: [],
      theme: null,
      sort: 'popularity.desc',
      minRating: 0,
      yearFrom: 1990,
      yearTo: 2026,
    });
    setQuery('');
  };

  const hasActiveFilters =
    filters.format !== 'all' ||
    filters.country !== 'all' ||
    filters.genres.length > 0 ||
    filters.theme !== null ||
    filters.minRating > 0 ||
    filters.yearFrom !== 1990 ||
    filters.yearTo !== 2026 ||
    query !== '';

  // ─── Displayed Countries ───

  const displayedCountries = countryExpanded ? COUNTRIES : COUNTRIES.slice(0, 8);
  const displayedGenres = genreExpanded ? GENRES : GENRES.slice(0, 10);
  const displayedThemes = themeExpanded ? THEMES : THEMES.slice(0, 5);

  // ─── Filtering Logic ───
  // When API is connected (fromAPI=true), the server handles filtering.
  // When using mock data, we filter client-side.

  const filtered = useMemo(() => {
    // If API returned data, use it directly (already filtered server-side)
    if (fromAPI && apiMovies.length > 0) {
      // Only apply text search client-side on API results
      if (!query) return apiMovies;
      const q = query.toLowerCase();
      return apiMovies.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.overview.toLowerCase().includes(q)
      );
    }

    // ─── Mock data client-side filtering ───
    let result = [...movies];

    // Text search
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.director.toLowerCase().includes(q) ||
          m.overview.toLowerCase().includes(q)
      );
    }

    // Format filter
    if (filters.format !== 'all') {
      result = result.filter((m) => m.media_type === filters.format);
    }

    // Country filter
    if (filters.country !== 'all') {
      const countryLangMap: Record<string, string[]> = {
        KR: ['ko'], NG: ['ig', 'yo', 'ha'], US: ['en'], GB: ['en'],
        IN: ['hi', 'ta', 'te'], JP: ['ja'], CN: ['zh', 'cmn'],
        TH: ['th'], ZA: ['en', 'af', 'zu'], TR: ['tr'],
        MX: ['es'], BR: ['pt'], PH: ['fil', 'tl'], FR: ['fr'],
      };
      const langs = countryLangMap[filters.country] || [];
      if (langs.length > 0) {
        result = result.filter((m) => langs.includes(m.original_language));
      }
    }

    // Genre filter
    if (filters.genres.length > 0) {
      result = result.filter((m) =>
        m.genres.some((g) => filters.genres.includes(g.id))
      );
    }

    // Rating filter
    if (filters.minRating > 0) {
      result = result.filter((m) => m.vote_average >= filters.minRating);
    }

    // Year range filter
    result = result.filter((m) => {
      const year = parseInt(m.release_date.split('-')[0]);
      return year >= filters.yearFrom && year <= filters.yearTo;
    });

    // Sort
    switch (filters.sort) {
      case 'popularity.desc':
        result.sort((a, b) => b.vote_count - a.vote_count);
        break;
      case 'popularity.asc':
        result.sort((a, b) => a.vote_count - b.vote_count);
        break;
      case 'vote_average.desc':
        result.sort((a, b) => b.vote_average - a.vote_average);
        break;
      case 'vote_average.asc':
        result.sort((a, b) => a.vote_average - b.vote_average);
        break;
      case 'primary_release_date.desc':
        result.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
        break;
      case 'primary_release_date.asc':
        result.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
        break;
      case 'title.asc':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'revenue.desc':
        result.sort((a, b) => b.revenue - a.revenue);
        break;
    }

    return result;
  }, [query, filters, fromAPI, apiMovies]);

  // ─── Active Filter Tags ───

  const activeFilterTags = useMemo(() => {
    const tags: { label: string; onRemove: () => void }[] = [];
    if (filters.format !== 'all') {
      tags.push({
        label: filters.format === 'anime' ? 'Anime' : filters.format === 'movie' ? 'Movies' : 'TV Series',
        onRemove: () => updateFilter('format', 'all'),
      });
    }
    if (filters.country !== 'all') {
      const country = COUNTRIES.find((c) => c.code === filters.country);
      tags.push({
        label: country ? `${country.flag} ${country.movieLabel}` : filters.country,
        onRemove: () => updateFilter('country', 'all'),
      });
    }
    filters.genres.forEach((gid) => {
      const genre = GENRES.find((g) => g.id === gid);
      if (genre) {
        tags.push({
          label: genre.name,
          onRemove: () => toggleGenre(gid),
        });
      }
    });
    if (filters.theme !== null) {
      const theme = THEMES.find((t) => t.id === filters.theme);
      if (theme) {
        tags.push({
          label: `Theme: ${theme.name}`,
          onRemove: () => updateFilter('theme', null),
        });
      }
    }
    if (filters.minRating > 0) {
      tags.push({
        label: `Rating: ${filters.minRating}+`,
        onRemove: () => updateFilter('minRating', 0),
      });
    }
    if (query) {
      tags.push({
        label: `"${query}"`,
        onRemove: () => setQuery(''),
      });
    }
    return tags;
  }, [filters, query]);

  return (
    <div className="min-h-screen bg-[#050507] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-1">Discover</h1>
            <p className="text-[#6b7280]">
              {filtered.length} title{filtered.length !== 1 ? 's' : ''} found
              {filters.country !== 'all' && ` · ${getCountryLabel(filters.country, filters.format === 'tv' ? 'tv' : 'movie')}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, directors..."
                className="w-full sm:w-64 bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] text-sm"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className={`border-[#1e1e28] bg-transparent text-white hover:bg-[#111118] hover:text-white gap-2 ${advancedOpen ? 'border-[#d4a853]' : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">More</span>
            </Button>
            <div className="hidden sm:flex items-center border border-[#1e1e28] rounded-lg overflow-hidden">
              <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            INLINE FILTER BAR — Format + compact Genre chips
            ═══════════════════════════════════════════════════════ */}
        <div className="bg-[#050507]/95 backdrop-blur-md border-b border-[#1e1e28] -mx-4 sm:-mx-6 lg:-mx-12 px-4 sm:px-6 lg:px-12 py-4 mb-8 space-y-4">

          {/* ─── Format Toggle ─── */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-16">Format</span>
            <div className="flex items-center border border-[#1e1e28] rounded-lg overflow-hidden">
              <button
                onClick={() => updateFilter('format', 'all')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  filters.format === 'all' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white hover:bg-[#111118]'
                }`}
              >
                <Sparkles className="w-4 h-4" /> All
              </button>
              <button
                onClick={() => updateFilter('format', 'movie')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  filters.format === 'movie' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white hover:bg-[#111118]'
                }`}
              >
                <Film className="w-4 h-4" /> Movies
              </button>
              <button
                onClick={() => updateFilter('format', 'tv')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  filters.format === 'tv' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white hover:bg-[#111118]'
                }`}
              >
                <Tv className="w-4 h-4" /> Series
              </button>
              <button
                onClick={() => updateFilter('format', 'anime')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  filters.format === 'anime' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white hover:bg-[#111118]'
                }`}
              >
                <Wand2 className="w-4 h-4" /> Anime
              </button>
            </div>
          </div>

          {/* ─── Compact Genre Chips ─── */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-16">Genre</span>
              <div className="flex items-center gap-2 flex-wrap">
                {GENRES.slice(0, 8).map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filters.genres.includes(genre.id)
                        ? 'bg-[#d4a853] text-white'
                        : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                    }`}
                  >
                    {genre.name}
                  </button>
                ))}
                <button
                  onClick={() => setAdvancedOpen(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-[#6b7280] hover:text-white bg-[#0c0c10] border border-[#1e1e28] hover:border-[#3a3a45] flex items-center gap-1 transition-colors"
                >
                  More <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SLIDE-OVER PANEL — Country, Theme, Sort, Rating, Year
            ═══════════════════════════════════════════════════════ */}
        {advancedOpen && (
          <>
            {/* Dimmed overlay */}
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setAdvancedOpen(false)}
            />
            {/* Slide-over panel */}
            <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[#0c0c10] border-l border-[#1e1e28] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col">
              {/* Panel header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e28]">
                <h3 className="text-lg font-bold text-white">Advanced Filters</h3>
                <button
                  onClick={() => setAdvancedOpen(false)}
                  className="p-2 text-[#6b7280] hover:text-white transition-colors rounded-lg hover:bg-[#111118]"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6" style={{ maxHeight: '80vh' }}>

                {/* ─── Country Chips ─── */}
                <div>
                  <h4 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Country</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => updateFilter('country', 'all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        filters.country === 'all'
                          ? 'bg-[#d4a853] text-white'
                          : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" /> All Countries
                    </button>
                    {displayedCountries.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => updateFilter('country', filters.country === country.code ? 'all' : country.code)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          filters.country === country.code
                            ? 'bg-[#d4a853] text-white'
                            : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                        }`}
                      >
                        <span>{country.flag}</span>
                        <span>{filters.format === 'tv' ? country.seriesLabel : country.movieLabel}</span>
                      </button>
                    ))}
                    {COUNTRIES.length > 8 && (
                      <button
                        onClick={() => setCountryExpanded(!countryExpanded)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-[#6b7280] hover:text-white bg-[#050507] border border-[#1e1e28] hover:border-[#3a3a45] flex items-center gap-1 transition-colors"
                      >
                        {countryExpanded ? 'Less' : 'More'} <ChevronDown className={`w-3 h-3 transition-transform ${countryExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ─── Full Genre Chips ─── */}
                <div>
                  <h4 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Genre</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {displayedGenres.map((genre) => (
                      <button
                        key={genre.id}
                        onClick={() => toggleGenre(genre.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          filters.genres.includes(genre.id)
                            ? 'bg-[#d4a853] text-white'
                            : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                        }`}
                      >
                        {genre.name}
                      </button>
                    ))}
                    {GENRES.length > 10 && (
                      <button
                        onClick={() => setGenreExpanded(!genreExpanded)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-[#6b7280] hover:text-white bg-[#050507] border border-[#1e1e28] hover:border-[#3a3a45] flex items-center gap-1 transition-colors"
                      >
                        {genreExpanded ? 'Less' : 'More'} <ChevronDown className={`w-3 h-3 transition-transform ${genreExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ─── Theme Chips ─── */}
                <div>
                  <h4 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
                    Theme
                    <span className="ml-1 text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">BETA</span>
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {filters.theme !== null && (
                      <button
                        onClick={() => updateFilter('theme', null)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors"
                      >
                        All Themes
                      </button>
                    )}
                    {displayedThemes.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => updateFilter('theme', filters.theme === theme.id ? null : theme.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          filters.theme === theme.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                        }`}
                      >
                        {theme.name}
                      </button>
                    ))}
                    {THEMES.length > 5 && (
                      <button
                        onClick={() => setThemeExpanded(!themeExpanded)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-[#6b7280] hover:text-white bg-[#050507] border border-[#1e1e28] hover:border-[#3a3a45] flex items-center gap-1 transition-colors"
                      >
                        {themeExpanded ? 'Less' : 'More'} <ChevronDown className={`w-3 h-3 transition-transform ${themeExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ─── Sort ─── */}
                <div>
                  <h4 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Sort By</h4>
                  <select
                    value={filters.sort}
                    onChange={(e) => updateFilter('sort', e.target.value)}
                    className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#d4a853]"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* ─── Rating ─── */}
                <div>
                  <h4 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Minimum Rating</h4>
                  <select
                    value={filters.minRating}
                    onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
                    className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#d4a853]"
                  >
                    <option value={0}>Any</option>
                    <option value={5}>5+</option>
                    <option value={6}>6+</option>
                    <option value={7}>7+</option>
                    <option value={8}>8+</option>
                    <option value={9}>9+</option>
                  </select>
                </div>

                {/* ─── Year Range ─── */}
                <div>
                  <h4 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Year Range</h4>
                  <div className="flex items-center gap-3">
                    <select
                      value={filters.yearFrom}
                      onChange={(e) => updateFilter('yearFrom', parseInt(e.target.value))}
                      className="flex-1 bg-[#050507] border border-[#1e1e28] rounded-lg py-2 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#d4a853]"
                    >
                      {[1990, 2000, 2005, 2010, 2015, 2020, 2022, 2023, 2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <span className="text-sm text-[#6b7280]">–</span>
                    <select
                      value={filters.yearTo}
                      onChange={(e) => updateFilter('yearTo', parseInt(e.target.value))}
                      className="flex-1 bg-[#050507] border border-[#1e1e28] rounded-lg py-2 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#d4a853]"
                    >
                      {[2026, 2025, 2024, 2023, 2022, 2020, 2015, 2010, 2000, 1990].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Panel footer */}
              <div className="px-6 py-4 border-t border-[#1e1e28] flex items-center justify-between">
                <button onClick={clearAll} className="text-sm text-[#6b7280] hover:text-white underline">
                  Clear all
                </button>
                <Button
                  onClick={() => setAdvancedOpen(false)}
                  className="bg-[#d4a853] hover:bg-[#b8922e] text-white"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ─── Active Filter Tags ─── */}
        {activeFilterTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-xs text-[#6b7280]">Active filters:</span>
            {activeFilterTags.map((tag, i) => (
              <button
                key={i}
                onClick={tag.onRemove}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#d4a853]/10 text-[#d4a853] border border-[#d4a853]/20 hover:bg-[#d4a853]/20 transition-colors"
              >
                {tag.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button onClick={clearAll} className="text-xs text-[#6b7280] hover:text-white underline">
              Clear all
            </button>
          </div>
        )}

        {/* ─── Data Freshness Indicator ─── */}
        <div className="mb-6 flex items-center gap-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg px-4 py-2.5">
          {fromAPI ? (
            <>
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-[#9ca3af]">
                {totalResults.toLocaleString()} titles available
              </p>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#d4a853]" />
              <p className="text-xs text-[#6b7280]">
                Curated collection · Connect your API keys for real-time data across all genres and regions
              </p>
            </>
          )}
        </div>

        {/* ─── Loading State ─── */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#d4a853] animate-spin" />
            <span className="ml-3 text-[#6b7280]">Loading...</span>
          </div>
        )}

        {/* ═══════════════════════════════════════
            Results Grid / List
            ═══════════════════════════════════════ */}
        {!isLoading && filtered.length > 0 ? (
          view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.slug}`}
                  className="flex items-center gap-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 hover:border-[#3a3a45] transition-colors group"
                >
                  <div className="w-12 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                    <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#d4a853] transition-colors truncate">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#f5c518] font-medium flex items-center gap-0.5"><Star className="w-3 h-3 fill-[#f5c518]" /> {movie.vote_average.toFixed(1)}</span>
                      <span className="text-xs text-[#6b7280]">{movie.release_date.split('-')[0]}</span>
                      <span className="text-xs text-[#6b7280]">{movie.runtime}m</span>
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      {movie.genres.map((g) => (
                        <span key={g.id} className="text-[10px] text-[#6b7280] bg-[#050507] px-1.5 py-0.5 rounded">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    {filters.country !== 'all' && (
                      <span className="text-xs text-[#6b7280] bg-[#050507] px-2 py-1 rounded">
                        {movie.original_language.toUpperCase()}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : !isLoading ? (
          <div className="text-center py-24">
            <Film className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" />
            <p className="text-lg text-[#9ca3af] mb-2">No titles match your filters</p>
            <p className="text-sm text-[#6b7280] mb-4">Try adjusting your country, genre, or format selection.</p>
            <button onClick={clearAll} className="text-[#d4a853] hover:underline font-medium">Clear all filters</button>
          </div>
        ) : null}

        {/* ─── Browse Architecture Info ─── */}
        {filters.country !== 'all' && (
          <div className="mt-10 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">
                  {COUNTRIES.find((c) => c.code === filters.country)?.flag}{' '}
                  {getCountryLabel(filters.country, filters.format === 'tv' ? 'tv' : 'movie')}
                </h3>
                <p className="text-sm text-[#6b7280]">
                  {COUNTRIES.find((c) => c.code === filters.country)?.whyInclude}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="text-[10px] bg-[#050507] border border-[#1e1e28] rounded px-2 py-1 text-[#9ca3af]">
                    /discover/{filters.format === 'tv' ? 'tv' : 'movie'}?with_origin_country={filters.country}
                    {filters.genres.length > 0 && `&with_genres=${filters.genres.join(',')}`}
                    &sort_by={filters.sort}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
