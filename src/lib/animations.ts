'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let rafId: number | null = null;

export function initLenis() {
  // Prevent duplicate initialization
  if (lenis) {
    cleanupAnimations();
  }

  lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Performance: reduce frequency of scroll events
    touchMultiplier: 1.5,
    // Reduce layout thrashing
    infinite: false,
  });

  // Use GSAP ticker instead of separate rAF loop to avoid double rAF calls
  // This reduces CPU usage significantly (fixes device heating)
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });

  // Remove the separate rAF loop — GSAP ticker handles it
  // This was causing double animation frames, leading to device overheating

  lenis.on('scroll', ScrollTrigger.update);

  // Performance: throttle ScrollTrigger refresh
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export function getLenis() { return lenis; }

export function scrollTo(target: string | number, options?: { offset?: number; duration?: number }) {
  if (lenis) lenis.scrollTo(target, options);
}

export function animateHero() {
  const tl = gsap.timeline({ delay: 0.3 });
  tl.fromTo('.hero-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' })
    .fromTo('.hero-subtitle', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.5')
    .fromTo('.hero-cta', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4')
    .fromTo('.scroll-indicator', { opacity: 0 }, { opacity: 1, duration: 0.5 }, '-=0.2');
  return tl;
}

export function initScrollReveal() {
  // Performance: Batch ScrollTrigger creation to reduce reflows
  // Use a single refresh at the end instead of per-trigger refresh
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true,
  });

  const triggers: ScrollTrigger[] = [];

  gsap.utils.toArray<HTMLElement>('.reveal-section').forEach((section) => {
    triggers.push(
      gsap.fromTo(section, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none none',
          // Performance: only animate once, don't re-animate on scroll back
          once: true,
        },
      }).scrollTrigger!
    );
  });

  gsap.utils.toArray<HTMLElement>('.card-grid').forEach((grid) => {
    const cards = grid.querySelectorAll('.card-reveal');
    if (cards.length > 0) {
      triggers.push(
        gsap.fromTo(cards, { opacity: 0, y: 30 }, {
          opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out',
          scrollTrigger: {
            trigger: grid,
            start: 'top 80%',
            once: true,
          },
        }).scrollTrigger!
      );
    }
  });

  gsap.utils.toArray<HTMLElement>('.carousel-track').forEach((carousel) => {
    const cards = carousel.querySelectorAll('.carousel-card');
    if (cards.length > 0) {
      triggers.push(
        gsap.fromTo(cards, { opacity: 0, x: 60 }, {
          opacity: 1, x: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: {
            trigger: carousel,
            start: 'top 85%',
            once: true,
          },
        }).scrollTrigger!
      );
    }
  });

  // Single refresh after all triggers are created
  ScrollTrigger.refresh();
}

export function cleanupAnimations() {
  // Kill all ScrollTriggers
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

  // Destroy Lenis
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }

  // Cancel any pending rAF
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Kill all GSAP animations
  gsap.killTweensOf('*');
}
