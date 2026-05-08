'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export function AuthWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
