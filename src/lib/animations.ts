'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function initLenis() {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  function raf(time: number) {
    lenis!.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis!.raf(time * 1000); });
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
  gsap.utils.toArray<HTMLElement>('.reveal-section').forEach((section) => {
    gsap.fromTo(section, { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none none' },
    });
  });

  gsap.utils.toArray<HTMLElement>('.card-grid').forEach((grid) => {
    const cards = grid.querySelectorAll('.card-reveal');
    if (cards.length > 0) {
      gsap.fromTo(cards, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: grid, start: 'top 80%' },
      });
    }
  });

  gsap.utils.toArray<HTMLElement>('.carousel-track').forEach((carousel) => {
    const cards = carousel.querySelectorAll('.carousel-card');
    if (cards.length > 0) {
      gsap.fromTo(cards, { opacity: 0, x: 60 }, {
        opacity: 1, x: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: carousel, start: 'top 85%' },
      });
    }
  });
}

export function cleanupAnimations() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  if (lenis) { lenis.destroy(); lenis = null; }
}
