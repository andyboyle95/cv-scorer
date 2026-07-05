import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    events: events.map((e) => ({
      ...e,
      meta: e.meta ? safeJson(e.meta) : null,
    })),
  });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
