'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp, DollarSign, Globe, Minus,
  Crown, Loader2, BarChart3, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { resolveImageUrl, handleImageError } from '@/lib/utils';

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
  if (value > 0) return <span className="text-emerald-400 inline-flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />+{value}%</span>;
  if (value < 0) return <span className="text-red-400 inline-flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3" strokeWidth={1.5} />{value}%</span>;
  return <span className="text-[#6b7280] inline-flex items-center gap-0.5"><Minus className="w-3 h-3" strokeWidth={1.5} />0%</span>;
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
      const res = await fetch(`/api/box-office?${params.toString()}`, { cache: 'no-store' });
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
    { key: 'this-week', label: 'This Week', icon: <TrendingUp className="w-4 h-4" strokeWidth={1.5} /> },
    { key: 'top-all-time', label: 'Top All Time', icon: <Crown className="w-4 h-4" strokeWidth={1.5} /> },
    { key: 'by-country', label: 'By Country', icon: <Globe className="w-4 h-4" strokeWidth={1.5} /> },
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
              <div className="w-10 h-10 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#D4A853]" strokeWidth={1.5} />
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
                  ? 'border-[#D4A853] text-white'
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
              <Globe className="w-4 h-4 text-[#6b7280]" strokeWidth={1.5} />
              <span className="text-sm text-[#6b7280] font-medium">Select Country</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCountry === country.code
                      ? 'bg-[#D4A853] text-white'
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
              <BarChart3 className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
              <p className="text-xs text-[#9ca3af]">
                Rankings update hourly
              </p>
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
              <p className="text-xs text-[#6b7280]">
                Curated rankings · Connect your API keys for live box office data
              </p>
            </>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#D4A853] animate-spin" strokeWidth={1.5} />
            <span className="ml-3 text-[#6b7280]">Loading box office data...</span>
          </div>
        )}

        {/* Box Office Rankings */}
        {!isLoading && entries.length > 0 && (
          <>
            {/* Top 3 Highlight Cards */}
            {activeTab !== 'top-all-time' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {entries.slice(0, 3).map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.slug ? `/movie/${entry.slug}` : '#'}
                    className="group relative bg-gradient-to-br from-[#D4A853]/10 to-[#D4A853]/5 border border-[#D4A853]/20 rounded-xl p-5 hover:border-[#D4A853]/40 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#D4A853] flex items-center justify-center text-white font-bold text-sm">
                        {entry.rank}
                      </div>
                      {entry.rank === 1 && <Crown className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />}
                    </div>
                    <div className="flex gap-3">
                      <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                        <img
                          src={resolveImageUrl(entry.poster_path, 'w500')}
                          alt={entry.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/poster-1.jpg'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white group-hover:text-[#D4A853] transition-colors leading-snug truncate">
                          {entry.title}
                        </h3>
                        <p className="text-xs text-[#6b7280] mt-0.5">{entry.year}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm font-semibold text-[#D4A853]">{formatCurrency(entry.weekendGross)}</span>
                          <span className="text-xs text-[#6b7280]">wknd</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-white">{formatCurrency(entry.totalGross)}</span>
                          <span className="text-[10px] text-[#6b7280]">total</span>
                          <span className="text-[10px] text-[#6b7280] ml-1">{entry.weeks}wk</span>
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
                      entry.rank === 1 ? 'from-[#D4A853]/10 to-[#D4A853]/5 border-[#D4A853]/30' :
                      entry.rank === 2 ? 'from-[#c0c0c0]/10 to-[#c0c0c0]/5 border-[#c0c0c0]/30' :
                      'from-[#cd7f32]/10 to-[#cd7f32]/5 border-[#cd7f32]/30'
                    } border rounded-xl p-5 hover:shadow-xl transition-all`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {entry.rank === 1 ? <Crown className="w-6 h-6 text-[#D4A853]" strokeWidth={1.5} /> :
                       <span className="text-xl font-extrabold text-[#9ca3af]">{entry.rank}</span>}
                    </div>
                    <div className="flex gap-3">
                      <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                        <img
                          src={resolveImageUrl(entry.poster_path, 'w500')}
                          alt={entry.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/poster-1.jpg'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white group-hover:text-[#D4A853] transition-colors leading-snug truncate">
                          {entry.title}
                        </h3>
                        <p className="text-xs text-[#6b7280] mt-0.5">{entry.year}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-semibold text-[#D4A853]">{formatCurrency(entry.totalGross)}</span>
                          <span className="text-xs text-[#6b7280]">worldwide</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* ===== DESKTOP TABLE (md+ only) ===== */}
            <div className="hidden md:block bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-x-auto">
              <table className="w-full border-collapse min-w-[780px]">
                {/* Table Header */}
                <thead>
                  <tr className="border-b border-[#1e1e28] bg-[#050507]/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-[56px]">Rank</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Movie</th>
                    {activeTab === 'top-all-time' ? (
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-[150px]">Total Gross</th>
                    ) : (
                      <>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-[120px]">Weekend</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-[120px]">Total</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-[70px]">Wks</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-[90px]">Change</th>
                      </>
                    )}
                  </tr>
                </thead>
                {/* Table Body */}
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-[#2a2a35]/50 hover:bg-[#111118] transition-colors"
                    >
                      {/* Rank */}
                      <td className="px-5 py-3">
                        <span className={`text-lg font-bold ${entry.rank <= 3 ? 'text-[#D4A853]' : 'text-[#6b7280]'}`}>
                          {entry.rank}
                        </span>
                      </td>
                      {/* Movie */}
                      <td className="px-3 py-3">
                        <Link
                          href={entry.slug ? `/movie/${entry.slug}` : '#'}
                          className="group flex items-center gap-3"
                        >
                          <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                            <img
                              src={resolveImageUrl(entry.poster_path, 'w500')}
                              alt={entry.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/images/poster-1.jpg'; }}
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-white group-hover:text-[#D4A853] transition-colors truncate max-w-[300px]">
                              {entry.title}
                            </h3>
                            <span className="text-xs text-[#6b7280]">{entry.year}</span>
                          </div>
                        </Link>
                      </td>
                      {activeTab === 'top-all-time' ? (
                        <td className="px-5 py-3 text-right">
                          <span className="text-sm font-semibold text-[#D4A853]">{formatCurrency(entry.totalGross)}</span>
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm font-medium text-white">{formatCurrency(entry.weekendGross)}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm font-semibold text-[#D4A853]">{formatCurrency(entry.totalGross)}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm text-[#9ca3af]">{entry.weeks}wk{entry.weeks !== 1 ? 's' : ''}</span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-medium">
                            <ChangeIndicator value={entry.changePct} />
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ===== MOBILE CARDS (below md) ===== */}
            <div className="md:hidden bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
              <div className="divide-y divide-[#2a2a35]/50">
                {entries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.slug ? `/movie/${entry.slug}` : '#'}
                    className="group block"
                  >
                    <div className="flex gap-3 px-4 py-3 hover:bg-[#111118] transition-colors">
                      {/* Rank */}
                      <div className="flex flex-col items-center justify-start pt-1 w-9 flex-shrink-0">
                        <span className={`text-lg font-bold ${entry.rank <= 3 ? 'text-[#D4A853]' : 'text-[#6b7280]'}`}>
                          {entry.rank}
                        </span>
                      </div>
                      {/* Poster */}
                      <div className="w-12 h-[68px] rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                        <img
                          src={resolveImageUrl(entry.poster_path, 'w500')}
                          alt={entry.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/poster-1.jpg'; }}
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#D4A853] transition-colors truncate">
                          {entry.title}
                        </h3>
                        <span className="text-xs text-[#6b7280]">{entry.year}</span>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                          {activeTab === 'top-all-time' ? (
                            <span className="text-sm font-semibold text-[#D4A853]">{formatCurrency(entry.totalGross)}</span>
                          ) : (
                            <>
                              <span className="text-xs"><span className="text-[#6b7280]">Wknd </span><span className="text-white font-medium">{formatCurrency(entry.weekendGross)}</span></span>
                              <span className="text-xs"><span className="text-[#6b7280]">Total </span><span className="text-[#D4A853] font-semibold">{formatCurrency(entry.totalGross)}</span></span>
                              <span className="text-xs text-[#9ca3af]">{entry.weeks}wk{entry.weeks !== 1 ? 's' : ''}</span>
                              <span className="text-xs font-medium"><ChangeIndicator value={entry.changePct} /></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <div className="mt-6 text-center">
              <p className="text-xs text-[#6b7280]">
                Rankings update hourly ·{' '}
                {activeTab === 'by-country' && `${selectedCountryFlag} ${selectedCountryName} · `}
                Data sourced{' '}
              </p>
            </div>
          </>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="text-center py-24">
            <DollarSign className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-lg text-[#9ca3af] mb-2">No box office data available</p>
            <p className="text-sm text-[#6b7280]">Check back later for updated rankings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
