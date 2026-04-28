// Simple in-memory rate limiter
// Uses sliding window algorithm
// Tracks requests per IP + endpoint

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const limits = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of limits) {
      if (now > entry.resetTime) limits.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function rateLimit(options: {
  windowMs?: number;  // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests?: number; // Max requests per window (default: 30)
  key?: string;       // Optional custom key prefix
}): {
  check: (identifier: string) => { allowed: boolean; remaining: number; resetIn: number };
} {
  const windowMs = options.windowMs || 60000;
  const maxRequests = options.maxRequests || 30;
  const keyPrefix = options.key || '';

  return {
    check(identifier: string) {
      const key = `${keyPrefix}:${identifier}`;
      const now = Date.now();
      const entry = limits.get(key);

      if (!entry || now > entry.resetTime) {
        limits.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
      }

      if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
      }

      entry.count++;
      return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetTime - now };
    }
  };
}

// Pre-configured limiters
export const apiLimiter = rateLimit({ windowMs: 60000, maxRequests: 30 });
export const searchLimiter = rateLimit({ windowMs: 60000, maxRequests: 15 });
export const authLimiter = rateLimit({ windowMs: 900000, maxRequests: 5 }); // 5 per 15 min
export const scrapeLimiter = rateLimit({ windowMs: 60000, maxRequests: 10 });
