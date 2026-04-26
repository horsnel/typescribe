'use client';
import { useEffect } from 'react';
import { initLenis, animateHero, initScrollReveal, cleanupAnimations } from '@/lib/animations';
import HeroSection from '@/sections/HeroSection';
import LocalPicksSection from '@/sections/LocalPicksSection';
import TrendingCarousel from '@/sections/TrendingCarousel';
import CategoriesGrid from '@/sections/CategoriesGrid';
import LatestReviews from '@/sections/LatestReviews';
import TopRatedSection from '@/sections/TopRatedSection';
import CommunityReviews from '@/sections/CommunityReviews';
import NewsSection from '@/sections/NewsSection';
import NewsletterCTA from '@/sections/NewsletterCTA';

export default function HomePage() {
  useEffect(() => {
    const lenis = initLenis();
    const heroTl = animateHero();
    initScrollReveal();
    return () => { heroTl.kill(); cleanupAnimations(); };
  }, []);

  return (
    <div>
      <HeroSection />
      <LocalPicksSection />
      <TrendingCarousel />
      <CategoriesGrid />
      <LatestReviews />
      <TopRatedSection />
      <CommunityReviews />
      <NewsSection />
      <NewsletterCTA />
    </div>
  );
}
