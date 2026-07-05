import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// GET /api/admin/users
// Returns EVERY known user with their access status. Merges two sources:
//   1. AllowedUser rows (individually-whitelisted)
//   2. User rows (anyone who has ever logged in — includes domain-whitelisted)
// so the admin sees the full picture, not just "explicitly added" users.
export async function GET() {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const [allowed, loggedIn] = await Promise.all([
    prisma.allowedUser.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } },
    }),
  ]);

  // Key by email so we can join
  const byEmail = new Map<string, {
    email: string;
    role: Role;
    source: "individual" | "domain";
    revokedAt: Date | null;
    addedBy: string | null;
    loginCount: number;
    lastLoginAt: Date | null;
    createdAt: Date;
  }>();

  for (const a of allowed) {
    byEmail.set(a.email, {
      email: a.email,
      role: a.role,
      source: "individual",
      revokedAt: a.revokedAt,
      addedBy: a.addedBy,
      loginCount: 0,
      lastLoginAt: null,
      createdAt: a.createdAt,
    });
  }

  for (const u of loggedIn) {
    const existing = byEmail.get(u.email);
    if (existing) {
      existing.loginCount = u.loginCount;
      existing.lastLoginAt = u.lastLoginAt;
    } else {
      byEmail.set(u.email, {
        email: u.email,
        role: u.role,
        source: "domain",
        revokedAt: u.revokedAt,
        addedBy: null,
        loginCount: u.loginCount,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      });
    }
  }

  const users = Array.from(byEmail.values()).sort((a, b) => {
    const ta = a.lastLoginAt?.getTime() ?? 0;
    const tb = b.lastLoginAt?.getTime() ?? 0;
    if (tb !== ta) return tb - ta;
    return a.email.localeCompare(b.email);
  });

  return NextResponse.json({ users });
}

// POST /api/admin/users  { email, role? }
// Add an individual whitelist entry. Role defaults to USER.
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const role = body?.role === "ADMIN" ? Role.ADMIN : Role.USER;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const user = await prisma.allowedUser.upsert({
    where: { email },
    update: { role, revokedAt: null },
    create: { email, role, addedBy: session.user.email },
  });

  await logAudit({
    type: "USER_ADDED",
    actor: session.user.email,
    target: email,
    meta: { role },
  });

  return NextResponse.json({ user });
}
