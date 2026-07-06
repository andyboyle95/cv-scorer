import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// Aggregate usage stats for the admin dashboard.
//
// Returns three time windows (today, this week, all time) × two dimensions
// (per-action total, per-user leaderboard). Client renders the Usage tab
// entirely from this single fetch — no per-tile round trips.

export async function GET() {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Grouped totals per (tool, action). Postgres does the heavy lifting.
  async function totalsSince(since: Date | null) {
    const where = since ? { createdAt: { gte: since } } : {};
    const rows = await prisma.usageEvent.groupBy({
      by: ["tool", "action"],
      where,
      _count: { _all: true },
    });
    return rows.map((r) => ({
      tool: r.tool,
      action: r.action,
      count: r._count._all,
    }));
  }

  // Leaderboard: top users by total events in the last 7 days.
  const topUsersRows = await prisma.usageEvent.groupBy({
    by: ["userEmail"],
    where: {
      createdAt: { gte: startOfWeek },
      NOT: { userEmail: null },
    },
    _count: { _all: true },
    orderBy: { _count: { userEmail: "desc" } },
    take: 10,
  });
  const topUsers = topUsersRows.map((r) => ({
    email: r.userEmail,
    count: r._count._all,
  }));

  const [today, thisWeek, allTime] = await Promise.all([
    totalsSince(startOfToday),
    totalsSince(startOfWeek),
    totalsSince(null),
  ]);

  const totalEvents = allTime.reduce((sum, r) => sum + r.count, 0);
  const totalToday = today.reduce((sum, r) => sum + r.count, 0);
  const totalWeek = thisWeek.reduce((sum, r) => sum + r.count, 0);

  return NextResponse.json({
    totals: { today: totalToday, thisWeek: totalWeek, allTime: totalEvents },
    today,
    thisWeek,
    allTime,
    topUsers,
  });
}
