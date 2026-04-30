'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, Database, Key, Activity, Users, Film, Eye,
  BarChart3, ArrowRight, Lock, Loader2, CheckCircle, XCircle,
  RefreshCw, AlertTriangle, Globe, Clock, Zap, Cpu,
  ChevronDown, ChevronUp, ExternalLink, Wifi, WifiOff,
  Image as ImageIcon, Brain, Newspaper, Tv, Search,
  Server, HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ───

interface ScraperMeta {
  url: string;
  provides: string;
  region: string;
}

interface ScraperHealth {
  name: string;
  tier: 'a' | 'b' | 'c';
  status: 'healthy' | 'degraded' | 'down' | 'disabled';
  lastSuccess: string | null;
  lastFailure: string | null;
  consecutiveFailures: number;
  totalRequests: number;
  successRate: number;
  avgResponseMs: number;
  circuitState: 'closed' | 'open' | 'half_open';
  cooldownRemainingMs: number;
  enabled: boolean;
  meta: ScraperMeta;
}

interface ApiClient {
  key: string;
  url: string;
  provides: string;
  freeLimit: string;
  configured: boolean;
  dailyUsage?: { used: number; limit: number; remaining: number };
}

interface AdminHealthData {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
  scrapers: ScraperHealth[];
  apis: ApiClient[];
  scrapingAnt: {
    configured: boolean;
    totalRequests: number;
    successRate: number;
    totalUsed: number;
    totalRemaining: number;
    activeKeys: number;
    keyStats: any;
  };
  omdbDaily: { used: number; limit: number; remaining: number };
  cache: { totalEntries: number; hitRate: number; avgCompleteness: number };
  scrapingBee: { configured: boolean; totalRequests: number; successRate: number; dailyCredits: { used: number; limit: number; remaining: number } };
}

// ─── Helpers ───

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case 'healthy': return 'text-emerald-400';
    case 'degraded': return 'text-amber-400';
    case 'down': case 'critical': return 'text-red-400';
    case 'disabled': return 'text-[#4a4a5a]';
    default: return 'text-[#6b7280]';
  }
}

function statusDot(status: string): string {
  switch (status) {
    case 'healthy': return 'bg-emerald-400';
    case 'degraded': return 'bg-amber-400';
    case 'down': case 'critical': return 'bg-red-400';
    default: return 'bg-[#4a4a5a]';
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'healthy': return 'bg-emerald-500/5 border-emerald-500/15';
    case 'degraded': return 'bg-amber-500/5 border-amber-500/15';
    case 'down': case 'critical': return 'bg-red-500/5 border-red-500/15';
    default: return 'bg-[#0c0c10] border-[#1e1e28]';
  }
}

function tierLabel(tier: string): string {
  switch (tier) {
    case 'a': return 'Tier A — Primary: Free Direct-Fetch';
    case 'b': return 'Tier B — Fallback: ScrapingAnt-Dependent';
    case 'c': return 'Tier C — Fallback: Premium ScrapingAnt';
    default: return `Tier ${tier}`;
  }
}

