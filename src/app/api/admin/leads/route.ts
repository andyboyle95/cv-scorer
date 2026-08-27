import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getLeadEmailConfig, sendTestLeadEmail } from "@/lib/send-lead-email";

// Admin view over Job Spec Creator leads.
//
// GET  — recent leads + per-lead email delivery status + a config health
//        block, so a broken Resend setup is visible at a glance instead of
//        being discovered weeks later via missing enquiries.
// POST — sends a test email to the signed-in admin, proving the whole path
//        without having to fill in the public form.

const PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const config = getLeadEmailConfig();
  const take = Math.min(
    Number(req.nextUrl.searchParams.get("limit")) || PAGE_SIZE,
    500
  );

  try {
    const [rows, total, undelivered] = await Promise.all([
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          name: true,
          email: true,
          companyUrl: true,
          jobTitle: true,
          industry: true,
          seniority: true,
          notifyStatus: true,
          notifyError: true,
          copyStatus: true,
          copyError: true,
          createdAt: true,
        },
      }),
      prisma.lead.count(),
      prisma.lead.count({ where: { NOT: { notifyStatus: "sent" } } }),
    ]);

    return NextResponse.json({
      leads: rows,
      total,
      undelivered,
      config,
      tableReady: true,
    });
  } catch (err) {
    // Most likely cause: `npm run db:migrate` hasn't been run since the Lead
    // table was added. Say so rather than returning an empty list, which would
    // look identical to "no leads yet".
    console.error("[admin/leads] query failed", err);
    return NextResponse.json({
      leads: [],
      total: 0,
      undelivered: 0,
      config,
      tableReady: false,
      error:
        "Couldn't read the Lead table. If this deploy is new, run `npm run db:migrate` (prisma migrate deploy) against the production database.",
    });
  }
}

export async function POST() {
  let session;
  try {
    session = await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const to = session.user?.email;
  if (!to) {
    return NextResponse.json(
      { error: "No email address on the signed-in account." },
      { status: 400 }
    );
  }

  const result = await sendTestLeadEmail(to);
  return NextResponse.json({ to, ...result, config: getLeadEmailConfig() });
}
