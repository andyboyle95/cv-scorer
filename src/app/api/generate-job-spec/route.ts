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
  let answers: JobSpecAnswers;
  try {
    const body = await req.json();
    answers = answersSchema.parse(body) as JobSpecAnswers;
  } catch {
    return NextResponse.json(
      { error: "Please complete all required fields." },
      { status: 400 }
    );
  }

  try {
    const websiteContent = await fetchWebsiteText(answers.companyUrl);
    const spec = await generateJobSpec(answers, websiteContent);

    // Capture the lead — best effort, never blocks the user's result.
    sendLeadEmail(answers, spec).catch((err) =>
      console.error("[generate-job-spec] lead email failed:", err)
    );

    return NextResponse.json(spec);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate job spec";
    console.error("[generate-job-spec] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
