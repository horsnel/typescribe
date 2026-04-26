'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Search, Globe, Sparkles, Film, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

const ALL_COMMUNITIES = [
  { name: 'Horror Fans', members: 1240, description: 'For lovers of horror and thriller films. Discuss the scariest movies and share recommendations.', slug: 'horror-fans', type: 'Genre', posts: 340 },
  { name: 'K-Drama Club', members: 3420, description: 'Korean drama discussions, episode reviews, and recommendations for all K-drama fans.', slug: 'k-drama-club', type: 'Country', posts: 890 },
  { name: 'Nollywood Watchers', members: 890, description: 'Celebrating Nigerian cinema, Nollywood classics, and the new wave of African filmmaking.', slug: 'nollywood-watchers', type: 'Country', posts: 210 },
  { name: 'Christopher Nolan Fans', members: 2100, description: 'Deep dives into Nolan\'s filmography, filmmaking techniques, and upcoming projects.', slug: 'nolan-fans', type: 'Creator', posts: 560 },
  { name: 'Anime Explorers', members: 5600, description: 'Anime recommendations, seasonal discussions, and reviews from casual to hardcore fans.', slug: 'anime-explorers', type: 'Theme', posts: 1200 },
  { name: 'Classic Cinema', members: 780, description: 'Pre-1970s cinema appreciation, restoration news, and deep cuts from the golden age.', slug: 'classic-cinema', type: 'Theme', posts: 180 },
  { name: 'Sci-Fi Universe', members: 2800, description: 'From Blade Runner to Dune — exploring science fiction in film and television.', slug: 'scifi-universe', type: 'Genre', posts: 670 },
  { name: 'Indie Film Lovers', members: 950, description: 'Independent cinema, film festival coverage, and hidden gem recommendations.', slug: 'indie-film-lovers', type: 'Theme', posts: 290 },
  { name: 'Bollywood Beats', members: 1650, description: 'Bollywood movie discussions, music, and the latest releases from Indian cinema.', slug: 'bollywood-beats', type: 'Country', posts: 420 },
  { name: 'Documentary Circle', members: 620, description: 'True crime, nature, social issues — documentary fans unite.', slug: 'documentary-circle', type: 'Genre', posts: 150 },
  { name: 'Romance Readers & Watchers', members: 1100, description: 'For those who love a good love story — books and films alike.', slug: 'romance-fans', type: 'Genre', posts: 310 },
  { name: 'A24 Appreciation', members: 3400, description: 'Everything A24 — from Moonlight to Everything Everywhere All at Once.', slug: 'a24-appreciation', type: 'Creator', posts: 890 },
];

const TYPE_FILTERS = ['All', 'Genre', 'Country', 'Theme', 'Creator'];

export default function CommunitiesPage() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = ALL_COMMUNITIES.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

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
            <Button className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2">
              <Plus className="w-4 h-4" /> Create Community
            </Button>
          )}
        </div>

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
          <div className="flex items-center gap-2">
            {TYPE_FILTERS.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === type ? 'bg-[#e50914] text-white' : 'bg-[#12121a] border border-[#2a2a35] text-[#a0a0b0] hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((community) => (
            <div key={community.slug} className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] transition-all hover:shadow-lg hover:shadow-black/20">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">{community.name}</h3>
                  <span className="text-xs text-[#e50914] bg-[#e50914]/10 px-2 py-0.5 rounded-full">{community.type}</span>
                </div>
                {isAuthenticated ? (
                  <Button size="sm" variant="outline" className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#e50914] hover:border-[#e50914] text-xs">Join</Button>
                ) : (
                  <Link href="/login"><Button size="sm" variant="outline" className="border-[#2a2a35] text-[#a0a0b0] text-xs">Join</Button></Link>
                )}
              </div>
              <p className="text-sm text-[#a0a0b0] mb-4 line-clamp-2">{community.description}</p>
              <div className="flex items-center gap-4 text-xs text-[#6b6b7b]">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {community.members.toLocaleString()}</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {community.posts}</span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
            <p className="text-[#a0a0b0]">No communities found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
