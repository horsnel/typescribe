import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { supabaseAdmin } from './supabase/admin';
import { getProfileByEmail, getCurrentProfile } from './db';

// ─── NextAuth Configuration ───
// Supabase Auth is the source of truth for credentials.
// NextAuth just manages the JWT session cookie — we delegate signIn() to
// supabase.auth.signInWithPassword() so we get free rate-limit, email
// verification, password reset, magic-link, OAuth providers, MFA, etc.

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });
        if (error || !data.user) {
          throw new Error(error?.message ?? 'Invalid email or password');
        }
        const profile = await getProfileByEmail(credentials.email);
        return {
          id: data.user.id,
          email: data.user.email!,
          name: profile?.display_name || data.user.email!.split('@')[0],
          image: profile?.avatar || '',
        };
      },
    }),

    // OAuth providers — only registered if env vars are set
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [GitHubProvider({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })]
      : []),
  ],

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  jwt: { maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        // Enrich with the latest profile data
        const profile = await getProfileByEmail(token.email as string);
        if (profile) {
          session.user.name = profile.display_name;
          session.user.image = profile.avatar;
        }
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
    newUser: '/signup',
  },

  debug: process.env.NODE_ENV === 'development',
};

// ─── Public helpers ───

/** Create a new account in Supabase Auth. The Postgres trigger will auto-create
 *  the matching row in `profiles`. */
export async function createUser(
  email: string, password: string, displayName: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { display_name: displayName },
    email_confirm: true, // dev: skip email confirmation; flip to false in prod
  });
  if (error) return { success: false, error: error.message };
  // Best-effort display_name sync (trigger already inserted a row)
  if (data.user) {
    await supabaseAdmin
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', data.user.id);
  }
  return { success: true };
}

/** Returns true if the user has admin privileges. Replaces the old hardcoded
 *  Ebuka456 check. */
export async function isUserAdmin(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (adminEmails.includes(email)) return true;
  const profile = await getProfileByEmail(email);
  return profile?.role === 'admin' || profile?.role === 'moderator';
}

/** Verify the standalone admin password (used by /api/admin/auth). */
export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}
