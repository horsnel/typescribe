'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Shield, AlertTriangle, Eye, Clock, Plus, X,
  ChevronDown, ChevronUp, MessageSquare, Skull,
} from 'lucide-react';

// ─── Types ───

interface ParentalGuidanceProps {
  movieTitle: string;
  movieId: number;
  genres: Array<{ id: number; name: string }>;
}

type SeverityLevel = 'none' | 'mild' | 'moderate' | 'severe';

interface ContentCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  severity: SeverityLevel;
  description?: string;
}

interface SkipTimestamp {
  id: number;
  startTime: string; // mm:ss format
  endTime: string;
  description: string;
  category: string;
  addedBy: string;
}

interface ContentAdvisory {
  id: number;
  category: string;
  severity: SeverityLevel;
  note: string;
  addedBy: string;
  createdAt: string;
}

// ─── Genre → Severity mapping ───

const GENRE_SEVERITY_MAP: Record<string, Partial<Record<string, SeverityLevel>>> = {
  Horror: { frightening: 'severe', violence: 'moderate', substance: 'mild' },
  'TV Movie': { frightening: 'mild' },
  Action: { violence: 'moderate', frightening: 'mild' },
  Thriller: { violence: 'moderate', frightening: 'moderate', language: 'mild' },
  War: { violence: 'severe', frightening: 'moderate', language: 'moderate' },
  Crime: { violence: 'moderate', language: 'moderate', substance: 'mild' },
  Romance: { sexual: 'mild', language: 'none' },
  Comedy: { language: 'mild', sexual: 'none' },
  Drama: { language: 'mild', substance: 'mild' },
  'Science Fiction': { frightening: 'mild', violence: 'mild' },
  Fantasy: { violence: 'mild', frightening: 'mild' },
  Mystery: { frightening: 'mild', violence: 'mild' },
  Adventure: { violence: 'mild', frightening: 'mild' },
  Animation: { violence: 'none', frightening: 'none', sexual: 'none' },
  Documentary: { substance: 'mild' },
  Family: { violence: 'none', language: 'none', sexual: 'none', frightening: 'none' },
  Music: { substance: 'mild', sexual: 'mild' },
  History: { violence: 'moderate', language: 'mild' },
  Western: { violence: 'moderate', language: 'mild', substance: 'mild' },
};

// ─── Helpers ───

function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'none': return 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/25';
    case 'mild': return 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/25';
    case 'moderate': return 'bg-orange-500/15 text-orange-400 border-orange-500/25';
    case 'severe': return 'bg-[#e50914]/15 text-[#e50914] border-[#e50914]/25';
  }
}

function getSeverityDot(severity: SeverityLevel): string {
  switch (severity) {
    case 'none': return 'bg-[#22c55e]';
    case 'mild': return 'bg-[#f59e0b]';
    case 'moderate': return 'bg-orange-400';
    case 'severe': return 'bg-[#e50914]';
  }
}

function calculateAgeRecommendation(categories: ContentCategory[]): number {
  const hasSevere = categories.some(c => c.severity === 'severe');
  const hasModerate = categories.filter(c => c.severity === 'moderate').length;
  const severeCount = categories.filter(c => c.severity === 'severe').length;

  if (severeCount >= 2) return 18;
  if (hasSevere) return 16;
  if (hasModerate >= 2) return 15;
  if (hasModerate >= 1) return 13;
  if (categories.some(c => c.severity === 'mild')) return 10;
  return 6;
}

function autoDetectCategories(genres: Array<{ id: number; name: string }>): ContentCategory[] {
  const baseCategories: ContentCategory[] = [
    { id: 'violence', label: 'Violence', icon: <Skull className="w-3.5 h-3.5" />, severity: 'none' },
    { id: 'language', label: 'Language', icon: <MessageSquare className="w-3.5 h-3.5" />, severity: 'none' },
    { id: 'sexual', label: 'Sexual Content', icon: <Eye className="w-3.5 h-3.5" />, severity: 'none' },
    { id: 'substance', label: 'Substance Use', icon: <AlertTriangle className="w-3.5 h-3.5" />, severity: 'none' },
    { id: 'frightening', label: 'Frightening Scenes', icon: <Skull className="w-3.5 h-3.5" />, severity: 'none' },
  ];

  // Apply genre-based severity
  const categoryMap: Record<string, SeverityLevel> = {};

  for (const genre of genres) {
    const mapping = GENRE_SEVERITY_MAP[genre.name];
    if (mapping) {
      for (const [catId, severity] of Object.entries(mapping)) {
        // Take the highest severity
        const current = categoryMap[catId];
        const levels: SeverityLevel[] = ['none', 'mild', 'moderate', 'severe'];
        if (!current || levels.indexOf(severity) > levels.indexOf(current)) {
          categoryMap[catId] = severity;
        }
      }
    }
  }

  return baseCategories.map(cat => ({
    ...cat,
    severity: categoryMap[cat.id] || 'none',
  }));
}

