import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }
  const domains = await prisma.allowedDomain.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ domains });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const body = await req.json().catch(() => null);
  const raw = body?.domain?.trim().toLowerCase() ?? "";
  // Strip @ prefix if the admin typed "@example.com"
  const domain = raw.startsWith("@") ? raw.slice(1) : raw;
  const role = body?.role === "ADMIN" ? Role.ADMIN : Role.USER;

  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Valid domain required (e.g. example.com)" }, { status: 400 });
  }

  const entry = await prisma.allowedDomain.upsert({
    where: { domain },
    update: { role },
    create: { domain, role, addedBy: session.user.email },
  });

  await logAudit({
    type: "DOMAIN_ADDED",
    actor: session.user.email,
    target: domain,
    meta: { role },
  });

  return NextResponse.json({ domain: entry });
}
