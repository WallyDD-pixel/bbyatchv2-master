"use client";
import { ReactNode } from 'react';

/** Auth via Supabase uniquement (plus de SessionProvider NextAuth → évite conflits de cookies). */
export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
