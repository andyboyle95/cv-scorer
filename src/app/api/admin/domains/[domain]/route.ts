import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  let session;
  try {
    session = await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const { domain: raw } = await params;
  const domain = decodeURIComponent(raw).trim().toLowerCase();

  await prisma.allowedDomain.deleteMany({ where: { domain } });
  await logAudit({ type: "DOMAIN_REMOVED", actor: session.user.email, target: domain });

  return NextResponse.json({ ok: true });
}
