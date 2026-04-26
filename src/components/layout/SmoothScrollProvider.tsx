'use client';

import { useEffect, useRef } from 'react';
import { initLenis, initScrollReveal, cleanupAnimations, animateHero } from '@/lib/animations';

/**
 * SmoothScrollProvider
 *
 * Initializes Lenis smooth scrolling and GSAP ScrollTrigger
 * scroll-reveal animations. Placed once in the root layout.
 *
 * Performance notes:
 * - Uses GSAP ticker (no separate rAF loop) to avoid double frames
 * - ScrollTrigger `once: true` prevents re-animations on scroll-back
 * - Lenis destroy/cleanup on unmount prevents memory leaks
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent double-init in React 18 Strict Mode
    if (initialized.current) return;
    initialized.current = true;

    // Initialize Lenis smooth scroll
    const lenis = initLenis();

    // Initialize scroll-reveal animations after a short delay
    // to allow the DOM to settle
    const revealTimer = setTimeout(() => {
      initScrollReveal();
      // Animate the hero if it exists on the current page
      const heroEl = document.querySelector('.hero-title');
      if (heroEl) {
        animateHero();
      }
    }, 300);

    return () => {
      clearTimeout(revealTimer);
      cleanupAnimations();
    };
  }, []);

  return <>{children}</>;
}
