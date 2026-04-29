'use client';

import { useEffect, useRef } from 'react';

/**
 * NativeScrollReveal
 *
 * Lightweight replacement for SmoothScrollProvider on non-home pages.
 * Uses IntersectionObserver for scroll-triggered reveal animations
 * instead of Lenis + GSAP ScrollTrigger.
 *
 * This eliminates the "notebook page" scrolling feel caused by Lenis
 * smooth scroll while still providing elegant fade-in animations.
 *
 * The home page (src/app/page.tsx) initializes its own Lenis instance
 * for its showcase scroll experience.
 */
export default function NativeScrollReveal({ children }: { children: React.ReactNode }) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Small delay to allow DOM to settle after navigation
    const initTimer = setTimeout(() => {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed');
              // Only animate once
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.08,
          rootMargin: '0px 0px -8% 0px',
        }
      );

      // Observe all reveal-able elements
      const selectors = [
        '.reveal-section',
        '.card-reveal',
        '.carousel-card',
        '.content-animate',
        '.hero-animate',
      ];

      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          observerRef.current?.observe(el);
        });
      });
    }, 150);

    return () => {
      clearTimeout(initTimer);
      observerRef.current?.disconnect();
    };
  }, []);

  return <>{children}</>;
}