function tierBadge(tier: string): string {
  switch (tier) {
    case 'a': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'b': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'c': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-[#111118] text-[#6b7280] border-[#1e1e28]';
  }
}

function tierAccent(tier: string): string {
  switch (tier) {
    case 'a': return 'border-emerald-500/20 bg-emerald-500/5';
    case 'b': return 'border-amber-500/20 bg-amber-500/5';
    case 'c': return 'border-red-500/20 bg-red-500/5';
    default: return 'border-[#1e1e28] bg-[#0c0c10]';
  }
}

function usageBarColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function apiIcon(key: string) {
  switch (key) {
    case 'tmdb': return Database;
    case 'omdb': return BarChart3;
    case 'itunes': return Film;
    case 'anilist': return Tv;
    case 'jikan': return Search;
    case 'kitsu': return Globe;
    case 'youtube': return Film;
    case 'newsapi': return Newspaper;
    case 'newsdata': return Newspaper;
    case 'fanart': return ImageIcon;
    case 'gemini': return Brain;
    default: return Server;
  }
}

// ─── Component ───

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Health data
  const [healthData, setHealthData] = useState<AdminHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // ScrapingAnt detailed stats
  const [antStats, setAntStats] = useState<any>(null);
  const [antLoading, setAntLoading] = useState(true);

  // Section toggles
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({ a: true, b: true, c: true });

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Check localStorage for admin auth token
  useEffect(() => {
    const token =
      localStorage.getItem('typescribe_admin_auth') ||
      localStorage.getItem('typescribe_admin_token');
    if (token) {
      setAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  // Fetch comprehensive health data
  const fetchHealthData = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch('/api/admin/health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      } else {
        setHealthError('Failed to fetch health data');
      }
    } catch {
      setHealthError('Connection failed');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Fetch ScrapingAnt per-key stats
  const fetchAntStats = useCallback(async () => {
    setAntLoading(true);
    try {
      const res = await fetch('/api/admin/scrapingant');
      if (res.ok) {
        const data = await res.json();
        setAntStats(data);
      }
    } catch {
      // Silently fail
    } finally {
      setAntLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchHealthData();
      fetchAntStats();
    }
  }, [authenticated, fetchHealthData, fetchAntStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !authenticated) return;
    const interval = setInterval(() => {
      fetchHealthData();
      fetchAntStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, authenticated, fetchHealthData, fetchAntStats]);

  // Auth handler
  const handleAuthenticate = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('typescribe_admin_auth', data.token);
        localStorage.setItem('typescribe_admin_token', data.token);
        setAuthenticated(true);
        setPassword('');
      } else {
        setAuthError(data.error || 'Invalid password');
      }
    } catch {
      setAuthError('Connection failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('typescribe_admin_auth');
    localStorage.removeItem('typescribe_admin_token');
    setAuthenticated(false);
    setHealthData(null);
  };

  // Loading gate
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4a853]" strokeWidth={1.5} />
      </div>
    );
  }

  // Auth gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4">
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#d4a853]/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Access</h1>
              <p className="text-xs text-[#6b7280]">O.L.H.M.E.S Authentication Required</p>
            </div>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{authError}</p>
            </div>
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
            placeholder="Enter admin password"
            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] mb-4"
            autoFocus
          />

          <div className="flex gap-3">
            <Button
              onClick={handleAuthenticate}
              disabled={!password || authLoading}
              className="flex-1 bg-[#d4a853] hover:bg-[#b8922e] text-white disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" strokeWidth={1.5} />
              ) : (
                <Lock className="w-4 h-4 mr-2" strokeWidth={1.5} />
              )}
              Authenticate
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1e1e28]">
            <Link
              href="/"
              className="text-xs text-[#6b7280] hover:text-white transition-colors"
            >
              &larr; Back to Typescribe
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Derive Stats ───

  const scrapersByTier: Record<string, ScraperHealth[]> = { a: [], b: [], c: [] };
  if (healthData?.scrapers) {
    for (const s of healthData.scrapers) {
      if (scrapersByTier[s.tier]) scrapersByTier[s.tier].push(s);
    }
  }

  const healthyCount = healthData?.scrapers.filter(s => s.status === 'healthy').length ?? 0;
  const degradedCount = healthData?.scrapers.filter(s => s.status === 'degraded').length ?? 0;
  const downCount = healthData?.scrapers.filter(s => s.status === 'down').length ?? 0;
  const totalScraperRequests = healthData?.scrapers.reduce((sum, s) => sum + s.totalRequests, 0) ?? 0;
  const configuredApis = healthData?.apis.filter(a => a.configured).length ?? 0;
  const totalApis = healthData?.apis.length ?? 0;

  // ─── Authenticated Dashboard ───

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Header ─── */}
        <div className="mb-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#d4a853]/10 rounded-lg border border-[#d4a853]/20">
                <Shield className="w-6 h-6 text-[#d4a853]" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                  O.L.H.M.E.S Admin
                </h1>
                <p className="text-[#6b7280] text-sm mt-0.5">
                  Typescribe Operations &amp; Infrastructure
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-[#6b7280] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#1e1e28] bg-[#0c0c10] text-[#d4a853] focus:ring-[#d4a853]/20"
                />
                Auto-refresh (30s)
              </label>
              <Button
                onClick={() => { fetchHealthData(); fetchAntStats(); }}
                variant="outline"
                size="sm"
                className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]"
                disabled={healthLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${healthLoading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                Logout
              </Button>
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]"
                >
                  &larr; Main Site
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Overall Health Banner ─── */}
        {healthData && (
          <section className="mb-10">
            <div className={`rounded-xl border p-5 ${
              healthData.overallStatus === 'healthy' ? 'bg-emerald-500/5 border-emerald-500/15' :
              healthData.overallStatus === 'degraded' ? 'bg-amber-500/5 border-amber-500/15' :
              'bg-red-500/5 border-red-500/15'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <Activity className={`w-5 h-5 ${
                    healthData.overallStatus === 'healthy' ? 'text-emerald-400' :
                    healthData.overallStatus === 'degraded' ? 'text-amber-400' : 'text-red-400'
                  }`} strokeWidth={1.5} />
                  <span className="text-white font-semibold text-lg">
                    Pipeline Health: {healthData.overallStatus.toUpperCase()}
                  </span>
                  <span className="text-[#6b7280] text-xs">
                    Last checked: {timeAgo(healthData.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400">{healthyCount} Healthy</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-amber-400">{degradedCount} Degraded</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-red-400">{downCount} Down</span>
                  </span>
                </div>
              </div>
              {healthData.recommendations.length > 0 && (
                <div className="space-y-1.5 mt-3 pt-3 border-t border-white/[0.06]">
                  {healthData.recommendations.slice(0, 5).map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span className="text-[#9ca3af]">{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Quick Stats Grid ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} /> Pipeline Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { icon: Shield, label: 'Scrapers', value: `${healthyCount}/${healthData?.scrapers.length ?? 16}`, sub: 'Healthy', color: healthyCount >= 14 ? 'text-emerald-400' : healthyCount >= 10 ? 'text-amber-400' : 'text-red-400' },
              { icon: Cpu, label: 'APIs Configured', value: `${configuredApis}/${totalApis}`, sub: configuredApis >= 3 ? 'Operational' : 'Needs setup', color: configuredApis >= 3 ? 'text-emerald-400' : 'text-amber-400' },
              { icon: Zap, label: 'Total Requests', value: totalScraperRequests.toLocaleString(), sub: 'All scrapers', color: 'text-white' },
              { icon: HardDrive, label: 'Cache Entries', value: (healthData?.cache.totalEntries ?? 0).toLocaleString(), sub: `${((healthData?.cache.hitRate ?? 0) * 100).toFixed(0)}% hit rate`, color: 'text-white' },
              { icon: Key, label: 'ScrapingAnt', value: `${healthData?.scrapingAnt.activeKeys ?? 0}/5`, sub: 'Active keys', color: (healthData?.scrapingAnt.activeKeys ?? 0) >= 3 ? 'text-emerald-400' : 'text-red-400' },
              { icon: Database, label: 'OMDb Daily', value: `${healthData?.omdbDaily.used ?? 0}/${healthData?.omdbDaily.limit ?? 1000}`, sub: `${healthData?.omdbDaily.remaining ?? 0} remaining`, color: (healthData?.omdbDaily.remaining ?? 1000) < 100 ? 'text-red-400' : 'text-emerald-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-4"
              >
                <stat.icon className="w-4 h-4 text-[#d4a853] mb-2" />
                <p className="text-[#6b7280] text-[10px] mb-1">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[#4a4a5a] text-[9px] mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Quick Navigation ─── */}
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/admin/data" className="group">
              <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-5 hover:border-[#d4a853]/30 transition-all duration-200 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
                    <h3 className="text-white font-semibold">Data Pipeline</h3>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#4a4a5a] group-hover:text-[#d4a853] group-hover:translate-x-1 transition-all" strokeWidth={1.5} />
                </div>
                <p className="text-[#6b7280] text-sm leading-relaxed">
                  Cache management, batch processing, and API key configuration.
                </p>
              </div>
            </Link>
            <button onClick={() => { fetchHealthData(); fetchAntStats(); }} className="group text-left">
              <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-5 hover:border-[#d4a853]/30 transition-all duration-200 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
                    <h3 className="text-white font-semibold">Refresh Health Data</h3>
                  </div>
                  <Activity className="w-4 h-4 text-[#4a4a5a] group-hover:text-[#d4a853] transition-all" strokeWidth={1.5} />
                </div>
                <p className="text-[#6b7280] text-sm leading-relaxed">
                  Force refresh all health checks, API statuses, and ScrapingAnt key usage.
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* ─── Scraping Sources (Free-First) ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} /> Scraping Sources
            <span className="text-xs font-normal text-[#6b7280] ml-1">(Free-First: 6 primary + 7 fallback + 3 premium = 16 sites)</span>
          </h2>

          {healthLoading && !healthData ? (
            <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#d4a853] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#6b7280] text-sm">Loading scraper health...</p>
            </div>
          ) : (
            (['a', 'b', 'c'] as const).map(tier => {
              const tierScrapers = scrapersByTier[tier] || [];
              const isExpanded = expandedTiers[tier] !== false;
              return (
                <div key={tier} className="mb-4">
                  <button
                    onClick={() => setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }))}
                    className="flex items-center gap-2 mb-2 w-full text-left group"
                  >
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tierBadge(tier)}`}>
                      {tierLabel(tier)}
                    </span>
                    <span className="text-[#4a4a5a] text-xs">({tierScrapers.length} sites)</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#4a4a5a] ml-auto" strokeWidth={1.5} /> : <ChevronDown className="w-3.5 h-3.5 text-[#4a4a5a] ml-auto" strokeWidth={1.5} />}
                  </button>
                  {isExpanded && (
                    <div className={`rounded-xl border p-4 ${tierAccent(tier)}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tierScrapers.map(scraper => (
                          <div key={scraper.name} className="bg-[#050507]/70 border border-[#1e1e28]/50 rounded-lg p-4">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${statusDot(scraper.status)}`} />
                                <span className="text-white text-sm font-semibold">{scraper.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {scraper.circuitState === 'open' && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">CIRCUIT OPEN</span>
                                )}
                                {scraper.circuitState === 'half_open' && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">HALF-OPEN</span>
                                )}
                                {!scraper.enabled && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#111118] text-[#4a4a5a] border border-[#1e1e28]">DISABLED</span>
                                )}
                              </div>
                            </div>

                            {/* URL */}
                            {scraper.meta.url && (
                              <a
                                href={scraper.meta.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] text-[#4a4a5a] hover:text-[#9ca3af] transition-colors mb-2"
                              >
                                <Globe className="w-2.5 h-2.5" strokeWidth={1.5} />
                                {scraper.meta.url.replace('https://', '').replace('http://', '')}
                                <ExternalLink className="w-2 h-2" strokeWidth={1.5} />
                              </a>
                            )}

                            {/* What it provides */}
                            <p className="text-[11px] text-[#6b7280] leading-relaxed mb-2">{scraper.meta.provides}</p>

                            {/* Stats row */}
                            <div className="flex items-center gap-3 text-[10px] text-[#6b7280] mb-2">
                              <span className="flex items-center gap-1">
                                <span className={`font-medium ${statusColor(scraper.status)}`}>
                                  {scraper.status.toUpperCase()}
                                </span>
                              </span>
                              {scraper.totalRequests > 0 && (
                                <span>{(scraper.successRate * 100).toFixed(0)}% success</span>
                              )}
                              {scraper.avgResponseMs > 0 && (
                                <span>{scraper.avgResponseMs}ms avg</span>
                              )}
                              {scraper.consecutiveFailures > 0 && (
                                <span className="text-red-400">{scraper.consecutiveFailures} fail</span>
                              )}
                            </div>

                            {/* Last activity */}
                            <div className="flex items-center gap-3 text-[9px] text-[#4a4a5a]">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5 text-emerald-400/40" strokeWidth={1.5} />
                                Last OK: {timeAgo(scraper.lastSuccess)}
                              </span>
                              {scraper.lastFailure && (
                                <span className="flex items-center gap-1">
                                  <XCircle className="w-2.5 h-2.5 text-red-400/40" strokeWidth={1.5} />
                                  Last fail: {timeAgo(scraper.lastFailure)}
                                </span>
                              )}
                            </div>

                            {/* Region badge */}
                            <div className="mt-2">
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#111118] text-[#4a4a5a] border border-[#1e1e28]">
                                {scraper.meta.region}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* ─── API Health & Usage (30%) ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} /> API Health &amp; Usage
            <span className="text-xs font-normal text-[#6b7280] ml-1">(Free APIs &amp; Paid Fallbacks — {totalApis} sources)</span>
          </h2>

          {healthLoading && !healthData ? (
            <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#d4a853] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#6b7280] text-sm">Loading API status...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {healthData?.apis.map(api => {
                const Icon = apiIcon(api.key);
                return (
                  <div
                    key={api.key}
                    className={`rounded-xl border backdrop-blur-xl p-4 transition-colors ${
                      api.configured ? 'bg-[#0c0c10] border-emerald-500/15' : 'bg-[#0c0c10] border-[#1e1e28] opacity-70'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#d4a853]" />
                        <span className="text-white font-semibold text-sm">{api.key.toUpperCase()}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        api.configured
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {api.configured ? <Wifi className="w-2.5 h-2.5" strokeWidth={1.5} /> : <WifiOff className="w-2.5 h-2.5" strokeWidth={1.5} />}
                        {api.configured ? 'CONFIGURED' : 'MISSING KEY'}
                      </span>
                    </div>

                    {/* URL */}
                    <a
                      href={api.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-[#4a4a5a] hover:text-[#9ca3af] transition-colors mb-2"
                    >
                      <Globe className="w-2.5 h-2.5" strokeWidth={1.5} />
                      {api.url.replace('https://', '').replace('http://', '')}
                      <ExternalLink className="w-2 h-2" strokeWidth={1.5} />
                    </a>

                    {/* What it provides */}
                    <p className="text-[11px] text-[#6b7280] leading-relaxed mb-2">{api.provides}</p>

                    {/* Free tier limit */}
                    <div className="flex items-center gap-2 text-[10px] text-[#4a4a5a]">
                      <Clock className="w-2.5 h-2.5" strokeWidth={1.5} />
                      <span>Free limit: {api.freeLimit}</span>
                    </div>

                    {/* Daily usage bar (OMDb only for now) */}
                    {api.dailyUsage && api.configured && (
                      <div className="mt-3 pt-2 border-t border-[#1e1e28]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-[#6b7280]">Daily Usage</span>
                          <span className="text-[10px] text-[#9ca3af]">{api.dailyUsage.used.toLocaleString()} / {api.dailyUsage.limit.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 bg-[#111118] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${usageBarColor((api.dailyUsage.used / api.dailyUsage.limit) * 100)}`}
                            style={{ width: `${Math.min((api.dailyUsage.used / api.dailyUsage.limit) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-[#4a4a5a] mt-1">{api.dailyUsage.remaining.toLocaleString()} remaining today</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── ScrapingAnt 5-Key Rotation ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} /> ScrapingAnt 5-Key Rotation
            <span className="text-xs font-normal text-[#6b7280] ml-1">(Round-robin · 10K req/key/month)</span>
          </h2>
          <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-6">
            {antLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#d4a853]" strokeWidth={1.5} />
                <span className="ml-3 text-[#6b7280] text-sm">Loading key stats...</span>
              </div>
            ) : antStats ? (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="rounded-lg bg-[#050507] border border-[#1e1e28] p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">{antStats.activeKeys ?? healthData?.scrapingAnt.activeKeys ?? 0}/5</p>
                    <p className="text-[#6b7280] text-[10px]">Active Keys</p>
                  </div>
                  <div className="rounded-lg bg-[#050507] border border-[#1e1e28] p-3 text-center">
                    <p className="text-lg font-bold text-white">{(antStats.totalUsed ?? healthData?.scrapingAnt.totalUsed ?? 0).toLocaleString()}</p>
                    <p className="text-[#6b7280] text-[10px]">Total Used</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">{(antStats.totalRemaining ?? healthData?.scrapingAnt.totalRemaining ?? 0).toLocaleString()}</p>
                    <p className="text-[#6b7280] text-[10px]">Remaining</p>
                  </div>
                  <div className="rounded-lg bg-[#050507] border border-[#1e1e28] p-3 text-center">
                    <p className="text-lg font-bold text-white">
                      {(antStats.successRate ?? healthData?.scrapingAnt.successRate ?? 0) > 0
                        ? `${((antStats.successRate ?? healthData?.scrapingAnt.successRate ?? 0) * 100).toFixed(1)}%`
                        : '--'}
                    </p>
                    <p className="text-[#6b7280] text-[10px]">Success Rate</p>
                  </div>
                </div>

                {/* Per-key breakdown */}
                {(antStats.keys || healthData?.scrapingAnt.keyStats || []).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white mb-3">Per-Key Usage (Monthly)</h3>
                    {(antStats.keys || healthData?.scrapingAnt.keyStats || []).map((key: any, idx: number) => {
                      const used = key.monthUsed ?? key.used ?? 0;
                      const limit = key.monthLimit ?? key.limit ?? 10000;
                      const pct = limit > 0 ? (used / limit) * 100 : 0;
                      const configured = key.configured ?? true;
                      const remaining = key.monthRemaining ?? key.remaining ?? (limit - used);
                      return (
                        <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-[#050507] border border-[#1e1e28]">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Key className="w-3.5 h-3.5 text-[#d4a853]" strokeWidth={1.5} />
                            <span className="text-white text-sm font-medium">Key {idx + 1}</span>
                            {configured ? (
                              <CheckCircle className="w-3 h-3 text-emerald-400" strokeWidth={1.5} />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-400" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="w-full h-2 bg-[#111118] rounded-full overflow-hidden">
                              {configured && (
                                <div
                                  className={`h-full rounded-full transition-all ${usageBarColor(pct)}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 min-w-[160px] justify-end text-xs">
                            <span className="text-[#9ca3af]">{used.toLocaleString()} / {limit.toLocaleString()}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium text-[10px] ${
                              pct >= 90 ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : pct >= 60 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {remaining.toLocaleString()} left
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-[#1e1e28] flex items-center gap-2">
                  {(antStats.configured ?? healthData?.scrapingAnt.configured) ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                      <span className="text-sm text-emerald-400">ScrapingAnt Configured</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                      <span className="text-sm text-red-400">ScrapingAnt Not Configured</span>
                    </>
                  )}
                  <span className="text-[#4a4a5a] text-xs ml-2">
                    Set SCRAPINGANT_KEY_1 through SCRAPINGANT_KEY_5 in .env.local
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Key className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[#6b7280] text-sm">Unable to load ScrapingAnt stats</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAntStats}
                  className="mt-3 border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]"
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ─── System Health Summary ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} /> System Health
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Next.js App', status: 'healthy' as const, detail: 'Vercel Deployment — Running' },
              { name: 'Scraping Pipeline', status: healthData?.overallStatus ?? 'healthy', detail: `${healthyCount + degradedCount + downCount} scrapers across 3 tiers` },
              { name: 'API Layer', status: configuredApis >= 3 ? 'healthy' as const : 'degraded' as const, detail: `${configuredApis}/${totalApis} APIs configured` },
              { name: 'Cache Layer', status: (healthData?.cache.hitRate ?? 0) >= 0.3 ? 'healthy' as const : 'degraded' as const, detail: `${(healthData?.cache.totalEntries ?? 0)} entries · ${((healthData?.cache.hitRate ?? 0) * 100).toFixed(0)}% hit rate` },
            ].map((svc) => (
              <div
                key={svc.name}
                className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">{svc.name}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${statusDot(svc.status)}`} />
                    <span className={`text-[10px] font-medium ${statusColor(svc.status)}`}>
                      {svc.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-[#4a4a5a] text-xs">{svc.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Footer ─── */}
        <div className="mt-8 pt-6 border-t border-[#1e1e28] flex items-center justify-between flex-wrap gap-4">
          <Link
            href="/"
            className="text-sm text-[#6b7280] hover:text-white transition-colors flex items-center gap-1.5"
          >
            &larr; Back to Typescribe
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/data"
              className="text-sm text-[#6b7280] hover:text-white transition-colors"
            >
              Data Pipeline &rarr;
            </Link>
            <span className="text-[10px] text-[#4a4a5a]">
              O.L.H.M.E.S Admin v2.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
