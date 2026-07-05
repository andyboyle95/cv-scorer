import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [loginsToday, activeUsersThisWeek, totalLogins] = await Promise.all([
    prisma.auditEvent.count({
      where: { type: "SIGN_IN", createdAt: { gte: startOfToday } },
    }),
    prisma.auditEvent
      .findMany({
        where: { type: "SIGN_IN", createdAt: { gte: weekAgo } },
        select: { actor: true },
        distinct: ["actor"],
      })
      .then((rows) => rows.length),
    prisma.auditEvent.count({ where: { type: "SIGN_IN" } }),
  ]);

  return NextResponse.json({ loginsToday, activeUsersThisWeek, totalLogins });
}
