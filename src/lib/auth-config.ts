import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { compare, hash } from 'bcryptjs';

// ─── In-Memory User Store (Replace with Supabase Adapter Later) ───
// When you connect Supabase, replace this with PrismaAdapter + Supabase connection

interface AuthUser {
  id: string;
  email: string;
  password?: string; // hashed, undefined for OAuth users
  display_name: string;
  avatar: string;
  bio: string;
  favorite_genres: string[];
  min_rating: number;
  email_notifications: boolean;
  public_profile: boolean;
  created_at: string;
}

// In-memory user store — persists for the lifetime of the server process
// When migrating to Supabase, this entire store gets replaced with DB queries
const userStore = new Map<string, AuthUser>();

// Load any existing users from localStorage migration (one-time)
let migrationAttempted = false;

function getOrCreateUser(email: string, userData: Partial<AuthUser>): AuthUser {
  const existing = userStore.get(email);
  if (existing) return existing;

  const newUser: AuthUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    email,
    display_name: userData.display_name || email.split('@')[0],
    avatar: userData.avatar || '',
    bio: userData.bio || '',
    favorite_genres: userData.favorite_genres || [],
    min_rating: userData.min_rating || 7.0,
    email_notifications: userData.email_notifications ?? true,
    public_profile: userData.public_profile ?? true,
    created_at: userData.created_at || new Date().toISOString(),
    password: userData.password,
  };

  userStore.set(email, newUser);
  return newUser;
}

export function getUserByEmail(email: string): AuthUser | undefined {
  return userStore.get(email);
}

export function getUserById(id: string): AuthUser | undefined {
  for (const user of userStore.values()) {
    if (user.id === id) return user;
  }
  return undefined;
}

export function updateUser(email: string, updates: Partial<AuthUser>): AuthUser | null {
  const user = userStore.get(email);
  if (!user) return null;
  const updated = { ...user, ...updates };
  userStore.set(email, updated);
  return updated;
}

export async function createUser(email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> {
  if (userStore.has(email)) {
    return { success: false, error: 'An account with this email already exists' };
  }

  const hashedPassword = await hash(password, 12);
  getOrCreateUser(email, {
    password: hashedPassword,
    display_name: displayName,
  });

  return { success: true };
}

// Export user store for admin/API access
export function getAllUsers(): AuthUser[] {
  return Array.from(userStore.values());
}

// ─── NextAuth Configuration ───

export const authOptions: NextAuthOptions = {
  // When you add Supabase, uncomment and configure:
  // adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = userStore.get(credentials.email);
        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.display_name,
          image: user.avatar,
        };
      },
    }),

    // Google OAuth (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // GitHub OAuth (requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET env vars)
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth providers, auto-create user in our store
      if (account?.provider === 'google' || account?.provider === 'github') {
        if (user.email) {
          getOrCreateUser(user.email, {
            display_name: user.name || user.email.split('@')[0],
            avatar: user.image || '',
          });
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      // Update session (e.g., when user updates profile)
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

        // Enrich session with user data from store
        const dbUser = userStore.get(token.email as string);
        if (dbUser) {
          session.user.name = dbUser.display_name;
          session.user.image = dbUser.avatar;
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
