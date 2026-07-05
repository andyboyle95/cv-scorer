"use client";

import { SessionProvider } from "next-auth/react";

// Root-layout wrapper for NextAuth's client-side session context so useSession()
// and signIn()/signOut() work anywhere in the tree.
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