function getStorageKey(movieId: number): string {
  return `typescribe_parental_guidance_${movieId}`;
}

function loadSavedData(movieId: number): {
  categories: ContentCategory[] | null;
  timestamps: SkipTimestamp[];
  advisories: ContentAdvisory[];
} {
  if (typeof window === 'undefined') return { categories: null, timestamps: [], advisories: [] };
  try {
    const data = localStorage.getItem(getStorageKey(movieId));
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return { categories: null, timestamps: [], advisories: [] };
}

function saveData(movieId: number, data: {
  categories: ContentCategory[];
  timestamps: SkipTimestamp[];
  advisories: ContentAdvisory[];
}): void {
  try {
    localStorage.setItem(getStorageKey(movieId), JSON.stringify(data));
  } catch { /* ignore */ }
}

// ─── Component ───

export default function ParentalGuidance({ movieTitle, movieId, genres }: ParentalGuidanceProps) {
  const [expanded, setExpanded] = useState(false);
  // Initialize categories based on genres (lazy init from localStorage)
  const [categories, setCategories] = useState<ContentCategory[]>(() => {
    const saved = loadSavedData(movieId);
    return saved.categories || autoDetectCategories(genres);
  });
  const [timestamps, setTimestamps] = useState<SkipTimestamp[]>(() => {
    const saved = loadSavedData(movieId);
    return saved.timestamps || [];
  });
  const [advisories, setAdvisories] = useState<ContentAdvisory[]>(() => {
    const saved = loadSavedData(movieId);
    return saved.advisories || [];
  });

  // Form states
  const [showTimestampForm, setShowTimestampForm] = useState(false);
  const [showAdvisoryForm, setShowAdvisoryForm] = useState(false);
  const [newTimestamp, setNewTimestamp] = useState({ startTime: '', endTime: '', description: '', category: 'violence' });
  const [newAdvisory, setNewAdvisory] = useState({ category: 'violence', severity: 'mild' as SeverityLevel, note: '' });

  const persistData = useCallback((cats: ContentCategory[], ts: SkipTimestamp[], adv: ContentAdvisory[]) => {
    saveData(movieId, { categories: cats, timestamps: ts, advisories: adv });
  }, [movieId]);

  const handleSeverityChange = (categoryId: string, severity: SeverityLevel) => {
    const updated = categories.map(c =>
      c.id === categoryId ? { ...c, severity } : c
    );
    setCategories(updated);
    persistData(updated, timestamps, advisories);
  };

  const handleAddTimestamp = () => {
    if (!newTimestamp.startTime || !newTimestamp.description) return;
    const ts: SkipTimestamp = {
      id: Date.now(),
      startTime: newTimestamp.startTime,
      endTime: newTimestamp.endTime || newTimestamp.startTime,
      description: newTimestamp.description,
      category: newTimestamp.category,
      addedBy: 'You',
    };
    const updated = [...timestamps, ts];
    setTimestamps(updated);
    persistData(categories, updated, advisories);
    setNewTimestamp({ startTime: '', endTime: '', description: '', category: 'violence' });
    setShowTimestampForm(false);
  };

  const handleRemoveTimestamp = (id: number) => {
    const updated = timestamps.filter(t => t.id !== id);
    setTimestamps(updated);
    persistData(categories, updated, advisories);
  };

  const handleAddAdvisory = () => {
    if (!newAdvisory.note.trim()) return;
    const advisory: ContentAdvisory = {
      id: Date.now(),
      category: newAdvisory.category,
      severity: newAdvisory.severity,
      note: newAdvisory.note.trim(),
      addedBy: 'You',
      createdAt: new Date().toISOString(),
    };
    const updated = [...advisories, advisory];
    setAdvisories(updated);
    persistData(categories, timestamps, updated);
    setNewAdvisory({ category: 'violence', severity: 'mild', note: '' });
    setShowAdvisoryForm(false);
  };

  const ageRecommendation = useMemo(() => calculateAgeRecommendation(categories), [categories]);
  const hasAnyWarning = categories.some(c => c.severity !== 'none');

  const categoryOptions = [
    { value: 'violence', label: 'Violence' },
    { value: 'language', label: 'Language' },
    { value: 'sexual', label: 'Sexual Content' },
    { value: 'substance', label: 'Substance Use' },
    { value: 'frightening', label: 'Frightening' },
  ];

  return (
    <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#1a1a25] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#f59e0b]" />
          <h2 className="text-lg font-bold text-white">Parental Guidance</h2>
          {hasAnyWarning && (
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getSeverityColor(
              categories.some(c => c.severity === 'severe') ? 'severe'
                : categories.some(c => c.severity === 'moderate') ? 'moderate'
                : 'mild'
            )}`}>
              {ageRecommendation}+
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-5 h-5 text-[#6b6b7b]" />
          : <ChevronDown className="w-5 h-5 text-[#6b6b7b]" />
        }
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5">
          {/* ─── Age Recommendation ─── */}
          <div className="flex items-center gap-4 bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#f59e0b]/10 border-2 border-[#f59e0b]/30 flex items-center justify-center">
              <span className="text-xl font-black text-[#f59e0b]">{ageRecommendation}+</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Recommended for ages {ageRecommendation} and up</p>
              <p className="text-xs text-[#6b6b7b] mt-0.5">
                Based on content severity analysis{genres.length > 0 ? ` for ${genres.slice(0, 3).map(g => g.name).join(', ')}${genres.length > 3 ? '...' : ''}` : ''}
              </p>
            </div>
          </div>

          {/* ─── Content Warning Categories ─── */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
              Content Warnings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getSeverityDot(category.severity)}`} />
                    <span className="text-sm text-[#a0a0b0] flex items-center gap-1.5">
                      {category.icon}
                      {category.label}
                    </span>
                  </div>
                  <select
                    value={category.severity}
                    onChange={(e) => handleSeverityChange(category.id, e.target.value as SeverityLevel)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer bg-transparent ${getSeverityColor(category.severity as SeverityLevel)}`}
                  >
                    <option value="none">None</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Skip Timestamps ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#a855f7]" />
                Skip Timestamps
              </h3>
              <button
                onClick={() => setShowTimestampForm(!showTimestampForm)}
                className="text-[10px] text-[#a855f7] hover:text-[#a855f7]/80 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {/* Timestamp Form */}
            {showTimestampForm && (
              <div className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-4 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#6b6b7b] mb-1 block">Start Time (mm:ss)</label>
                    <input
                      type="text"
                      value={newTimestamp.startTime}
                      onChange={(e) => setNewTimestamp({ ...newTimestamp, startTime: e.target.value })}
                      placeholder="12:30"
                      className="w-full bg-[#12121a] border border-[#2a2a35] rounded-md py-1.5 px-2.5 text-sm text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#a855f7]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#6b6b7b] mb-1 block">End Time (mm:ss)</label>
                    <input
                      type="text"
                      value={newTimestamp.endTime}
                      onChange={(e) => setNewTimestamp({ ...newTimestamp, endTime: e.target.value })}
                      placeholder="13:45"
                      className="w-full bg-[#12121a] border border-[#2a2a35] rounded-md py-1.5 px-2.5 text-sm text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#a855f7]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#6b6b7b] mb-1 block">Category</label>
                  <select
                    value={newTimestamp.category}
                    onChange={(e) => setNewTimestamp({ ...newTimestamp, category: e.target.value })}
                    className="w-full bg-[#12121a] border border-[#2a2a35] rounded-md py-1.5 px-2.5 text-sm text-[#a0a0b0] focus:outline-none focus:border-[#a855f7]"
                  >
                    {categoryOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#6b6b7b] mb-1 block">Description</label>
                  <input
                    type="text"
                    value={newTimestamp.description}
                    onChange={(e) => setNewTimestamp({ ...newTimestamp, description: e.target.value })}
                    placeholder="Briefly describe the scene to skip"
                    className="w-full bg-[#12121a] border border-[#2a2a35] rounded-md py-1.5 px-2.5 text-sm text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#a855f7]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddTimestamp}
                    disabled={!newTimestamp.startTime || !newTimestamp.description}
                    className="text-xs bg-[#a855f7] hover:bg-[#a855f7]/80 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                  >
                    Add Timestamp
                  </button>
                  <button
                    onClick={() => setShowTimestampForm(false)}
                    className="text-xs text-[#6b6b7b] hover:text-white px-2 py-1.5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Timestamp List */}
            {timestamps.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {timestamps.map((ts) => (
                  <div
                    key={ts.id}
                    className="flex items-start gap-3 bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-3 group"
                  >
                    <div className="flex-shrink-0 flex items-center gap-1.5 bg-[#1a1a25] rounded px-2 py-1">
                      <Clock className="w-3 h-3 text-[#a855f7]" />
                      <span className="text-xs font-mono text-[#a855f7]">
                        {ts.startTime}
                        {ts.endTime !== ts.startTime && ` – ${ts.endTime}`}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#a0a0b0]">{ts.description}</p>
                      <span className="text-[10px] text-[#6b6b7b] capitalize">{ts.category}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveTimestamp(ts.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#6b6b7b] hover:text-[#e50914]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-4 text-center">
                <Clock className="w-6 h-6 text-[#2a2a35] mx-auto mb-2" />
                <p className="text-xs text-[#6b6b7b]">No skip timestamps added yet</p>
                <p className="text-[10px] text-[#2a2a35]">Add timestamps for intense scenes</p>
              </div>
            )}
          </div>

          {/* ─── Community Advisories ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#22c55e]" />
                Content Advisories
                {advisories.length > 0 && (
                  <span className="text-[10px] bg-[#22c55e]/10 text-[#22c55e] px-1.5 py-0.5 rounded-full">{advisories.length}</span>
                )}
              </h3>
              <button
                onClick={() => setShowAdvisoryForm(!showAdvisoryForm)}
                className="text-[10px] text-[#22c55e] hover:text-[#22c55e]/80 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Advisory
              </button>
            </div>

            {/* Advisory Form */}
            {showAdvisoryForm && (
              <div className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-4 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#6b6b7b] mb-1 block">Category</label>
                    <select
                      value={newAdvisory.category}
                      onChange={(e) => setNewAdvisory({ ...newAdvisory, category: e.target.value })}
                      className="w-full bg-[#12121a] border border-[#2a2a35] rounded-md py-1.5 px-2.5 text-sm text-[#a0a0b0] focus:outline-none focus:border-[#22c55e]"
                    >
                      {categoryOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#6b6b7b] mb-1 block">Severity</label>
                    <select
                      value={newAdvisory.severity}
                      onChange={(e) => setNewAdvisory({ ...newAdvisory, severity: e.target.value as SeverityLevel })}
                      className="w-full bg-[#12121a] border border-[#2a2a35] rounded-md py-1.5 px-2.5 text-sm text-[#a0a0b0] focus:outline-none focus:border-[#22c55e]"
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#6b6b7b] mb-1 block">Note</label>
                  <textarea
                    value={newAdvisory.note}
                    onChange={(e) => setNewAdvisory({ ...newAdvisory, note: e.target.value })}
                    placeholder="Describe the content concern..."
                    rows={2}
                    className="w-full bg-[#12121a] border border-[#2a2a35] rounded-md py-2 px-2.5 text-sm text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#22c55e] resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddAdvisory}
                    disabled={!newAdvisory.note.trim()}
                    className="text-xs bg-[#22c55e] hover:bg-[#22c55e]/80 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                  >
                    Submit Advisory
                  </button>
                  <button
                    onClick={() => setShowAdvisoryForm(false)}
                    className="text-xs text-[#6b6b7b] hover:text-white px-2 py-1.5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Advisory List */}
            {advisories.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {advisories.map((adv) => (
                  <div
                    key={adv.id}
                    className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getSeverityColor(adv.severity)}`}>
                        {adv.severity.charAt(0).toUpperCase() + adv.severity.slice(1)}
                      </span>
                      <span className="text-[10px] text-[#6b6b7b] capitalize">{adv.category}</span>
                      <span className="text-[10px] text-[#6b6b7b] ml-auto">by {adv.addedBy}</span>
                    </div>
                    <p className="text-sm text-[#a0a0b0]">{adv.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-4 text-center">
                <MessageSquare className="w-6 h-6 text-[#2a2a35] mx-auto mb-2" />
                <p className="text-xs text-[#6b6b7b]">No community advisories yet</p>
                <p className="text-[10px] text-[#2a2a35]">Help other parents by submitting content advisories</p>
              </div>
            )}
          </div>

          {/* ─── Disclaimer ─── */}
          <div className="flex items-start gap-2 pt-3 border-t border-[#2a2a35]/50">
            <AlertTriangle className="w-3.5 h-3.5 text-[#6b6b7b] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#6b6b7b] italic">
              Content ratings are auto-detected based on genre and may not reflect actual content.
              Parents should verify independently. Community advisories are user-submitted.
            </p>
          </div>
        </div>
      )}

      {/* Custom scrollbar */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #3a3a45; }
      `}</style>
    </div>
  );
}
