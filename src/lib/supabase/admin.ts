import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client — uses the service-role key.
 * Bypasses RLS. ONLY use server-side for trusted operations
 * (admin endpoints, cron jobs, denormalised-counter maintenance).
 *
 * Lazy-initialised so that the build step (which evaluates module
 * imports without env vars) doesn't crash with "supabaseUrl is required".
 * The actual client is only created the first time it is used at runtime.
 */

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.',
    );
  }

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

/**
 * Backwards-compatible export — callers that imported `supabaseAdmin`
 * directly will keep working via a Proxy that lazily forwards to the
 * real client on first access.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
}) as SupabaseClient;
