/**
 * Circuit Breaker — Prevents cascading failures by auto-disabling
 * scrapers that are repeatedly failing.
 *
 * States:
 *   CLOSED  → Normal operation (requests pass through)
 *   OPEN    → Circuit tripped (requests are blocked, fallback used)
 *   HALF_OPEN → Testing recovery (one request allowed to test)
 *
 * Trip conditions:
 *   - 3 consecutive failures → OPEN for 30 minutes
 *   - 10 failures in 1 hour → OPEN for 2 hours
 *   - HTTP 403/429 (blocked) → OPEN for 1 hour
 *
 * Recovery:
 *   - After cooldown, ONE request is allowed (HALF_OPEN)
 *   - If it succeeds → CLOSED (normal operation)
 *   - If it fails → OPEN again (double the cooldown)
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerConfig {
  /** Consecutive failures before tripping (default: 3) */
  failureThreshold: number;
  /** Failures in window before tripping (default: 10) */
  windowFailureThreshold: number;
  /** Window duration in ms (default: 1 hour) */
  windowMs: number;
  /** Base cooldown in ms when circuit opens (default: 30 min) */
  baseCooldownMs: number;
  /** Max cooldown in ms (default: 4 hours) */
  maxCooldownMs: number;
}

interface CircuitStateEntry {
  state: CircuitState;
  consecutiveFailures: number;
  windowFailures: Array<{ timestamp: number }>;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  openedAt: number | null;
  currentCooldownMs: number;
  totalTrips: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  windowFailureThreshold: 10,
  windowMs: 60 * 60 * 1000,       // 1 hour
  baseCooldownMs: 30 * 60 * 1000,  // 30 minutes
  maxCooldownMs: 4 * 60 * 60 * 1000, // 4 hours
};

// ─── Per-scraper circuit state ───

const circuits = new Map<string, CircuitStateEntry>();

function getEntry(scraperName: string): CircuitStateEntry {
  if (!circuits.has(scraperName)) {
    circuits.set(scraperName, {
      state: 'closed',
      consecutiveFailures: 0,
      windowFailures: [],
      lastFailureAt: null,
      lastSuccessAt: null,
      openedAt: null,
      currentCooldownMs: DEFAULT_CONFIG.baseCooldownMs,
      totalTrips: 0,
    });
  }
  return circuits.get(scraperName)!;
}

// ─── Public API ───

/**
 * Check if a scraper is allowed to make requests.
 * Returns true if the circuit is CLOSED or HALF_OPEN.
 */
export function canRequest(scraperName: string): boolean {
  const entry = getEntry(scraperName);
  const now = Date.now();

  if (entry.state === 'closed') return true;

  if (entry.state === 'open') {
    // Check if cooldown has elapsed
    if (entry.openedAt && now >= entry.openedAt + entry.currentCooldownMs) {
      entry.state = 'half_open';
      console.log(`[CircuitBreaker] ${scraperName} → HALF_OPEN (testing recovery)`);
      return true;
    }
    return false;
  }

  if (entry.state === 'half_open') {
    return true; // Allow one test request
  }

  return false;
}

/**
 * Report a successful request. Resets the circuit to CLOSED.
 */
export function reportSuccess(scraperName: string): void {
  const entry = getEntry(scraperName);
  entry.consecutiveFailures = 0;
  entry.lastSuccessAt = Date.now();

  if (entry.state === 'half_open') {
    entry.state = 'closed';
    entry.currentCooldownMs = DEFAULT_CONFIG.baseCooldownMs; // Reset cooldown
    console.log(`[CircuitBreaker] ${scraperName} → CLOSED (recovered)`);
  }
}

/**
 * Report a failed request. May trip the circuit if thresholds are exceeded.
 */
export function reportFailure(scraperName: string, httpStatus?: number): void {
  const entry = getEntry(scraperName);
  const now = Date.now();

  entry.consecutiveFailures++;
  entry.lastFailureAt = now;
  entry.windowFailures.push({ timestamp: now });

  // Clean up old window failures
  entry.windowFailures = entry.windowFailures.filter(
    f => now - f.timestamp < DEFAULT_CONFIG.windowMs,
  );

  // Special handling for HTTP 403/429 (blocked)
  if (httpStatus === 403 || httpStatus === 429) {
    tripCircuit(scraperName, 60 * 60 * 1000); // 1 hour
    return;
  }

  // Check consecutive failure threshold
  if (entry.consecutiveFailures >= DEFAULT_CONFIG.failureThreshold) {
    tripCircuit(scraperName, DEFAULT_CONFIG.baseCooldownMs);
    return;
  }

  // Check window failure threshold
  if (entry.windowFailures.length >= DEFAULT_CONFIG.windowFailureThreshold) {
    tripCircuit(scraperName, 2 * 60 * 60 * 1000); // 2 hours
    return;
  }

  // In HALF_OPEN, any failure reopens the circuit
  if (entry.state === 'half_open') {
    tripCircuit(scraperName, Math.min(entry.currentCooldownMs * 2, DEFAULT_CONFIG.maxCooldownMs));
  }
}

function tripCircuit(scraperName: string, cooldownMs: number): void {
  const entry = getEntry(scraperName);
  const now = Date.now();

  entry.state = 'open';
  entry.openedAt = now;
  entry.currentCooldownMs = cooldownMs;
  entry.totalTrips++;

  console.warn(
    `[CircuitBreaker] ${scraperName} → OPEN (cooldown: ${Math.round(cooldownMs / 60000)}min, ` +
    `consecutive failures: ${entry.consecutiveFailures}, ` +
    `window failures: ${entry.windowFailures.length})`,
  );
}

/**
 * Get the current state of a scraper's circuit.
 */
export function getCircuitState(scraperName: string): {
  state: CircuitState;
  consecutiveFailures: number;
  windowFailures: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  totalTrips: number;
  cooldownRemainingMs: number;
} {
  const entry = getEntry(scraperName);
  const now = Date.now();

  let cooldownRemainingMs = 0;
  if (entry.state === 'open' && entry.openedAt) {
    cooldownRemainingMs = Math.max(0, (entry.openedAt + entry.currentCooldownMs) - now);
  }

  return {
    state: entry.state,
    consecutiveFailures: entry.consecutiveFailures,
    windowFailures: entry.windowFailures.length,
    lastFailureAt: entry.lastFailureAt,
    lastSuccessAt: entry.lastSuccessAt,
    totalTrips: entry.totalTrips,
    cooldownRemainingMs,
  };
}

/**
 * Get all circuit breaker states (for admin dashboard).
 */
export function getAllCircuitStates(): Record<string, ReturnType<typeof getCircuitState>> {
  const result: Record<string, ReturnType<typeof getCircuitState>> = {};
  for (const key of circuits.keys()) {
    result[key] = getCircuitState(key);
  }
  return result;
}

/**
 * Manually reset a circuit (admin action).
 */
export function resetCircuit(scraperName: string): void {
  circuits.delete(scraperName);
  console.log(`[CircuitBreaker] ${scraperName} → manual reset`);
}

/**
 * Reset all circuits (admin action).
 */
export function resetAllCircuits(): void {
  circuits.clear();
  console.log('[CircuitBreaker] All circuits → manual reset');
}
