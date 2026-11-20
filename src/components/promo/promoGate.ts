/**
 * Session-scoped gating for the v2 promo popups (carousel popups, floating
 * toasts, diagonal teaser). Each promo shows at most once per browser session;
 * an explicit ✕ dismiss additionally suppresses it for 7 days.
 */
const SEEN_PREFIX = 'ts_promo_seen_';
const DISMISS_PREFIX = 'ts_promo_dismiss_';
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000;

export function shouldShowPromo(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(SEEN_PREFIX + key)) return false;
    const dismissed = localStorage.getItem(DISMISS_PREFIX + key);
    if (dismissed) {
      const at = parseInt(dismissed, 10);
      if (!Number.isNaN(at) && Date.now() - at < DISMISS_TTL) return false;
      localStorage.removeItem(DISMISS_PREFIX + key);
    }
    return true;
  } catch {
    return false;
  }
}

export function markPromoSeen(key: string): void {
  try {
    sessionStorage.setItem(SEEN_PREFIX + key, '1');
  } catch {
    /* ignore */
  }
}

export function markPromoDismissed(key: string): void {
  markPromoSeen(key);
  try {
    localStorage.setItem(DISMISS_PREFIX + key, String(Date.now()));
  } catch {
    /* ignore */
  }
}
