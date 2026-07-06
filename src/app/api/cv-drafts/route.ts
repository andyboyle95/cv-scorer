import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { FEATURES } from "@/lib/features";

const DISABLED_RESPONSE = () =>
  NextResponse.json(
    { error: "CV drafts are temporarily disabled", drafts: [] },
    { status: 503 },
  );

// GET /api/cv-drafts — list current user's most recent CV drafts.
export async function GET() {
  if (!FEATURES.cvDrafts) return DISABLED_RESPONSE();
  let session;
  try {
    session = await requireSession();
  } catch (r) {
    return r as Response;
  }

  const drafts = await prisma.cvDraft.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      candidateName: true,
      roleAppliedFor: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ drafts });
}

// POST /api/cv-drafts — upsert. Pass { id?, candidateName, roleAppliedFor, data }
// - no id → create a new draft
// - with id → update that draft (only if it belongs to the current user)
export async function POST(req: NextRequest) {
  if (!FEATURES.cvDrafts) return DISABLED_RESPONSE();
  let session;
  try {
    session = await requireSession();
  } catch (r) {
    return r as Response;
  }

  const body = await req.json().catch(() => null);
  if (!body?.data) {
    return NextResponse.json({ error: "Missing draft data" }, { status: 400 });
  }

  const candidateName: string | null = (body.candidateName ?? "").toString().trim() || null;
  const roleAppliedFor: string | null = (body.roleAppliedFor ?? "").toString().trim() || null;

  // Cap the number of drafts per user so the DB doesn't grow unbounded.
  const MAX_DRAFTS = 50;

  if (body.id) {
    const existing = await prisma.cvDraft.findUnique({ where: { id: body.id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    const updated = await prisma.cvDraft.update({
      where: { id: body.id },
      data: { candidateName, roleAppliedFor, data: body.data },
    });
    return NextResponse.json({ draft: updated });
  }

  const created = await prisma.cvDraft.create({
    data: {
      userId: session.user.id,
      candidateName,
      roleAppliedFor,
      data: body.data,
    },
  });

  // Cleanup: delete anything above the cap for this user.
  const excess = await prisma.cvDraft.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    skip: MAX_DRAFTS,
    select: { id: true },
  });
  if (excess.length) {
    await prisma.cvDraft.deleteMany({ where: { id: { in: excess.map((d) => d.id) } } });
  }

  return NextResponse.json({ draft: created });
}
