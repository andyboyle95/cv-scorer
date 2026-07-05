// Augment NextAuth's Session type so `session.user.role` is typed as our Role.
// Also add `id` since we want the user's DB id available on the session.

import type { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      provider?: string | null; // "google" | "azure-ad"
    };
  }
}
