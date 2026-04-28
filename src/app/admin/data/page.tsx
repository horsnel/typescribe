'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Database, RefreshCw, Trash2, CheckCircle, XCircle, Zap,
  Loader2, AlertTriangle, Activity, Key, FileText, Shield,
  Globe, ChevronUp, ChevronDown, ArrowUpDown, Clock, HardDrive,
  BarChart3, Cpu, Image as ImageIcon, Brain, Newspaper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ─── Types ───

interface ScraperInfo {
  tier: string;
  enabled: boolean;
  circuitOpen: boolean;
}

interface PipelineSources {
  tmdb: boolean;
  omdb: boolean;
  youtube: boolean;
  newsapi: boolean;
  newsdataIo: boolean;
  fanartTv: boolean;
  gemini: boolean;
  scrapers: Record<string, ScraperInfo>;
}

interface CacheInfo {
  totalEntries: number;
  hitRate: number;
  avgCompleteness: number;
  totalSizeBytes: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

interface CachedMovie {
  key: string;
  title: string;
  tmdbId: number;
  completeness: number;
  sources: string[];
  createdAt: string;
  expiresAt: string;
  hitCount: number;
}

interface HealthScraper {
  name: string;
  tier: 'a' | 'b' | 'c';
  status: 'healthy' | 'degraded' | 'down' | 'disabled';
  lastSuccess: string | null;
  lastFailure: string | null;
  consecutiveFailures: number;
  successRate: number;
  circuitState: 'closed' | 'open' | 'half_open';
  enabled: boolean;
}

interface HealthReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  scrapers: HealthScraper[];
  scrapingBee: { configured: boolean; totalRequests: number; successRate: number; dailyCredits: { used: number; limit: number; remaining: number } };
  apiClients: { tmdb: { configured: boolean }; omdb: { configured: boolean }; youtube: { configured: boolean }; newsapi: { configured: boolean } };
  recommendations: string[];
}

type SortField = 'completeness' | 'createdAt' | 'hitCount' | 'title';
type SortDirection = 'asc' | 'desc';

