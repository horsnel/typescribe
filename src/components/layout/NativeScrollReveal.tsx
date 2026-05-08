'use client';

import { useEffect, useRef } from 'react';

/**
 * NativeScrollReveal
 *
 * Lightweight scroll-reveal using IntersectionObserver.
 * Replaces Lenis + GSAP ScrollTrigger on non-home pages.
 *
 * Uses MutationObserver to catch elements added after
 * async data loads (e.g., movie detail page sections).
 *
 * The home page uses its own Lenis + GSAP setup.
 */
export default function NativeScrollReveal({ children }: { children: React.ReactNode }) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const mutationRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    const selectors = [
      '.reveal-section',
      '.card-reveal',
      '.carousel-card',
      '.content-animate',
      '.hero-animate',
    ];

    const observeElements = () => {
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          if (!el.classList.contains('revealed')) {
            observerRef.current?.observe(el);
          }
        });
      });
    };

    // Initial pass
    const initTimer = setTimeout(observeElements, 150);

    // Re-observe when new elements are added to the DOM
    // (catches async-loaded content like movie detail sections)
    let mutationDebounce: ReturnType<typeof setTimeout>;
    mutationRef.current = new MutationObserver(() => {
      clearTimeout(mutationDebounce);
      mutationDebounce = setTimeout(() => observeElements(), 150);
    });

    mutationRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(initTimer);
      observerRef.current?.disconnect();
      mutationRef.current?.disconnect();
    };
  }, []);

  return <>{children}</>;
}
