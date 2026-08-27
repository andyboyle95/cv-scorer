import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJobSpec } from "@/lib/job-spec-claude";
import { fetchWebsiteText } from "@/lib/fetch-website";
import { sendLeadEmail } from "@/lib/send-lead-email";
import { recordLead, recordLeadDelivery } from "@/lib/leads";
import type { JobSpecAnswers } from "@/lib/job-spec-config";
import { logUsage } from "@/lib/usage";

// Generation itself can take ~30-45s; persisting the lead and awaiting the
// two Resend calls adds a few seconds on top, so give the request headroom.
export const maxDuration = 90; // seconds

const answersSchema = z.object({
  jobTitle: z.string().min(1),
  industry: z.string().min(1),
  workingArrangement: z.string().min(1),
  jobFunction: z.string().min(1),
  accountVolume: z.string().min(1),
  seniority: z.string().min(1),
  transactional: z.string().min(1),
  sellingInto: z.string().min(1),
  leadGeneration: z.string().min(1),
  qualities: z.record(z.number()).default({}),
  salesCycle: z.string().min(1),
  orderValue: z.string().min(1),
  pointOfContact: z.string().min(1),
  additionalNotes: z.string().default(""),
  name: z.string().min(1),
  email: z.string().email(),
  companyUrl: z.string().default(""),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[generate-job-spec] ANTHROPIC_API_KEY is not set");
    return NextResponse.json(
      {
        error:
          "The job spec service is not configured yet. Please try again later.",
      },
      { status: 503 }
    );
  }

  let answers: JobSpecAnswers;
  try {
    const body = await req.json();
    answers = answersSchema.parse(body) as JobSpecAnswers;
  } catch {
    return NextResponse.json(
      { error: "Some answers are missing or invalid. Please review the form and try again." },
      { status: 400 }
    );
  }

  try {
    // Website fetch is best-effort and must never break generation.
    let websiteContent = "";
    try {
      websiteContent = await fetchWebsiteText(answers.companyUrl);
    } catch (err) {
      console.error("[generate-job-spec] website fetch failed:", err);
    }

    const spec = await generateJobSpec(answers, websiteContent);

    // Capture the lead BEFORE attempting any email. This is the whole point
    // of the tool: even if Resend is misconfigured, rate-limited or down, the
    // enquirer's details are safely recorded and visible in /admin → Leads.
    const leadId = await recordLead(answers, spec);

    // Now try to notify. Awaited (not fire-and-forget) so the outcome can be
    // written back against the lead — a silent .catch() is exactly how lead
    // emails went missing without anyone noticing. Wrapped so a mail failure
    // can never turn into a 500 for the visitor.
    let emailedToYou = false;
    try {
      const delivery = await sendLeadEmail(answers, spec);
      emailedToYou = delivery.copy.status === "sent";
      await recordLeadDelivery(leadId, delivery);
      if (delivery.notification.status !== "sent") {
        console.error(
          "[generate-job-spec] lead notification NOT delivered:",
          delivery.notification.error
        );
      }
    } catch (err) {
      console.error("[generate-job-spec] lead email threw:", err);
    }

    // Public lead-gen form — session is usually null. Log anyway with
    // the submitter's email so admins can see leads coming in.
    await logUsage({
      tool: "job-spec-creator",
      action: "generate-spec",
      userEmail: answers?.email ?? null,
      userId: null,
      meta: { leadId, emailedToYou },
    });

    // `_delivery` lets the UI tell the visitor the truth about their emailed
    // copy instead of promising one that never arrived.
    return NextResponse.json({ ...spec, _delivery: { emailedToYou } });
  } catch (err) {
    console.error("[generate-job-spec] Error:", err);
    return NextResponse.json(
      {
        error:
          "Sorry — we couldn't generate your job spec just now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
