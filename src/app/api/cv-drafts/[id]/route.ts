import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { FEATURES } from "@/lib/features";

const DISABLED_RESPONSE = () =>
  NextResponse.json({ error: "CV drafts are temporarily disabled" }, { status: 503 });

// GET /api/cv-drafts/:id — load a specific draft (must belong to caller).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!FEATURES.cvDrafts) return DISABLED_RESPONSE();
  let session;
  try {
    session = await requireSession();
  } catch (r) {
    return r as Response;
  }
  const { id } = await params;
  const draft = await prisma.cvDraft.findUnique({ where: { id } });
  if (!draft || draft.userId !== session.user.id) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  return NextResponse.json({ draft });
}

// DELETE /api/cv-drafts/:id — remove a draft (must belong to caller).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!FEATURES.cvDrafts) return DISABLED_RESPONSE();
  let session;
  try {
    session = await requireSession();
  } catch (r) {
    return r as Response;
  }
  const { id } = await params;
  const draft = await prisma.cvDraft.findUnique({ where: { id } });
  if (!draft || draft.userId !== session.user.id) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  await prisma.cvDraft.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
