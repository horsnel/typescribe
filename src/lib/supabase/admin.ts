import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client — uses the service-role key.
 * Bypasses RLS. ONLY use server-side for trusted operations
 * (admin endpoints, cron jobs, denormalised-counter maintenance).
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
