'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Plus, Search, Globe, MessageSquare, X,
  UserPlus, UserMinus, CheckCircle2, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';

interface Community {
  id: string;
  name: string;
  members: number;
  description: string;
  type: string;
  posts: number;
}

const ALL_COMMUNITIES: Community[] = [
  { name: 'Horror Fans', members: 1240, description: 'For lovers of horror and thriller films. Discuss the scariest movies and share recommendations.', id: 'horror-fans', type: 'Genre', posts: 340 },
  { name: 'K-Drama Club', members: 3420, description: 'Korean drama discussions, episode reviews, and recommendations for all K-drama fans.', id: 'k-drama-club', type: 'Country', posts: 890 },
  { name: 'Nollywood Watchers', members: 890, description: 'Celebrating Nigerian cinema, Nollywood classics, and the new wave of African filmmaking.', id: 'nollywood-watchers', type: 'Country', posts: 210 },
  { name: 'Christopher Nolan Fans', members: 2100, description: 'Deep dives into Nolan\'s filmography, filmmaking techniques, and upcoming projects.', id: 'nolan-fans', type: 'Creator', posts: 560 },
  { name: 'Anime Explorers', members: 5600, description: 'Anime recommendations, seasonal discussions, and reviews from casual to hardcore fans.', id: 'anime-explorers', type: 'Theme', posts: 1200 },
  { name: 'Classic Cinema', members: 780, description: 'Pre-1970s cinema appreciation, restoration news, and deep cuts from the golden age.', id: 'classic-cinema', type: 'Theme', posts: 180 },
  { name: 'Sci-Fi Universe', members: 2800, description: 'From Blade Runner to Dune — exploring science fiction in film and television.', id: 'scifi-universe', type: 'Genre', posts: 670 },
  { name: 'Indie Film Lovers', members: 950, description: 'Independent cinema, film festival coverage, and hidden gem recommendations.', id: 'indie-film-lovers', type: 'Theme', posts: 290 },
  { name: 'Bollywood Beats', members: 1650, description: 'Bollywood movie discussions, music, and the latest releases from Indian cinema.', id: 'bollywood-beats', type: 'Country', posts: 420 },
  { name: 'Documentary Circle', members: 620, description: 'True crime, nature, social issues — documentary fans unite.', id: 'documentary-circle', type: 'Genre', posts: 150 },
  { name: 'Romance Readers & Watchers', members: 1100, description: 'For those who love a good love story — books and films alike.', id: 'romance-fans', type: 'Genre', posts: 310 },
  { name: 'A24 Appreciation', members: 3400, description: 'Everything A24 — from Moonlight to Everything Everywhere All at Once.', id: 'a24-appreciation', type: 'Creator', posts: 890 },
];

const TYPE_FILTERS = ['All', 'Genre', 'Country', 'Theme', 'Creator'];

const JOINED_KEY = 'typescribe_joined_communities';
const CREATED_KEY = 'typescribe_created_communities';

