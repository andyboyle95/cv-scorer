// Pure resolver: given an email, what role (if any) should this user have?
//
// Precedence, highest first:
//   1. Individual AllowedUser row (not revoked)         → that row's role
//   2. AllowedDomain matching the email's domain        → that domain's role
//   3. BOOTSTRAP_ADMIN_EMAIL env var matches            → ADMIN
//   4. Otherwise                                        → null (deny)
//
// Called on every sign-in AND every session refresh, so revoking a user
// (setting revokedAt) or removing a domain kicks them out on their next
// request, not when their cookie eventually expires.

import { Role } from "@prisma/client";
import { prisma } from "./prisma";

export interface WhitelistResult {
  role: Role;
  source: "individual" | "domain" | "bootstrap";
}

export async function resolveWhitelist(emailRaw: string): Promise<WhitelistResult | null> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;

  // 1. Individual entry
  const individual = await prisma.allowedUser.findUnique({ where: { email } });
  if (individual && !individual.revokedAt) {
    return { role: individual.role, source: "individual" };
  }
  // If individual entry exists but is revoked, DENY — a revoke on an
  // individual row must win even if the domain would otherwise allow them.
  if (individual && individual.revokedAt) return null;

  // 2. Domain entry
  const domain = email.split("@")[1];
  if (domain) {
    const domainEntry = await prisma.allowedDomain.findUnique({ where: { domain } });
    if (domainEntry) return { role: domainEntry.role, source: "domain" };
  }

  // 3. Bootstrap admin (env var — safety net so a fresh deploy is never
  //    locked out even if the seed script didn't run)
  const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (bootstrap && bootstrap === email) {
    return { role: Role.ADMIN, source: "bootstrap" };
  }

  return null;
}
