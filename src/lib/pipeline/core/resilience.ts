/**
 * Shared resilience utilities for all pipeline API clients.
 *
 * Provides:
 * - `fetchWithTimeout()` — fetch with AbortSignal.timeout
 * - `retryWithBackoff()` — exponential backoff retry for transient failures
 * - `safeJsonParse()` — try/catch JSON parsing
 */

// ─── Fetch with Timeout ──────────────────────────────────────────────────────

/** Default timeout for standard API calls */
export const DEFAULT_TIMEOUT_MS = 10_000;

/** Longer timeout for AI/generative endpoints */
export const LONG_TIMEOUT_MS = 30_000;

/**
 * Drop-in replacement for `fetch()` that adds a timeout.
 * Returns the Response object or null on failure.
 */
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res;
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.warn(`[fetchWithTimeout] Request timed out after ${timeoutMs}ms — ${url}`);
    }
    return null;
  }
}

// ─── Retry with Backoff ──────────────────────────────────────────────────────

export interface RetryOptions {
  maxRetries?: number;    // default: 2
  baseDelayMs?: number;   // default: 1000
  retryOn?: number[];     // HTTP status codes to retry on (default: [429, 502, 503, 504])
}

/**
 * Execute an async function with exponential backoff retry.
 * Only retries on transient failures (429, 5xx, network errors).
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 1000, retryOn = [429, 502, 503, 504] } = options;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      // Check if the error is retryable
      const status = err?.status || err?.statusCode;
      const isRetryable = !status || retryOn.includes(status);

      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[retryWithBackoff] Attempt ${attempt + 1} failed (${status || 'network'}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// ─── Safe JSON Parse ─────────────────────────────────────────────────────────

/**
 * Safely parse JSON from a Response object.
 * Returns null if parsing fails.
 */
export async function safeJsonParse<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch (err) {
    console.warn('[safeJsonParse] Failed to parse JSON response:', err);
    return null;
  }
}

// ─── Cache Size Limiter ──────────────────────────────────────────────────────

const MAX_CACHE_SIZE = 500;

/**
 * Evict oldest entries from a Map if it exceeds MAX_CACHE_SIZE.
 * Call this after adding a new entry.
 */
export function enforceCacheLimit<K, V>(cache: Map<K, V>): void {
  if (cache.size > MAX_CACHE_SIZE) {
    // Delete oldest 20% of entries
    const deleteCount = Math.floor(cache.size * 0.2);
    let deleted = 0;
    for (const key of cache.keys()) {
      if (deleted >= deleteCount) break;
      cache.delete(key);
      deleted++;
    }
  }
}