function getJoinedCommunities(): string[] {
  try {
    const data = localStorage.getItem(JOINED_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveJoinedCommunities(ids: string[]) {
  localStorage.setItem(JOINED_KEY, JSON.stringify(ids));
}

function getCreatedCommunities(): Community[] {
  try {
    const data = localStorage.getItem(CREATED_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveCreatedCommunities(communities: Community[]) {
  localStorage.setItem(CREATED_KEY, JSON.stringify(communities));
}

export default function CommunitiesPage() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [createdCommunities, setCreatedCommunities] = useState<Community[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('Theme');

  useEffect(() => {
    setJoinedIds(getJoinedCommunities());
    setCreatedCommunities(getCreatedCommunities());
  }, []);

  const allCommunities = [...createdCommunities, ...ALL_COMMUNITIES];

  const filtered = allCommunities.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const myCommunities = allCommunities.filter(c => joinedIds.includes(c.id));

  const handleJoinToggle = (communityId: string) => {
    if (!isAuthenticated) return;
    const current = getJoinedCommunities();
    let updated: string[];
    if (current.includes(communityId)) {
      updated = current.filter(id => id !== communityId);
    } else {
      updated = [...current, communityId];
    }
    saveJoinedCommunities(updated);
    setJoinedIds(updated);
  };

  const handleCreateCommunity = () => {
    if (!newName.trim() || !newDescription.trim()) return;

    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const newCommunity: Community = {
      id: slug,
      name: newName.trim(),
      description: newDescription.trim(),
      type: newType,
      members: 1,
      posts: 0,
    };

    const existing = getCreatedCommunities();
    existing.unshift(newCommunity);
    saveCreatedCommunities(existing);
    setCreatedCommunities([newCommunity, ...createdCommunities]);

    // Auto-join created community
    const joined = getJoinedCommunities();
    if (!joined.includes(slug)) {
      joined.push(slug);
      saveJoinedCommunities(joined);
      setJoinedIds(joined);
    }

    setNewName('');
    setNewDescription('');
    setNewType('Theme');
    setShowCreateDialog(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Communities</h1>
            <p className="text-[#a0a0b0]">Join communities, discuss movies, and share recommendations.</p>
          </div>
          {isAuthenticated && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2"
            >
              <Plus className="w-4 h-4" /> Create Community
            </Button>
          )}
        </div>

        {/* My Communities Section */}
        {isAuthenticated && myCommunities.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">My Communities</h2>
              <span className="text-xs text-[#6b6b7b] bg-[#12121a] border border-[#2a2a35] px-2 py-0.5 rounded-full">
                {myCommunities.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCommunities.map((community) => (
                <Link
                  key={community.id}
                  href={`/community/${community.id}`}
                  className="bg-[#12121a] border border-[#e50914]/20 rounded-xl p-5 hover:border-[#e50914]/40 transition-all hover:shadow-lg hover:shadow-[#e50914]/5 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-white group-hover:text-[#e50914] transition-colors mb-1">
                        {community.name}
                      </h3>
                      <span className="text-xs text-[#e50914] bg-[#e50914]/10 px-2 py-0.5 rounded-full">{community.type}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleJoinToggle(community.id);
                      }}
                      className="border-[#2a2a35] text-[#e50914] hover:text-white hover:bg-[#e50914] hover:border-[#e50914] text-xs gap-1"
                    >
                      <UserMinus className="w-3 h-3" /> Leave
                    </Button>
                  </div>
                  <p className="text-sm text-[#a0a0b0] mb-4 line-clamp-2">{community.description}</p>
                  <div className="flex items-center gap-4 text-xs text-[#6b6b7b]">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {community.members.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {community.posts}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7b]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities..."
              className="w-full bg-[#12121a] border border-[#2a2a35] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914]"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {TYPE_FILTERS.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  typeFilter === type ? 'bg-[#e50914] text-white' : 'bg-[#12121a] border border-[#2a2a35] text-[#a0a0b0] hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* All Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((community) => {
            const isJoined = joinedIds.includes(community.id);
            return (
              <Link
                key={community.id}
                href={`/community/${community.id}`}
                className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] transition-all hover:shadow-lg hover:shadow-black/20 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-[#e50914] transition-colors mb-1">
                      {community.name}
                    </h3>
                    <span className="text-xs text-[#e50914] bg-[#e50914]/10 px-2 py-0.5 rounded-full">{community.type}</span>
                  </div>
                  {isAuthenticated ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleJoinToggle(community.id);
                      }}
                      className={`text-xs gap-1 ${
                        isJoined
                          ? 'border-[#e50914]/30 text-[#e50914] hover:text-white hover:bg-[#e50914] hover:border-[#e50914]'
                          : 'border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#e50914] hover:border-[#e50914]'
                      }`}
                    >
                      {isJoined ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                      {isJoined ? 'Joined' : 'Join'}
                    </Button>
                  ) : (
                    <Link href="/login" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="border-[#2a2a35] text-[#a0a0b0] text-xs">Join</Button>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-[#a0a0b0] mb-4 line-clamp-2">{community.description}</p>
                <div className="flex items-center gap-4 text-xs text-[#6b6b7b]">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {community.members.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {community.posts}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
            <p className="text-[#a0a0b0]">No communities found matching your search.</p>
          </div>
        )}

        {/* Create Community Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-[#12121a] border-[#2a2a35] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Create a Community</DialogTitle>
              <DialogDescription className="text-[#a0a0b0]">
                Start a new community for movie fans to connect and discuss.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-[#a0a0b0] mb-1.5 block">Community Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Horror Film Club"
                  className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#a0a0b0] mb-1.5 block">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What's your community about?"
                  rows={3}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#a0a0b0] mb-1.5 block">Category</label>
                <div className="flex gap-2 flex-wrap">
                  {['Genre', 'Country', 'Theme', 'Creator'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewType(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        newType === type
                          ? 'bg-[#e50914] text-white'
                          : 'bg-[#0a0a0f] border border-[#2a2a35] text-[#a0a0b0] hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCommunity}
                disabled={!newName.trim() || !newDescription.trim()}
                className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2"
              >
                <Sparkles className="w-4 h-4" /> Create Community
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
