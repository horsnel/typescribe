'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp, DollarSign, Globe, ChevronUp, ChevronDown, Minus,
  Crown, Loader2, Zap, BarChart3, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BoxOfficeEntry {
  rank: number;
  id: number;
  slug: string;
  title: string;
  year: string;
  poster_path: string;
  weekendGross: number;
  totalGross: number;
  weeks: number;
  changePct: number | null;
}

type Tab = 'this-week' | 'top-all-time' | 'by-country';

const COUNTRIES = [
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'CN', flag: '🇨🇳', name: 'China' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'SE', flag: '🇸🇪', name: 'Sweden' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
];

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#6b7280]">NEW</span>;
  if (value > 0) return <span className="text-emerald-400 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />+{value}%</span>;
  if (value < 0) return <span className="text-red-400 flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3" />{value}%</span>;
  return <span className="text-[#6b7280] flex items-center gap-0.5"><Minus className="w-3 h-3" />0%</span>;
}

export default function BoxOfficePage() {
  const [activeTab, setActiveTab] = useState<Tab>('this-week');
  const [entries, setEntries] = useState<BoxOfficeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fromAPI, setFromAPI] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('US');

  const fetchBoxOffice = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ tab: activeTab });
      if (activeTab === 'by-country') {
        params.set('country', selectedCountry);
      }
      const res = await fetch(`/api/box-office?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setFromAPI(data.fromAPI || false);
      }
    } catch {
      setFromAPI(false);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedCountry]);

  useEffect(() => {
    fetchBoxOffice();
  }, [fetchBoxOffice]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'this-week', label: 'This Week', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'top-all-time', label: 'Top All Time', icon: <Crown className="w-4 h-4" /> },
    { key: 'by-country', label: 'By Country', icon: <Globe className="w-4 h-4" /> },
  ];

  const selectedCountryName = COUNTRIES.find(c => c.code === selectedCountry)?.name || 'United States';
  const selectedCountryFlag = COUNTRIES.find(c => c.code === selectedCountry)?.flag || '🇺🇸';

  return (
    <div className="min-h-screen bg-[#050507] pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#d4a853]/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#d4a853]" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Box Office</h1>
            </div>
            <p className="text-[#6b7280]">Real-time box office rankings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-[#1e1e28] pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#d4a853] text-white'
                  : 'border-transparent text-[#6b7280] hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Country selector for By Country tab */}
        {activeTab === 'by-country' && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-4 h-4 text-[#6b7280]" />
              <span className="text-sm text-[#6b7280] font-medium">Select Country</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCountry === country.code
                      ? 'bg-[#d4a853] text-white'
                      : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                  }`}
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Data freshness indicator */}
        <div className="mb-6 flex items-center gap-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg px-4 py-2.5">
          {fromAPI ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-xs text-[#9ca3af]">
                Live Data · Rankings update hourly
              </p>
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4 text-[#d4a853]" />
              <p className="text-xs text-[#6b7280]">
                Curated rankings · Connect your API keys for live box office data
              </p>
            </>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#d4a853] animate-spin" />
            <span className="ml-3 text-[#6b7280]">Loading box office data...</span>
          </div>
        )}

        {/* Box Office Table */}
        {!isLoading && entries.length > 0 && (
          <>
            {/* Top 3 Highlight Cards */}
            {activeTab !== 'top-all-time' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {entries.slice(0, 3).map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.slug ? `/movie/${entry.slug}` : '#'}
                    className="group relative bg-gradient-to-br from-[#d4a853]/10 to-[#d4a853]/5 border border-[#d4a853]/20 rounded-xl p-5 hover:border-[#d4a853]/40 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#d4a853] flex items-center justify-center text-white font-bold text-sm">
                        {entry.rank}
                      </div>
                      {entry.rank === 1 && <Crown className="w-5 h-5 text-[#f5c518]" />}
                    </div>
                    <div className="flex gap-3">
                      <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                        <img
                          src={entry.poster_path}
                          alt={entry.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/poster-1.jpg'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white group-hover:text-[#d4a853] transition-colors leading-snug truncate">
                          {entry.title}
                        </h3>
                        <p className="text-xs text-[#6b7280] mt-0.5">{entry.year}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-semibold text-[#f5c518]">{formatCurrency(entry.weekendGross)}</span>
                          <span className="text-xs text-[#6b7280]">weekend</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Top 3 Highlight Cards for All Time */}
            {activeTab === 'top-all-time' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {entries.slice(0, 3).map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.slug ? `/movie/${entry.slug}` : '#'}
                    className={`group relative bg-gradient-to-br ${
                      entry.rank === 1 ? 'from-[#f5c518]/10 to-[#f5c518]/5 border-[#f5c518]/30' :
                      entry.rank === 2 ? 'from-[#c0c0c0]/10 to-[#c0c0c0]/5 border-[#c0c0c0]/30' :
                      'from-[#cd7f32]/10 to-[#cd7f32]/5 border-[#cd7f32]/30'
                    } border rounded-xl p-5 hover:shadow-xl transition-all`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {entry.rank === 1 ? <Crown className="w-6 h-6 text-[#f5c518]" /> :
                       <span className="text-xl font-extrabold text-[#9ca3af]">{entry.rank}</span>}
                    </div>
                    <div className="flex gap-3">
                      <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                        <img
                          src={entry.poster_path}
                          alt={entry.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/poster-1.jpg'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white group-hover:text-[#d4a853] transition-colors leading-snug truncate">
                          {entry.title}
                        </h3>
                        <p className="text-xs text-[#6b7280] mt-0.5">{entry.year}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-semibold text-[#f5c518]">{formatCurrency(entry.totalGross)}</span>
                          <span className="text-xs text-[#6b7280]">worldwide</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Full Table */}
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="grid items-center gap-4 px-5 py-3 border-b border-[#1e1e28] text-xs font-semibold text-[#6b7280] uppercase tracking-wider bg-[#050507]/50">
                <div className="grid items-center gap-4" style={{ gridTemplateColumns: '48px 1fr 120px 120px 80px 80px' }}>
                  <span>Rank</span>
                  <span>Movie</span>
                  {activeTab === 'top-all-time' ? (
                    <span className="text-right">Total Gross</span>
                  ) : (
                    <>
                      <span className="text-right">Weekend</span>
                      <span className="text-right">Total Gross</span>
                      <span className="text-right">Weeks</span>
                      <span className="text-right">Change</span>
                    </>
                  )}
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-[#2a2a35]/50">
                {entries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.slug ? `/movie/${entry.slug}` : '#'}
                    className="grid items-center gap-4 px-5 py-3 hover:bg-[#111118] transition-colors group"
                    style={{ gridTemplateColumns: activeTab === 'top-all-time' ? '48px 1fr 120px' : '48px 1fr 120px 120px 80px 80px' }}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center">
                      <span className={`text-lg font-bold ${entry.rank <= 3 ? 'text-[#f5c518]' : 'text-[#6b7280]'}`}>
                        {entry.rank}
                      </span>
                    </div>

                    {/* Movie Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                        <img
                          src={entry.poster_path}
                          alt={entry.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/poster-1.jpg'; }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#d4a853] transition-colors truncate">
                          {entry.title}
                        </h3>
                        <span className="text-xs text-[#6b7280]">{entry.year}</span>
                      </div>
                    </div>

                    {activeTab === 'top-all-time' ? (
                      /* Total Gross (All Time) */
                      <div className="text-right">
                        <span className="text-sm font-semibold text-[#f5c518]">{formatCurrency(entry.totalGross)}</span>
                      </div>
                    ) : (
                      <>
                        {/* Weekend Gross */}
                        <div className="text-right">
                          <span className="text-sm font-medium text-white">{formatCurrency(entry.weekendGross)}</span>
                        </div>

                        {/* Total Gross */}
                        <div className="text-right">
                          <span className="text-sm font-semibold text-[#f5c518]">{formatCurrency(entry.totalGross)}</span>
                        </div>

                        {/* Weeks */}
                        <div className="text-right">
                          <span className="text-sm text-[#9ca3af]">{entry.weeks}wk{entry.weeks !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Change */}
                        <div className="text-right text-sm font-medium">
                          <ChangeIndicator value={entry.changePct} />
                        </div>
                      </>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <div className="mt-6 text-center">
              <p className="text-xs text-[#6b7280]">
                Rankings update hourly ·{' '}
                {activeTab === 'by-country' && `${selectedCountryFlag} ${selectedCountryName} · `}
                {fromAPI ? 'Live' : 'Curated'}
              </p>
            </div>
          </>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="text-center py-24">
            <DollarSign className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" />
            <p className="text-lg text-[#9ca3af] mb-2">No box office data available</p>
            <p className="text-sm text-[#6b7280]">Check back later for updated rankings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
