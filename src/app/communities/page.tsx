'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Plus, Search, MessageSquare,
  UserPlus, UserMinus, CheckCircle2, Sparkles, Bell,
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
import { CommunityCardSkeleton } from '@/components/skeletons/CommunitySkeleton';
import TasteMatchBadge from '@/components/community/TasteMatchBadge';
import ActivityFeed from '@/components/community/ActivityFeed';
import SmartRecommendations from '@/components/community/SmartRecommendationsWidget';
import { getJoinedCommunities as getJoinedCommunityIds, saveJoinedCommunities as saveJoinedCommunityIds } from '@/lib/community-storage';

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

const CREATED_KEY = 'typescribe_created_communities';

// Re-export with shorter names for use in this component
const getJoinedCommunities = getJoinedCommunityIds;
const saveJoinedCommunities = saveJoinedCommunityIds;

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
  const { isAuthenticated, user } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [createdCommunities, setCreatedCommunities] = useState<Community[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('Theme');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate brief loading state to show skeleton
    const timer = setTimeout(() => setIsLoading(false), 600);
    setJoinedIds(getJoinedCommunities());
    setCreatedCommunities(getCreatedCommunities());
    return () => clearTimeout(timer);
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

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050507] pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="h-8 bg-[#1e1e28] rounded w-40 mb-2 animate-pulse" />
              <div className="h-4 bg-[#1e1e28] rounded w-64 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CommunityCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Communities</h1>
            <p className="text-[#9ca3af]">Join communities, discuss movies, and share recommendations.</p>
          </div>
          {isAuthenticated && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} /> Create Community
            </Button>
          )}
        </div>

        {/* My Communities Section */}
        {isAuthenticated && myCommunities.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-[#d4a853]" />
              <h2 className="text-lg font-semibold text-white">My Communities</h2>
              <span className="text-xs text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full">
                {myCommunities.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCommunities.map((community) => (
                <Link
                  key={community.id}
                  href={`/community/${community.id}`}
                  className="bg-[#0c0c10] border border-[#d4a853]/20 rounded-xl p-5 hover:border-[#d4a853]/40 transition-all hover:shadow-lg hover:shadow-[#d4a853]/5 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-white group-hover:text-[#d4a853] transition-colors mb-1">
                        {community.name}
                      </h3>
                      <span className="text-xs text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full">{community.type}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleJoinToggle(community.id);
                      }}
                      className="border-[#d4a853]/30 text-[#d4a853] hover:text-white hover:bg-[#d4a853] hover:border-[#d4a853] text-xs gap-1 min-h-[44px]"
                    >
                      <UserMinus className="w-3 h-3" /> Leave
                    </Button>
                  </div>
                  <p className="text-sm text-[#9ca3af] mb-4 line-clamp-2">{community.description}</p>
                  <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" strokeWidth={2.5} /> {community.members.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" strokeWidth={2.5} /> {community.posts}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Activity Feed for joined communities */}
        {isAuthenticated && joinedIds.length > 0 && (
          <div className="mb-8">
            <ActivityFeed joinedCommunityIds={joinedIds} maxItems={5} />
          </div>
        )}

        {/* Smart Recommendations */}
        {isAuthenticated && user?.favorite_genres && user.favorite_genres.length > 0 && (
          <div className="mb-8">
            <SmartRecommendations userGenres={user.favorite_genres} maxItems={4} />
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" strokeWidth={2.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities..."
              className="w-full bg-[#0c0c10] border border-[#1e1e28] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] min-h-[44px]"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {TYPE_FILTERS.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                  typeFilter === type ? 'bg-[#d4a853] text-white' : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
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
                className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 hover:border-[#3a3a45] transition-all hover:shadow-lg hover:shadow-black/20 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-[#d4a853] transition-colors mb-1">
                      {community.name}
                    </h3>
                    <span className="text-xs text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full">{community.type}</span>
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
                      className={`text-xs gap-1 min-h-[44px] ${
                        isJoined
                          ? 'border-[#d4a853]/30 text-[#d4a853] hover:text-white hover:bg-[#d4a853] hover:border-[#d4a853]'
                          : 'border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#d4a853] hover:border-[#d4a853]'
                      }`}
                    >
                      {isJoined ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                      {isJoined ? 'Joined' : 'Join'}
                    </Button>
                  ) : (
                    <Link href="/login" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="border-[#1e1e28] text-[#9ca3af] text-xs min-h-[44px]">Join</Button>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-[#9ca3af] mb-4 line-clamp-2">{community.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" strokeWidth={2.5} /> {community.members.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" strokeWidth={2.5} /> {community.posts}</span>
                  </div>
                  {/* Taste Match Badge for unjoined communities */}
                  {!isJoined && isAuthenticated && user?.favorite_genres && (
                    <TasteMatchBadge
                      userGenres={user.favorite_genres}
                      communityId={community.id}
                      communityName={community.name}
                      compact
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
            <p className="text-[#9ca3af]">No communities found matching your search.</p>
          </div>
        )}

        {/* Create Community Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-[#0c0c10] border-[#1e1e28] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Create a Community</DialogTitle>
              <DialogDescription className="text-[#9ca3af]">
                Start a new community for movie fans to connect and discuss.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-[#9ca3af] mb-1.5 block">Community Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Horror Film Club"
                  className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] text-sm min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#9ca3af] mb-1.5 block">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What's your community about?"
                  rows={3}
                  className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#9ca3af] mb-1.5 block">Category</label>
                <div className="flex gap-2 flex-wrap">
                  {['Genre', 'Country', 'Theme', 'Creator'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewType(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                        newType === type
                          ? 'bg-[#d4a853] text-white'
                          : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
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
                className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCommunity}
                disabled={!newName.trim() || !newDescription.trim()}
                className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2"
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
