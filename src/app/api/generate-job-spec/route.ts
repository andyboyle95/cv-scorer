import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJobSpec } from "@/lib/job-spec-claude";
import { fetchWebsiteText } from "@/lib/fetch-website";
import { sendLeadEmail } from "@/lib/send-lead-email";
import type { JobSpecAnswers } from "@/lib/job-spec-config";

export const maxDuration = 60; // seconds

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

    // Capture the lead — best effort, never blocks the user's result.
    sendLeadEmail(answers, spec).catch((err) =>
      console.error("[generate-job-spec] lead email failed:", err)
    );

    return NextResponse.json(spec);
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
