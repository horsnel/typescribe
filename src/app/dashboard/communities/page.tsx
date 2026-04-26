'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Users, Plus, Search, Globe, Sparkles, Film } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const SAMPLE_COMMUNITIES = [
  { name: 'Horror Fans', members: 1240, description: 'For lovers of horror and thriller films', slug: 'horror-fans', type: 'Genre' },
  { name: 'K-Drama Club', members: 3420, description: 'Korean drama discussions and recommendations', slug: 'k-drama-club', type: 'Country' },
  { name: 'Nollywood Watchers', members: 890, description: 'Celebrating Nigerian cinema and Nollywood', slug: 'nollywood-watchers', type: 'Country' },
  { name: 'Christopher Nolan Fans', members: 2100, description: 'Everything about Nolan films and filmmaking', slug: 'nolan-fans', type: 'Creator' },
  { name: 'Anime Explorers', members: 5600, description: 'Anime recommendations, reviews, and discussions', slug: 'anime-explorers', type: 'Theme' },
  { name: 'Classic Cinema', members: 780, description: 'Pre-1970s cinema appreciation and discussion', slug: 'classic-cinema', type: 'Theme' },
];

export default function DashboardCommunitiesPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center"><p className="text-[#a0a0b0]">Please sign in to view your communities.</p><Link href="/login" className="text-[#e50914] hover:underline text-sm">Sign In</Link></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">My Communities</h1>
        <Link href="/communities"><Button className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2"><Plus className="w-4 h-4" />Create Community</Button></Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2a2a35]">
        {['Joined', 'Created', 'Discover'].map((tab, i) => (
          <button key={tab} className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${i === 0 ? 'text-white border-[#e50914]' : 'text-[#6b6b7b] border-transparent hover:text-white'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Discover Communities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SAMPLE_COMMUNITIES.map((community) => (
          <div key={community.slug} className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-white">{community.name}</h3>
                <span className="text-xs text-[#e50914] bg-[#e50914]/10 px-2 py-0.5 rounded-full">{community.type}</span>
              </div>
              <Button size="sm" variant="outline" className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] text-xs">Join</Button>
            </div>
            <p className="text-sm text-[#a0a0b0] mb-3">{community.description}</p>
            <div className="flex items-center gap-2 text-xs text-[#6b6b7b]">
              <Users className="w-3.5 h-3.5" /> {community.members.toLocaleString()} members
            </div>
          </div>
        ))}
      </div>
    </DashboardSidebar>
  );
}
