'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, Database, Key, Activity, Users, Film, Eye,
  BarChart3, ArrowRight, Lock, Loader2, CheckCircle, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ───

interface ScrapingAntKeyStat {
  keyIndex: number;
  keySuffix: string;
  used: number;
  remaining: number;
  limit: number;
}

interface ScrapingAntStats {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  successRate: number;
  keyStats: ScrapingAntKeyStat[];
  totalUsed: number;
  totalRemaining: number;
  activeKeys: number;
  configured: boolean;
}

// ─── Mock Data ───

const MOCK_METRICS = {
  totalMovies: 14_832,
  totalReviews: 53_291,
  activeUsers: 2_147,
  pageViewsToday: 18_453,
  avgSessionDuration: '4m 32s',
  apiCallsToday: 6_204,
  cacheHitRate: 73.2,
  uptime: '99.97%',
};

// ─── Component ───

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ScrapingAnt stats
  const [scrapingAntStats, setScrapingAntStats] = useState<ScrapingAntStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  // Fetch ScrapingAnt stats once authenticated
  const fetchScrapingAntStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/scrapingant');
      if (res.ok) {
        const data = await res.json();
        setScrapingAntStats(data);
      }
    } catch {
      // Silently fail — stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchScrapingAntStats();
    }
  }, [authenticated, fetchScrapingAntStats]);

  // ─── Auth Handler ───

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
        // Also keep the token key the Footer uses for cross-compatibility
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

  // ─── Loading Gate ───

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e50914]" />
      </div>
    );
  }

  // ─── Auth Gate ───

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#e50914]/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#e50914]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Access</h1>
              <p className="text-xs text-[#6b6b7b]">O.L.H.M.E.S Authentication Required</p>
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
            className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] mb-4"
            autoFocus
          />

          <div className="flex gap-3">
            <Button
              onClick={handleAuthenticate}
              disabled={!password || authLoading}
              className="flex-1 bg-[#e50914] hover:bg-[#b20710] text-white disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Authenticate
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-[#2a2a35]">
            <Link
              href="/"
              className="text-xs text-[#6b6b7b] hover:text-white transition-colors"
            >
              &larr; Back to Typescribe
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Authenticated Dashboard ───

  const keyUsagePct = (used: number, limit: number) =>
    limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  const usageBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Header ─── */}
        <div className="mb-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e50914]/10 rounded-lg border border-[#e50914]/20">
                <Shield className="w-6 h-6 text-[#e50914]" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                  Admin Dashboard
                </h1>
                <p className="text-[#6b6b7b] text-sm mt-0.5">
                  Typescribe Operations &amp; Infrastructure
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle className="w-3 h-3" /> Authenticated
              </span>
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]"
                >
                  &larr; Main Site
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Quick Navigation Cards ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#e50914]" /> Quick Navigation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Data Pipeline Card */}
            <Link href="/admin/data" className="group">
              <div className="rounded-xl border border-[#2a2a35] bg-[#12121a] backdrop-blur-xl p-6 hover:border-[#e50914]/30 transition-all duration-200 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-[#e50914]/10 rounded-lg border border-[#e50914]/20">
                    <Database className="w-5 h-5 text-[#e50914]" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#4a4a5a] group-hover:text-[#e50914] group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">Data Pipeline</h3>
                <p className="text-[#6b6b7b] text-sm leading-relaxed">
                  Manage scrapers, API sources, cache, and batch processing across 15 sites in 3 tiers.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-[#4a4a5a]">
                  <Database className="w-3 h-3" />
                  <span>70% Scraping + 30% APIs</span>
                </div>
              </div>
            </Link>

            {/* Placeholder: Content Moderation */}
            <div className="rounded-xl border border-[#2a2a35] bg-[#12121a] backdrop-blur-xl p-6 opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-[#2a2a35] rounded-lg border border-[#3a3a45]">
                  <Eye className="w-5 h-5 text-[#4a4a5a]" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a25] text-[#4a4a5a] border border-[#2a2a35]">
                  Coming Soon
                </span>
              </div>
              <h3 className="text-[#4a4a5a] font-semibold text-lg mb-1">Content Moderation</h3>
              <p className="text-[#4a4a5a] text-sm leading-relaxed">
                Review flagged content, manage user reports, and moderation queues.
              </p>
            </div>

            {/* Placeholder: User Management */}
            <div className="rounded-xl border border-[#2a2a35] bg-[#12121a] backdrop-blur-xl p-6 opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-[#2a2a35] rounded-lg border border-[#3a3a45]">
                  <Users className="w-5 h-5 text-[#4a4a5a]" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a25] text-[#4a4a5a] border border-[#2a2a35]">
                  Coming Soon
                </span>
              </div>
              <h3 className="text-[#4a4a5a] font-semibold text-lg mb-1">User Management</h3>
              <p className="text-[#4a4a5a] text-sm leading-relaxed">
                View user accounts, manage permissions, and handle access controls.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Site Metrics Overview ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#e50914]" /> Site Metrics
            <span className="text-xs font-normal text-[#4a4a5a] ml-1">(snapshot)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Film, label: 'Total Movies', value: MOCK_METRICS.totalMovies.toLocaleString(), color: 'text-[#e50914]' },
              { icon: Users, label: 'Active Users', value: MOCK_METRICS.activeUsers.toLocaleString(), color: 'text-emerald-400' },
              { icon: Activity, label: 'Reviews', value: MOCK_METRICS.totalReviews.toLocaleString(), color: 'text-amber-400' },
              { icon: Eye, label: 'Page Views Today', value: MOCK_METRICS.pageViewsToday.toLocaleString(), color: 'text-sky-400' },
              { icon: BarChart3, label: 'Cache Hit Rate', value: `${MOCK_METRICS.cacheHitRate}%`, color: 'text-emerald-400' },
              { icon: Activity, label: 'API Calls Today', value: MOCK_METRICS.apiCallsToday.toLocaleString(), color: 'text-violet-400' },
              { icon: Shield, label: 'Uptime', value: MOCK_METRICS.uptime, color: 'text-emerald-400' },
              { icon: Eye, label: 'Avg. Session', value: MOCK_METRICS.avgSessionDuration, color: 'text-amber-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[#2a2a35] bg-[#12121a] backdrop-blur-xl p-5"
              >
                <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
                <p className="text-[#6b6b7b] text-xs mb-1">{stat.label}</p>
                <p className="text-white text-lg font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── ScrapingAnt Key Status ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-[#e50914]" /> ScrapingAnt Key Status
            <span className="text-xs font-normal text-[#4a4a5a] ml-1">(5-key round-robin)</span>
          </h2>
          <div className="rounded-xl border border-[#2a2a35] bg-[#12121a] backdrop-blur-xl p-6">
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#e50914]" />
                <span className="ml-3 text-[#6b6b7b] text-sm">Loading key stats…</span>
              </div>
            ) : scrapingAntStats ? (
              <>
                {/* Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-lg bg-[#0a0a0f] border border-[#2a2a35] p-3 text-center">
                    <p className="text-lg font-bold text-white">
                      {scrapingAntStats.activeKeys}
                    </p>
                    <p className="text-[#6b6b7b] text-[10px]">Active Keys</p>
                  </div>
                  <div className="rounded-lg bg-[#0a0a0f] border border-[#2a2a35] p-3 text-center">
                    <p className="text-lg font-bold text-white">
                      {scrapingAntStats.totalUsed.toLocaleString()}
                    </p>
                    <p className="text-[#6b6b7b] text-[10px]">Total Used</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">
                      {scrapingAntStats.totalRemaining.toLocaleString()}
                    </p>
                    <p className="text-[#6b6b7b] text-[10px]">Remaining</p>
                  </div>
                  <div className="rounded-lg bg-[#0a0a0f] border border-[#2a2a35] p-3 text-center">
                    <p className="text-lg font-bold text-white">
                      {scrapingAntStats.successRate > 0
                        ? `${(scrapingAntStats.successRate * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                    <p className="text-[#6b6b7b] text-[10px]">Success Rate</p>
                  </div>
                </div>

                {/* Per-Key Breakdown */}
                <div className="space-y-3">
                  {scrapingAntStats.keyStats.map((ks) => {
                    const pct = keyUsagePct(ks.used, ks.limit);
                    return (
                      <div
                        key={ks.keyIndex}
                        className="flex items-center gap-4 p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a35]"
                      >
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Key className="w-3.5 h-3.5 text-[#e50914]" />
                          <span className="text-white text-sm font-medium">
                            Key {ks.keyIndex + 1}
                          </span>
                          <span className="text-[10px] font-mono text-[#4a4a5a]">
                            ···{ks.keySuffix}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="w-full h-2 bg-[#1a1a25] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${usageBarColor(pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 min-w-[180px] justify-end text-xs">
                          <span className="text-[#a0a0b0]">
                            {ks.used.toLocaleString()} / {ks.limit.toLocaleString()}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                              pct >= 90
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : pct >= 60
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {pct >= 90 ? (
                              <XCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            )}
                            {ks.remaining.toLocaleString()} left
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Configured Badge */}
                <div className="mt-4 pt-4 border-t border-[#2a2a35] flex items-center gap-2">
                  {scrapingAntStats.configured ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-emerald-400">ScrapingAnt Configured</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">ScrapingAnt Not Configured</span>
                    </>
                  )}
                  <span className="text-[#4a4a5a] text-xs ml-2">
                    {scrapingAntStats.totalRequests} total requests ·{' '}
                    {scrapingAntStats.successRequests} succeeded ·{' '}
                    {scrapingAntStats.failedRequests} failed
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Key className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
                <p className="text-[#6b6b7b] text-sm">Unable to load ScrapingAnt stats</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchScrapingAntStats}
                  className="mt-3 border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]"
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
            <Shield className="w-5 h-5 text-[#e50914]" /> System Health
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: 'Next.js App',
                status: 'healthy' as const,
                detail: 'Port 3000 — Running',
              },
              {
                name: 'Scraping Pipeline',
                status: 'healthy' as const,
                detail: '15 scrapers across 3 tiers',
              },
              {
                name: 'Database (SQLite)',
                status: 'healthy' as const,
                detail: 'Prisma ORM — Connected',
              },
            ].map((svc) => (
              <div
                key={svc.name}
                className="rounded-xl border border-[#2a2a35] bg-[#12121a] backdrop-blur-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">{svc.name}</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        svc.status === 'healthy'
                          ? 'bg-emerald-400'
                          : svc.status === 'degraded'
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-medium ${
                        svc.status === 'healthy'
                          ? 'text-emerald-400'
                          : svc.status === 'degraded'
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}
                    >
                      {svc.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-[#4a4a5a] text-xs">{svc.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Footer Link ─── */}
        <div className="mt-8 pt-6 border-t border-[#2a2a35] flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[#6b6b7b] hover:text-white transition-colors flex items-center gap-1.5"
          >
            &larr; Back to Typescribe
          </Link>
          <span className="text-[10px] text-[#4a4a5a]">
            O.L.H.M.E.S Admin v1.0
          </span>
        </div>
      </div>
    </div>
  );
}
