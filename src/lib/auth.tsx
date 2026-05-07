'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

export interface SignupData {
  email: string;
  password: string;
  display_name: string;
  favorite_genres?: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider — bridges NextAuth sessions with the existing Typescribe User interface.
 *
 * How it works:
 * - NextAuth manages real sessions (JWT, OAuth, etc.)
 * - This provider reads the NextAuth session and converts it to the existing `User` type
 * - The login/signup functions call our API routes which use NextAuth internally
 * - When you connect Supabase later, only the API routes need to change — this provider stays the same
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync NextAuth session → User object
  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      const sessionUser = session.user;
      // Fetch full user profile from our API
      fetchUserProfile(sessionUser.email || '', sessionUser.id || '').then((profile) => {
        if (profile) {
          setUser(profile);
        } else {
          // Fallback: construct user from session data
          setUser({
            id: parseInt(sessionUser.id?.replace(/\D/g, '') || '0') || Date.now(),
            email: sessionUser.email || '',
            display_name: sessionUser.name || sessionUser.email?.split('@')[0] || 'User',
            avatar: sessionUser.image || '',
            bio: '',
            favorite_genres: [],
            min_rating: 7.0,
            email_notifications: true,
            public_profile: true,
            created_at: new Date().toISOString(),
          });
        }
        setLoading(false);
      });
    } else {
      // No session — check localStorage for legacy users (migration path)
      if (!user) {
        migrateLegacyUser();
      }
      setUser(null);
      setLoading(false);
    }
  }, [session, status]);

  // One-time migration from localStorage to NextAuth
  const migrateLegacyUser = useCallback(() => {
    try {
      const data = localStorage.getItem('typescribe_session');
      if (data) {
        const parsed = JSON.parse(data);
        // Legacy user exists in localStorage — we keep them working
        // They'll need to re-signup through NextAuth for full benefits
        const legacyUser: User = {
          id: parsed.id || Date.now(),
          email: parsed.email || '',
          display_name: parsed.display_name || '',
          avatar: parsed.avatar || '',
          bio: parsed.bio || '',
          favorite_genres: parsed.favorite_genres || [],
          min_rating: parsed.min_rating || 7.0,
          email_notifications: parsed.email_notifications ?? true,
          public_profile: parsed.public_profile ?? true,
          created_at: parsed.created_at || new Date().toISOString(),
        };
        setUser(legacyUser);
        setLoading(false);
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch user profile from API
  const fetchUserProfile = async (email: string, id: string): Promise<User | null> => {
    try {
      const res = await fetch(`/api/auth/profile?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch { /* ignore */ }
    return null;
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn('Login failed:', data.error);
        return false;
      }

      // Trigger NextAuth credentials sign-in
      const { signIn } = await import('next-auth/react');
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      return !!result?.ok;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  }, []);

  const signup = useCallback(async (data: SignupData): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        console.warn('Signup failed:', result.error);
        return false;
      }

      // Auto sign-in after registration
      const { signIn } = await import('next-auth/react');
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      return !!result?.ok;
    } catch (err) {
      console.error('Signup error:', err);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    // Clear legacy localStorage data
    localStorage.removeItem('typescribe_session');
    // Sign out from NextAuth
    nextAuthSignOut({ redirect: false });
    setUser(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };

      // Also update on the server
      fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: prev.email, ...updates }),
      }).catch(() => { /* non-blocking */ });

      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ─── Watchlist (still localStorage for now — will migrate to Supabase) ───

interface WatchlistItem { movieId: number; addedDate: string; }
const WATCHLIST_KEY = 'typescribe_watchlist';

export function getLocalWatchlist(): WatchlistItem[] {
  try {
    const data = localStorage.getItem(WATCHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveLocalWatchlist(watchlist: WatchlistItem[]): void {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
}

export function isInWatchlist(movieId: number): boolean {
  return getLocalWatchlist().some((item) => item.movieId === movieId);
}

export function toggleWatchlist(movieId: number): boolean {
  const watchlist = getLocalWatchlist();
  const existing = watchlist.findIndex((item) => item.movieId === movieId);
  if (existing >= 0) {
    watchlist.splice(existing, 1);
    saveLocalWatchlist(watchlist);
    return false;
  } else {
    watchlist.push({ movieId, addedDate: new Date().toISOString() });
    saveLocalWatchlist(watchlist);
    return true;
  }
}
