'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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

const SESSION_KEY = 'typescribe_session';
const USERS_KEY = 'typescribe_users';

interface StoredUser {
  id: number;
  email: string;
  password: string;
  display_name: string;
  avatar: string;
  bio: string;
  favorite_genres: string[];
  min_rating: number;
  email_notifications: boolean;
  public_profile: boolean;
  created_at: string;
}

function generateId(): number {
  return Date.now();
}

function getStoredUsers(): StoredUser[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function storedToUser(su: StoredUser): User {
  return {
    id: su.id, email: su.email, display_name: su.display_name, avatar: su.avatar,
    bio: su.bio, favorite_genres: su.favorite_genres, min_rating: su.min_rating,
    email_notifications: su.email_notifications, public_profile: su.public_profile, created_at: su.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (data) {
        const parsed = JSON.parse(data) as StoredUser;
        setUser(storedToUser(parsed));
      }
    } catch { /* ignore */ }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const users = getStoredUsers();
    const found = users.find((u) => u.email === email);
    if (!found) return false;
    if (found.password !== password) return false;
    const fullUser = storedToUser(found);
    setUser(fullUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(found));
    return true;
  }, []);

  const signup = useCallback(async (data: SignupData): Promise<boolean> => {
    const users = getStoredUsers();
    if (users.some((u) => u.email === data.email)) return false;
    const newUser: StoredUser = {
      id: generateId(), email: data.email, password: data.password, display_name: data.display_name,
      avatar: '', bio: '', favorite_genres: data.favorite_genres || [], min_rating: 7.0,
      email_notifications: true, public_profile: true, created_at: new Date().toISOString(),
    };
    users.push(newUser);
    saveStoredUsers(users);
    const fullUser = storedToUser(newUser);
    setUser(fullUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const updateProfile = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      const users = getStoredUsers();
      const idx = users.findIndex((u) => u.id === prev.id);
      if (idx >= 0) {
        const storedUpdates: Partial<StoredUser> = {};
        if (updates.display_name !== undefined) storedUpdates.display_name = updates.display_name;
        if (updates.avatar !== undefined) storedUpdates.avatar = updates.avatar;
        if (updates.bio !== undefined) storedUpdates.bio = updates.bio;
        if (updates.favorite_genres !== undefined) storedUpdates.favorite_genres = updates.favorite_genres;
        if (updates.min_rating !== undefined) storedUpdates.min_rating = updates.min_rating;
        if (updates.email_notifications !== undefined) storedUpdates.email_notifications = updates.email_notifications;
        if (updates.public_profile !== undefined) storedUpdates.public_profile = updates.public_profile;
        users[idx] = { ...users[idx], ...storedUpdates };
        saveStoredUsers(users);
        localStorage.setItem(SESSION_KEY, JSON.stringify(users[idx]));
      }
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
