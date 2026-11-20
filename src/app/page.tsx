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
import PopularPeopleSection from '@/sections/PopularPeopleSection';
import LatestReviews from '@/sections/LatestReviews';
import TopRatedSection from '@/sections/TopRatedSection';
import CommunityReviews from '@/sections/CommunityReviews';
import NewsSection from '@/sections/NewsSection';
import NewsletterCTA from '@/sections/NewsletterCTA';
import NowStreamingSection from '@/sections/NowStreamingSection';
import TopChoiceSection from '@/sections/TopChoiceSection';
import VaultSection from '@/sections/VaultSection';
import TrendingSpotlight from '@/components/promo/TrendingSpotlight';
import TiltCarousel from '@/components/promo/TiltCarousel';
import TrendingCompactGrid from '@/components/promo/TrendingCompactGrid';
import TallRichPopup from '@/components/promo/TallRichPopup';
import { Sparkles, Clock, Users, Film, MonitorPlay, Flame, ArrowRight } from 'lucide-react';
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
          // eslint-disable-next-line react-hooks/set-state-in-effect -- load initial state from localStorage on mount (SSR-safe via 'use client')
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
      {/* Packed trending showcase (user request: full, not sparse): 3D coverflow carousel + hero spotlight card side by side, split-card row below */}
      <section className="py-16 bg-[#050507]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="reveal-section flex items-center justify-between mb-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0c0c10] border border-[#D4A853]/25 shadow-sm">
              <Flame className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none m-0">Trending Spotlight</h2>
            </div>
            <Link href="/browse" aria-label="Browse all trending titles" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-[#D4A853] hover:text-[#D4A853] transition-colors">
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="flex flex-col xl:flex-row items-center justify-center gap-10">
            <TiltCarousel bare />
            <TrendingSpotlight bare />
          </div>
          <div className="mt-14">
            <TrendingCompactGrid offset={3} />
          </div>
        </div>
      </section>
      <TopChoiceSection />
      <NowStreamingSection />
      <VaultSection />
      <UpcomingMoviesSection />
      <MoodBrowsingSection />
      <CategoriesGrid />
      <TrendingAnimeSection />
      <PopularPeopleSection />
      <LatestReviews />
      <TopRatedSection />
      <CommunityReviews />
      <NewsSection />
      <NewsletterCTA />
      <TallRichPopup />
    </div>
  );
}
