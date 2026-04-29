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

  // Target the <main> scroll container (not window) since the app shell
  // uses overflow-y-auto on <main> with a locked viewport
  const scrollContainer = document.querySelector('main') || undefined;

  lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
    infinite: false,
    wrapper: scrollContainer,
    content: scrollContainer,
  });

  // Use GSAP ticker instead of separate rAF loop to avoid double rAF calls
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });

  lenis.on('scroll', ScrollTrigger.update);

  // Tell ScrollTrigger to use the <main> as the scroll container
  ScrollTrigger.scrollerProxy(scrollContainer!, {
    scrollTop(value) {
      if (arguments.length && value !== undefined) {
        (scrollContainer as HTMLElement).scrollTop = value;
      }
      return (scrollContainer as HTMLElement).scrollTop;
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    },
  });

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
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true,
  });

  const scrollContainer = document.querySelector('main') || undefined;
  const triggers: ScrollTrigger[] = [];

  gsap.utils.toArray<HTMLElement>('.reveal-section').forEach((section) => {
    triggers.push(
      gsap.fromTo(section, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none none',
          once: true,
          scroller: scrollContainer,
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
            scroller: scrollContainer,
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
            scroller: scrollContainer,
          },
        }).scrollTrigger!
      );
    }
  });

  // Single refresh after all triggers are created
  ScrollTrigger.refresh();

  return triggers;
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