// ─── Helpers ───

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function completenessColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function completenessBg(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
  if (pct >= 50) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

function statusColor(status: string): string {
  switch (status) {
    case 'healthy': return 'text-emerald-400';
    case 'degraded': return 'text-amber-400';
    case 'down': return 'text-red-400';
    case 'disabled': return 'text-[#4a4a5a]';
    default: return 'text-[#6b7280]';
  }
}

function statusDot(status: string): string {
  switch (status) {
    case 'healthy': return 'bg-emerald-400';
    case 'degraded': return 'bg-amber-400';
    case 'down': return 'bg-red-400';
    default: return 'bg-[#4a4a5a]';
  }
}

function tierLabel(tier: string): string {
  switch (tier) {
    case 'a': return 'Tier A — Zero Protection';
    case 'b': return 'Tier B — Light Protection';
    case 'c': return 'Tier C — Medium Protection';
    default: return `Tier ${tier}`;
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

function tierBadge(tier: string): string {
  switch (tier) {
    case 'a': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'b': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'c': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-[#111118] text-[#6b7280] border-[#1e1e28]';
  }
}

// ─── ScrapingAnt Key Stats Component ───

function ScrapingAntKeyStats({ sb }: { sb: any }) {
  const [antStats, setAntStats] = useState<any>(null);
  const [loadingAnt, setLoadingAnt] = useState(true);

  useEffect(() => {
    fetch('/api/admin/scrapingant')
      .then(res => res.ok ? res.json() : null)
      .then(data => { setAntStats(data); })
      .catch(() => {})
      .finally(() => setLoadingAnt(false));
  }, []);

  if (loadingAnt) {
    return (
      <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#d4a853] mx-auto mb-2" />
        <p className="text-[#6b7280] text-sm">Loading ScrapingAnt stats...</p>
      </div>
    );
  }

  if (!antStats) {
    // Fallback to old ScrapingBee display
    if (sb) {
      return (
        <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Daily API Credits (Legacy)</span>
            <span className="text-xs text-[#6b7280]">{sb.dailyCreditsUsed} / {sb.dailyCreditsLimit} used</span>
          </div>
          <div className="w-full h-2.5 bg-[#111118] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${
              sb.dailyCreditsRemaining / sb.dailyCreditsLimit < 0.1 ? 'bg-red-500' :
              sb.dailyCreditsRemaining / sb.dailyCreditsLimit < 0.3 ? 'bg-amber-500' : 'bg-emerald-500'
            }`} style={{ width: `${Math.min((sb.dailyCreditsUsed / sb.dailyCreditsLimit) * 100, 100)}%` }} />
          </div>
          <p className="text-[#4a4a5a] text-[10px] mt-1.5">{sb.dailyCreditsRemaining.toLocaleString()} credits remaining today</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-5">
        <p className="text-[#6b7280] text-sm">ScrapingAnt not configured</p>
        <p className="text-[#4a4a5a] text-xs mt-1">Set SCRAPINGANT_KEY_1 through SCRAPINGANT_KEY_5 in .env.local</p>
      </div>
    );
  }

  const keys = antStats.keys || [];
  const activeKeys = keys.filter((k: any) => k.configured).length;
  const totalUsed = keys.reduce((sum: number, k: any) => sum + (k.monthUsed || 0), 0);
  const totalLimit = keys.reduce((sum: number, k: any) => sum + (k.monthLimit || 0), 0);
  const totalRemaining = totalLimit - totalUsed;
  const successRate = antStats.totalRequests > 0
    ? ((antStats.successCount / antStats.totalRequests) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-[#050507] border border-[#1e1e28] p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{activeKeys}/5</p>
          <p className="text-[#6b7280] text-[10px]">Active Keys</p>
        </div>
        <div className="rounded-lg bg-[#050507] border border-[#1e1e28] p-3 text-center">
          <p className="text-lg font-bold text-white">{totalUsed.toLocaleString()}</p>
          <p className="text-[#6b7280] text-[10px]">Total Used</p>
        </div>
        <div className="rounded-lg bg-[#050507] border border-[#1e1e28] p-3 text-center">
          <p className="text-lg font-bold text-white">{totalRemaining.toLocaleString()}</p>
          <p className="text-[#6b7280] text-[10px]">Remaining</p>
        </div>
        <div className="rounded-lg bg-[#050507] border border-[#1e1e28] p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{successRate}%</p>
          <p className="text-[#6b7280] text-[10px]">Success Rate</p>
        </div>
      </div>

      {/* Per-Key Breakdown */}
      <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Per-Key Usage (Monthly)</h3>
        <div className="space-y-3">
          {keys.map((key: any, idx: number) => {
            const usagePct = key.monthLimit > 0 ? (key.monthUsed / key.monthLimit) * 100 : 0;
            const barColor = usagePct > 90 ? 'bg-red-500' : usagePct > 60 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div key={idx} className="bg-[#050507] border border-[#1e1e28] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-[#6b7280]" />
                    <span className="text-sm text-white font-medium">Key {idx + 1}</span>
                    {key.configured ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">MISSING</span>
                    )}
                  </div>
                  <span className="text-xs text-[#6b7280]">{key.monthUsed?.toLocaleString() || 0} / {key.monthLimit?.toLocaleString() || 0}</span>
                </div>
                {key.configured && (
                  <div className="w-full h-2 bg-[#111118] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[#4a4a5a] text-[10px] mt-3">
          Each key has 10,000 requests/month. 5 keys = 50,000 total monthly capacity.
          {!antStats.configured && ' — Not configured (using direct fetch fallback)'}
        </p>
      </div>
    </div>
  );
}

// ─── Component ───

export default function AdminDataPipelinePage() {
  const [status, setStatus] = useState<any>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [batchInput, setBatchInput] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, healthRes] = await Promise.allSettled([
        fetch('/api/pipeline/status'),
        fetch('/api/scrape/health'),
      ]);
      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        setStatus(await statusRes.value.json());
      }
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        setHealth(await healthRes.value.json());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCacheAction = async (action: string, key?: string) => {
    setActionLoading(action);
    try {
      const url = key ? `/api/pipeline/cache?key=${encodeURIComponent(key)}` : '/api/pipeline/cache';
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      showToast(`Cache ${action} completed`);
      await fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchProcess = async () => {
    const ids = batchInput.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n) && n > 0);
    if (ids.length === 0) { showToast('Enter valid TMDb IDs', 'error'); return; }
    setBatchProcessing(true);
    setBatchResult(null);
    try {
      const res = await fetch('/api/scrape/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch failed');
      setBatchResult(data);
      showToast(`Processed ${data.totalProcessed} movies (${data.successCount} succeeded)`);
      await fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 text-[#d4a853]" /> : <ChevronDown className="w-3 h-3 ml-1 text-[#d4a853]" />;
  };

  const sources = status?.status?.sources as PipelineSources | undefined;
  const cache = status?.cache as CacheInfo | undefined;
  const cachedMovies = status?.cachedMovies as CachedMovie[] | undefined;
  const sb = status?.status?.scrapingBee;
  const omdbDaily = status?.status?.omdbDaily;

  const sortedMovies = (() => {
    if (!cachedMovies) return [];
    const movies = [...cachedMovies];
    movies.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'completeness': cmp = a.completeness - b.completeness; break;
        case 'createdAt': cmp = a.createdAt.localeCompare(b.createdAt); break;
        case 'hitCount': cmp = a.hitCount - b.hitCount; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return movies;
  })();

  // Group scrapers by tier
  const scrapersByTier: Record<string, HealthScraper[]> = { a: [], b: [], c: [] };
  if (health?.scrapers) {
    for (const s of health.scrapers) {
      if (scrapersByTier[s.tier]) scrapersByTier[s.tier].push(s);
    }
  }

  // Loading
  if (loading && !status) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4a853] mx-auto mb-4" />
          <p className="text-[#9ca3af]">Loading pipeline status…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-2">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-xl text-sm font-medium ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Header ─── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#d4a853]/10 rounded-lg border border-[#d4a853]/20">
              <Database className="w-6 h-6 text-[#d4a853]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Data Pipeline</h1>
              <p className="text-[#6b7280] text-sm mt-0.5">70% Scraping + 30% APIs — 15 sites across 3 tiers</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={fetchData} variant="outline" size="sm" className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]" disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            {status?.status?.configured ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle className="w-3 h-3" /> Pipeline Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <XCircle className="w-3 h-3" /> Not Configured
              </span>
            )}
          </div>
        </div>

        {/* ─── Overall Health ─── */}
        {health && (
          <section className="mb-10">
            <div className={`rounded-xl border p-5 ${
              health.overallStatus === 'healthy' ? 'bg-emerald-500/5 border-emerald-500/15' :
              health.overallStatus === 'degraded' ? 'bg-amber-500/5 border-amber-500/15' :
              'bg-red-500/5 border-red-500/15'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <Activity className={`w-5 h-5 ${
                  health.overallStatus === 'healthy' ? 'text-emerald-400' :
                  health.overallStatus === 'degraded' ? 'text-amber-400' : 'text-red-400'
                }`} />
                <span className="text-white font-semibold">Pipeline Health: {health.overallStatus.toUpperCase()}</span>
                <span className="text-[#6b7280] text-xs">
                  {health.scrapers.filter(s => s.status === 'healthy').length} healthy,
                  {' '}{health.scrapers.filter(s => s.status === 'degraded').length} degraded,
                  {' '}{health.scrapers.filter(s => s.status === 'down').length} down
                </span>
              </div>
              {health.recommendations.length > 0 && (
                <div className="space-y-1.5">
                  {health.recommendations.slice(0, 5).map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[#9ca3af]">{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── API Sources (30%) ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#d4a853]" /> API Sources <span className="text-xs font-normal text-[#6b7280]">(30% of data)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'TMDb', key: 'tmdb' as const, desc: 'Structure, posters, cast, genres — source of truth', envVar: 'TMDB_API_KEY', icon: Database },
              { name: 'OMDb', key: 'omdb' as const, desc: 'IMDb rating, RT %, Metascore fallback', envVar: 'OMDB_API_KEY', icon: BarChart3 },
              { name: 'YouTube', key: 'youtube' as const, desc: 'Trailer video search', envVar: 'YOUTUBE_API_KEY', icon: Globe },
              { name: 'NewsAPI', key: 'newsapi' as const, desc: 'Movie news headlines — primary', envVar: 'NEWS_API_KEY', icon: Newspaper },
              { name: 'Newsdata.io', key: 'newsdataIo' as const, desc: 'Supplementary news — fallback', envVar: 'NEWSDATA_IO_API_KEY', icon: Newspaper },
              { name: 'Fanart.tv', key: 'fanartTv' as const, desc: 'High-quality logos, clearart, backgrounds', envVar: 'FANART_TV_API_KEY', icon: ImageIcon },
              { name: 'Gemini AI', key: 'gemini' as const, desc: 'Intelligent review generation', envVar: 'GEMINI_API_KEY', icon: Brain },
            ].map(src => {
              const ok = sources?.[src.key] ?? false;
              return (
                <div key={src.name} className={`rounded-xl border backdrop-blur-xl p-4 transition-colors ${ok ? 'bg-[#0c0c10] border-emerald-500/15' : 'bg-[#0c0c10] border-[#1e1e28]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <src.icon className="w-4 h-4 text-[#d4a853]" />
                      <span className="text-white font-semibold text-sm">{src.name}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {ok ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                      {ok ? 'OK' : 'Missing'}
                    </span>
                  </div>
                  <p className="text-[#6b7280] text-xs leading-relaxed mb-1">{src.desc}</p>
                  <p className="text-[#4a4a5a] text-[9px] font-mono">{src.envVar}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Scraping Sources (70%) ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#d4a853]" /> Scraping Sources <span className="text-xs font-normal text-[#6b7280]">(70% of data — 15 sites)</span>
          </h2>

          {(['a', 'b', 'c'] as const).map(tier => {
            const tierScrapers = health?.scrapers.filter(s => s.tier === tier) || [];
            const scraperInfos = sources?.scrapers || {};
            return (
              <div key={tier} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tierBadge(tier)}`}>
                    {tierLabel(tier)}
                  </span>
                  <span className="text-[#4a4a5a] text-xs">({tierScrapers.length} sites)</span>
                </div>
                <div className={`rounded-xl border p-4 ${tierAccent(tier)}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {tierScrapers.map(scraper => {
                      const info = scraperInfos[scraper.name];
                      return (
                        <div key={scraper.name} className="bg-[#050507]/50 border border-[#1e1e28]/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-white text-sm font-medium">{scraper.name}</span>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${statusDot(scraper.status)}`} />
                              {info?.circuitOpen && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">OPEN</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#6b7280]">
                            <span className={statusColor(scraper.status)}>{scraper.status}</span>
                            {scraper.successRate > 0 && (
                              <span>· {(scraper.successRate * 100).toFixed(0)}%</span>
                            )}
                            {scraper.consecutiveFailures > 0 && (
                              <span className="text-red-400">· {scraper.consecutiveFailures} fail</span>
                            )}
                          </div>
                          {!scraper.enabled && (
                            <span className="text-[9px] text-[#4a4a5a] mt-1 block">Disabled</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ─── ScrapingAnt 5-Key Status ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#d4a853]" /> ScrapingAnt 5-Key Rotation
          </h2>
          <ScrapingAntKeyStats sb={sb} />
        </section>

        {/* ─── Cache Stats ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#d4a853]" /> Cache Statistics
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: Database, label: 'Cached Entries', value: (cache?.totalEntries ?? 0).toLocaleString(), sub: formatBytes(cache?.totalSizeBytes ?? 0) },
              { icon: Activity, label: 'Hit Rate', value: `${((cache?.hitRate ?? 0) * 100).toFixed(1)}%`, sub: (cache?.hitRate ?? 0) >= 0.5 ? 'Good' : 'Needs improvement' },
              { icon: BarChart3, label: 'Avg Completeness', value: `${cache?.avgCompleteness ?? 0}%`, sub: (cache?.avgCompleteness ?? 0) >= 70 ? 'Healthy' : 'Low quality' },
              { icon: Clock, label: 'Oldest Entry', value: formatDate(cache?.oldestEntry ?? null), sub: '' },
              { icon: Clock, label: 'Newest Entry', value: formatDate(cache?.newestEntry ?? null), sub: '' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-5">
                <stat.icon className="w-4 h-4 text-[#d4a853] mb-2" />
                <p className="text-[#6b7280] text-xs mb-1">{stat.label}</p>
                <p className="text-white text-lg font-bold">{stat.value}</p>
                {stat.sub && <p className="text-[#4a4a5a] text-[10px] mt-0.5">{stat.sub}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Cache Management ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#d4a853]" /> Cache Management
          </h2>
          <div className="flex flex-wrap gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40" disabled={actionLoading !== null}>
                  <Trash2 className="w-4 h-4 mr-1.5" /> Clear All Cache
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0c0c10] border-[#1e1e28]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Clear all cached data?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#6b7280]">
                    This will permanently delete all {cache?.totalEntries ?? 0} cached movie entries.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-[#1e1e28] text-[#9ca3af] hover:text-white">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleCacheAction('clear')} className="bg-red-500 hover:bg-red-600 text-white">
                    <Trash2 className="w-4 h-4 mr-1.5" /> Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]" onClick={() => handleCacheAction('prune')} disabled={actionLoading !== null}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Prune Expired
            </Button>
          </div>
        </section>

        {/* ─── Cached Movies Table ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#d4a853]" /> Cached Movies
            {(cache?.totalEntries ?? 0) > 0 && <span className="text-xs font-normal text-[#6b7280] ml-1">({cache?.totalEntries} entries)</span>}
          </h2>
          {sortedMovies.length === 0 ? (
            <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-12 text-center">
              <Database className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
              <p className="text-[#6b7280] text-sm">No cached movies yet</p>
              <p className="text-[#4a4a5a] text-xs mt-1">Process movies through batch below to populate cache</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0e0e16] z-10 border-b border-[#1e1e28]">
                    <tr>
                      <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs uppercase tracking-wider">
                        <button onClick={() => handleSort('title')} className="flex items-center hover:text-white transition-colors">Title <SortIcon field="title" /></button>
                      </th>
                      <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs uppercase tracking-wider">TMDb ID</th>
                      <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs uppercase tracking-wider">
                        <button onClick={() => handleSort('completeness')} className="flex items-center hover:text-white transition-colors">Quality <SortIcon field="completeness" /></button>
                      </th>
                      <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs uppercase tracking-wider">Sources</th>
                      <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs uppercase tracking-wider">
                        <button onClick={() => handleSort('createdAt')} className="flex items-center hover:text-white transition-colors">Created <SortIcon field="createdAt" /></button>
                      </th>
                      <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs uppercase tracking-wider">
                        <button onClick={() => handleSort('hitCount')} className="flex items-center hover:text-white transition-colors">Hits <SortIcon field="hitCount" /></button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a25]">
                    {sortedMovies.map(movie => (
                      <tr key={movie.key} className="hover:bg-[#111118]/50 transition-colors">
                        <td className="px-4 py-3"><span className="text-white font-medium text-sm truncate block max-w-[200px]">{movie.title}</span></td>
                        <td className="px-4 py-3"><span className="text-[#6b7280] font-mono text-xs">{movie.tmdbId}</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${completenessBg(movie.completeness)} ${completenessColor(movie.completeness)}`}>
                            {movie.completeness}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {movie.sources.map(s => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[#111118] text-[#9ca3af] border border-[#1e1e28]">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#6b7280] text-xs whitespace-nowrap">{formatDate(movie.createdAt)}</td>
                        <td className="px-4 py-3 text-[#6b7280] text-xs text-center">{movie.hitCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ─── Batch Processing ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#d4a853]" /> Batch Processing
          </h2>
          <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-6">
            <div className="mb-4">
              <label className="text-sm font-medium text-white mb-2 block">Enter TMDb IDs</label>
              <Textarea
                value={batchInput}
                onChange={e => setBatchInput(e.target.value)}
                placeholder="Enter TMDb IDs separated by commas or newlines&#10;e.g. 550, 155, 680"
                className="bg-[#050507] border-[#1e1e28] text-white placeholder:text-[#4a4a5a] min-h-[100px] resize-y focus:border-[#d4a853] focus-visible:ring-[#d4a853]/20"
              />
            </div>
            <Button onClick={handleBatchProcess} disabled={batchProcessing || !batchInput.trim()} className="bg-[#d4a853] hover:bg-[#b8922e] text-white">
              {batchProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Zap className="w-4 h-4" /> Process Batch</>}
            </Button>
            {batchResult && (
              <div className="mt-6 border-t border-[#1e1e28] pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-lg bg-[#050507] border border-[#1e1e28] p-3 text-center">
                    <p className="text-lg font-bold text-white">{batchResult.totalProcessed}</p><p className="text-[#6b7280] text-[10px]">Processed</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">{batchResult.successCount}</p><p className="text-[#6b7280] text-[10px]">Succeeded</p>
                  </div>
                  <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-3 text-center">
                    <p className="text-lg font-bold text-red-400">{batchResult.failureCount}</p><p className="text-[#6b7280] text-[10px]">Failed</p>
                  </div>
                  <div className="rounded-lg bg-[#050507] border border-[#1e1e28] p-3 text-center">
                    <p className="text-lg font-bold text-white">{(batchResult.totalDurationMs / 1000).toFixed(1)}s</p><p className="text-[#6b7280] text-[10px]">Duration</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── API Key Config ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-[#d4a853]" /> API Key Configuration
          </h2>
          <div className="rounded-xl border border-[#1e1e28] bg-[#0c0c10] backdrop-blur-xl p-6">
            <p className="text-[#9ca3af] text-sm mb-5">
              Add these to your <code className="text-[#d4a853] bg-[#d4a853]/10 px-1.5 py-0.5 rounded text-xs">.env.local</code> file.
            </p>
            <div className="space-y-2">
              {[
                { name: 'TMDB_API_KEY', desc: 'Required — Primary movie data', ok: sources?.tmdb },
                { name: 'OMDB_API_KEY', desc: 'Recommended — IMDb ratings, RT %, Metascore', ok: sources?.omdb },
                { name: 'SCRAPINGANT_KEY_1-5', desc: 'Required for scraping — 5-key rotation (10K each/month)', ok: status?.status?.scrapingEnabled },
                { name: 'YOUTUBE_API_KEY', desc: 'Optional — Trailer search', ok: sources?.youtube },
                { name: 'NEWS_API_KEY', desc: 'Optional — Movie news', ok: sources?.newsapi },
                { name: 'NEWSDATA_IO_API_KEY', desc: 'Optional — Supplementary news', ok: sources?.newsdataIo },
                { name: 'FANART_TV_API_KEY', desc: 'Optional — High-quality logos and clearart', ok: sources?.fanartTv },
                { name: 'GEMINI_API_KEY', desc: 'Optional — AI review generation', ok: sources?.gemini },
              ].map(env => (
                <div key={env.name} className="flex items-center gap-3 p-3 rounded-lg bg-[#050507] border border-[#1e1e28]">
                  {env.ok ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <code className="text-white font-mono text-sm bg-[#111118] px-2 py-0.5 rounded">{env.name}</code>
                    <span className="text-[#6b7280] text-xs ml-2">{env.desc}</span>
                  </div>
                  {env.ok && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">SET</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
