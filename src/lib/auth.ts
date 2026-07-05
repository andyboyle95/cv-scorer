// NextAuth v4 config for the Aaron Wallis recruitment apps.
//
// Key choices (differ from the other chat's build):
// - DATABASE sessions (not JWT) so admin revocation kicks in on the next
//   request instead of waiting for the token to expire.
// - Session callback re-checks the whitelist on EVERY request and rewrites
//   the role from source of truth. So a role change / domain removal takes
//   effect on the user's next page load, no re-login needed.
// - Bootstrap admin env var (BOOTSTRAP_ADMIN_EMAIL) so a fresh deploy is
//   never locked out.
// - Sign-in event upserts the User row, bumps loginCount and lastLoginAt,
//   and writes a SIGN_IN AuditEvent so the activity log always reflects
//   every login regardless of whether the user is individually- or
//   domain-whitelisted.

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { resolveWhitelist } from "./whitelist";
import { logAudit } from "./audit";

const SEVEN_DAYS = 7 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    maxAge: SEVEN_DAYS,
    updateAge: 24 * 60 * 60, // silently refresh once a day
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    // Deny sign-in outright for anyone not on the whitelist so we don't
    // even create a User / Account row for them.
    async signIn({ user }) {
      if (!user.email) return false;
      const result = await resolveWhitelist(user.email);
      return !!result;
    },

    // Runs on every getServerSession() call. Re-check the whitelist here so
    // role changes and revocations take effect immediately, no re-login needed.
    async session({ session, user }) {
      if (!session.user || !user.email) return session;

      const wl = await resolveWhitelist(user.email);
      if (!wl) {
        // User was whitelisted at sign-in but has since been revoked. Kill
        // their session rows so their cookie no longer maps to a live session.
        await prisma.session.deleteMany({ where: { userId: user.id } });
        // Returning an unpopulated session leaves session.user undefined,
        // which server components treat as unauthenticated.
        return { ...session, user: undefined as unknown as typeof session.user };
      }

      // If the resolved role differs from what's stored on the User row,
      // update the row so admin UIs stay in sync with the whitelist truth.
      if (wl.role !== (user as { role?: Role }).role) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: wl.role },
        });
      }

      session.user.id = user.id;
      session.user.role = wl.role;
      session.user.provider = (user as { lastProvider?: string | null }).lastProvider ?? null;
      return session;
    },
  },
  events: {
    // First sign-in for this identity — the adapter has just created the
    // User row. Stamp the role from the whitelist immediately.
    async createUser({ user }) {
      if (!user.email) return;
      const wl = await resolveWhitelist(user.email);
      if (wl && wl.role !== Role.USER) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: wl.role },
        });
      }
    },
    async signIn({ user, account }) {
      if (!user.email) return;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginCount: { increment: 1 },
          lastLoginAt: new Date(),
          lastProvider: account?.provider ?? null,
        },
      });
      await logAudit({
        type: "SIGN_IN",
        actor: user.email,
        target: user.email,
        meta: { provider: account?.provider },
      });
    },
  },
};
