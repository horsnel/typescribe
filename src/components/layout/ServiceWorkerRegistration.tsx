'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production builds only.
 *
 * The SW gives Typescribe installability, offline fallback, and cache-first
 * static assets. Registration is wrapped in try/catch — a failed registration
 * must never affect the app itself.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW is an enhancement — ignore failures silently */
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
