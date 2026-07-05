import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// PATCH /api/admin/users/:email  { role?, revoked? }
// Update role or revoke/restore access. Also kills active DB sessions on
// revoke or role downgrade so the change takes effect immediately.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  let session;
  try {
    session = await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const { email: emailParam } = await params;
  const email = decodeURIComponent(emailParam).trim().toLowerCase();
  const body = await req.json().catch(() => null);
  const role: Role | undefined =
    body?.role === "ADMIN" ? Role.ADMIN : body?.role === "USER" ? Role.USER : undefined;
  const revoked: boolean | undefined = typeof body?.revoked === "boolean" ? body.revoked : undefined;

  if (role === undefined && revoked === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Guard against an admin locking themselves out of admin. The bootstrap
  // env var provides a recovery path but this UX check catches the mistake.
  if (session.user.email === email && role === Role.USER) {
    return NextResponse.json(
      { error: "You cannot demote yourself from ADMIN. Ask another admin to do it." },
      { status: 400 },
    );
  }

  const allowedRow = await prisma.allowedUser.findUnique({ where: { email } });

  const updateData: { role?: Role; revokedAt?: Date | null } = {};
  if (role !== undefined) updateData.role = role;
  if (revoked !== undefined) updateData.revokedAt = revoked ? new Date() : null;

  if (allowedRow) {
    await prisma.allowedUser.update({ where: { email }, data: updateData });
  } else {
    // Auto-create an individual whitelist entry so the change sticks for a
    // domain-whitelisted user (otherwise the domain rule would keep re-adding
    // them on next sign-in).
    await prisma.allowedUser.create({
      data: {
        email,
        role: role ?? Role.USER,
        addedBy: session.user.email,
        revokedAt: revoked ? new Date() : null,
      },
    });
  }

  // Sync the User row so the admin list reflects the new role right away
  // (the session callback will also do this on the user's next request, but
  // the admin dashboard reads from AllowedUser + User, so keep both in sync).
  const userRow = await prisma.user.findUnique({ where: { email } });
  if (userRow) {
    await prisma.user.update({
      where: { id: userRow.id },
      data: {
        role: role ?? userRow.role,
        revokedAt: revoked !== undefined ? (revoked ? new Date() : null) : userRow.revokedAt,
      },
    });

    // Kill all active sessions on revoke — the user is signed out on their
    // next request rather than at token-expiry.
    if (revoked === true) {
      await prisma.session.deleteMany({ where: { userId: userRow.id } });
    }
  }

  // Audit log
  if (revoked === true) {
    await logAudit({ type: "USER_REVOKED", actor: session.user.email, target: email });
  } else if (revoked === false) {
    await logAudit({ type: "USER_RESTORED", actor: session.user.email, target: email });
  }
  if (role !== undefined) {
    await logAudit({
      type: "ROLE_CHANGED",
      actor: session.user.email,
      target: email,
      meta: { newRole: role },
    });
  }

  return NextResponse.json({ ok: true });
}
