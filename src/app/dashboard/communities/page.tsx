'use client';

import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Users, Plus, Globe, Sparkles, Film, ExternalLink, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const ALL_COMMUNITIES = [
  { id: 'horror-fans', name: 'Horror Fans', members: 1240, description: 'For lovers of horror and thriller films', type: 'Genre' },
  { id: 'k-drama-club', name: 'K-Drama Club', members: 3420, description: 'Korean drama discussions and recommendations', type: 'Country' },
  { id: 'nollywood-watchers', name: 'Nollywood Watchers', members: 890, description: 'Celebrating Nigerian cinema and Nollywood', type: 'Country' },
  { id: 'nolan-fans', name: 'Christopher Nolan Fans', members: 2100, description: 'Everything about Nolan films and filmmaking', type: 'Creator' },
  { id: 'anime-explorers', name: 'Anime Explorers', members: 5600, description: 'Anime recommendations, reviews, and discussions', type: 'Theme' },
  { id: 'classic-cinema', name: 'Classic Cinema', members: 780, description: 'Pre-1970s cinema appreciation and discussion', type: 'Theme' },
  { id: 'sci-fi-nerds', name: 'Sci-Fi Nerds', members: 3200, description: 'Exploring the final frontier of cinema', type: 'Genre' },
  { id: 'indie-films', name: 'Indie Film Lovers', members: 1560, description: 'Independent and art-house cinema discussions', type: 'Theme' },
];

export default function DashboardCommunitiesPage() {
  const { user, isAuthenticated } = useAuth();
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'joined' | 'created' | 'discover'>('joined');

  useEffect(() => {
    try {
      const data = localStorage.getItem('typescribe_joined_communities');
      if (data) setJoinedIds(JSON.parse(data));
    } catch { /* ignore */ }
  }, []);

  const toggleJoin = (id: string) => {
    const updated = joinedIds.includes(id)
      ? joinedIds.filter(j => j !== id)
      : [...joinedIds, id];
    setJoinedIds(updated);
    localStorage.setItem('typescribe_joined_communities', JSON.stringify(updated));
  };

  const joinedCommunities = ALL_COMMUNITIES.filter(c => joinedIds.includes(c.id));

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center"><p className="text-[#a0a0b0]">Please sign in to view your communities.</p><Link href="/login" className="text-[#e50914] hover:underline text-sm">Sign In</Link></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">My Communities</h1>
        <Link href="/communities"><Button className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2"><Plus className="w-4 h-4" />Discover Communities</Button></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{joinedIds.length}</p>
          <p className="text-xs text-[#6b6b7b]">Communities Joined</p>
        </div>
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{joinedCommunities.reduce((sum, c) => sum + c.members, 0).toLocaleString()}</p>
          <p className="text-xs text-[#6b6b7b]">Total Members</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2a2a35]">
        {(['joined', 'discover'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? 'text-white border-[#e50914]' : 'text-[#6b6b7b] border-transparent hover:text-white'}`}
          >
            {tab === 'joined' ? `Joined (${joinedIds.length})` : 'Discover'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'joined' && (
        joinedCommunities.length === 0 ? (
          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No communities joined yet</h2>
            <p className="text-[#a0a0b0] mb-6">Join communities to discuss movies with like-minded fans.</p>
            <button onClick={() => setActiveTab('discover')} className="text-[#e50914] hover:underline text-sm">Discover Communities</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {joinedCommunities.map((community) => (
              <div key={community.id} className="bg-[#12121a] border border-[#e50914]/30 rounded-xl p-5 hover:border-[#e50914]/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/community/${community.id}`} className="text-base font-semibold text-white hover:text-[#e50914] transition-colors">
                      {community.name}
                    </Link>
                    <span className="text-xs text-[#e50914] bg-[#e50914]/10 px-2 py-0.5 rounded-full ml-2">{community.type}</span>
                  </div>
                  <Button size="sm" onClick={() => toggleJoin(community.id)} variant="outline" className="border-[#e50914]/30 text-[#e50914] hover:bg-[#e50914]/10 text-xs gap-1">
                    <LogOut className="w-3 h-3" />Leave
                  </Button>
                </div>
                <p className="text-sm text-[#a0a0b0] mb-3">{community.description}</p>
                <div className="flex items-center gap-2 text-xs text-[#6b6b7b]">
                  <Users className="w-3.5 h-3.5" /> {community.members.toLocaleString()} members
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'discover' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALL_COMMUNITIES.map((community) => {
            const isJoined = joinedIds.includes(community.id);
            return (
              <div key={community.id} className={`bg-[#12121a] border rounded-xl p-5 hover:border-[#3a3a45] transition-colors ${isJoined ? 'border-[#e50914]/30' : 'border-[#2a2a35]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/community/${community.id}`} className="text-base font-semibold text-white hover:text-[#e50914] transition-colors">
                      {community.name}
                    </Link>
                    <span className="text-xs text-[#e50914] bg-[#e50914]/10 px-2 py-0.5 rounded-full ml-2">{community.type}</span>
                  </div>
                  <Button size="sm" onClick={() => toggleJoin(community.id)} variant={isJoined ? 'outline' : 'default'} className={isJoined ? 'border-[#e50914]/30 text-[#e50914] hover:bg-[#e50914]/10 text-xs' : 'bg-[#e50914] hover:bg-[#b20710] text-white text-xs'}>
                    {isJoined ? 'Joined' : 'Join'}
                  </Button>
                </div>
                <p className="text-sm text-[#a0a0b0] mb-3">{community.description}</p>
                <div className="flex items-center gap-2 text-xs text-[#6b6b7b]">
                  <Users className="w-3.5 h-3.5" /> {community.members.toLocaleString()} members
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardSidebar>
  );
}
