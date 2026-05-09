'use client';
import { useEffect, useState } from 'react';
import { initLenis, animateHero, initScrollReveal, cleanupAnimations } from '@/lib/animations';
import HeroSection from '@/sections/HeroSection';
import LocalPicksSection from '@/sections/LocalPicksSection';
import CountryPicksSection from '@/sections/CountryPicksSection';
import TrendingCarousel from '@/sections/TrendingCarousel';
import MoodBrowsingSection from '@/sections/MoodBrowsingSection';
import UpcomingMoviesSection from '@/sections/UpcomingMoviesSection';
import CategoriesGrid from '@/sections/CategoriesGrid';
import TrendingAnimeSection from '@/sections/TrendingAnimeSection';
import LatestReviews from '@/sections/LatestReviews';
import TopRatedSection from '@/sections/TopRatedSection';
import CommunityReviews from '@/sections/CommunityReviews';
import NewsSection from '@/sections/NewsSection';
import NewsletterCTA from '@/sections/NewsletterCTA';
import NowStreamingSection from '@/sections/NowStreamingSection';
import TopChoiceSection from '@/sections/TopChoiceSection';
import VaultSection from '@/sections/VaultSection';
import { Sparkles, Clock, Users, Film, MonitorPlay } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [isReturning, setIsReturning] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Mark page as Lenis-active so CSS reveal animations don't interfere with GSAP
    document.documentElement.classList.add('lenis-active');
    const lenis = initLenis();
    const heroTl = animateHero();
    initScrollReveal();
    return () => {
      heroTl.kill();
      cleanupAnimations();
      document.documentElement.classList.remove('lenis-active');
    };
  }, []);

  useEffect(() => {
    // Check if returning user
    try {
      const profile = localStorage.getItem('typescribe_user_profile');
      if (profile) {
        const parsed = JSON.parse(profile);
        if (parsed.display_name) {
          setIsReturning(true);
          setUserName(parsed.display_name);
        }
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <div>
      <HeroSection />

      {/* Welcome back banner for returning users */}
      {isReturning && (
        <section className="py-6 bg-gradient-to-r from-[#D4A853]/5 via-[#0a0a0f] to-[#D4A853]/5 border-b border-[#1e1e28]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold text-white">Welcome back, {userName}!</h2>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link href="/dashboard/watchlist" className="flex items-center gap-2 px-3 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">
                <Clock className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} /> Continue Watching
              </Link>
              <Link href="/dashboard/communities" className="flex items-center gap-2 px-3 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">
                <Users className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} /> Your Communities
              </Link>
              <Link href="/browse" className="flex items-center gap-2 px-3 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">
                <Film className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} /> Discover New
              </Link>
              <Link href="/stream" className="flex items-center gap-2 px-3 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">
                <MonitorPlay className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} /> Stream Free
              </Link>
            </div>
          </div>
        </section>
      )}

      <LocalPicksSection />
      <CountryPicksSection />
      <TrendingCarousel />
      <TopChoiceSection />
      <NowStreamingSection />
      <VaultSection />
      <UpcomingMoviesSection />
      <MoodBrowsingSection />
      <CategoriesGrid />
      <TrendingAnimeSection />
      <LatestReviews />
      <TopRatedSection />
      <CommunityReviews />
      <NewsSection />
      <NewsletterCTA />
    </div>
  );
}
