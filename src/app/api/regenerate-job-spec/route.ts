import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { regenerateSection } from "@/lib/job-spec-claude";
import { fetchWebsiteText } from "@/lib/fetch-website";
import { SECTION_META, type SpecSection } from "@/lib/job-spec-prompts";
import type { JobSpecAnswers } from "@/lib/job-spec-config";

export const maxDuration = 60;

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

const bodySchema = z.object({
  answers: answersSchema,
  section: z.enum(
    Object.keys(SECTION_META) as [SpecSection, ...SpecSection[]]
  ),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The job spec service is not configured yet." },
      { status: 503 }
    );
  }

  let parsed: { answers: JobSpecAnswers; section: SpecSection };
  try {
    const body = await req.json();
    parsed = bodySchema.parse(body) as {
      answers: JobSpecAnswers;
      section: SpecSection;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    // Only the opening statement needs the website content.
    let websiteContent = "";
    if (parsed.section === "openingStatement") {
      try {
        websiteContent = await fetchWebsiteText(parsed.answers.companyUrl);
      } catch {
        /* non-fatal */
      }
    }

    const result = await regenerateSection(
      parsed.answers,
      websiteContent,
      parsed.section
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[regenerate-job-spec] Error:", err);
    return NextResponse.json(
      { error: "Couldn't regenerate that section. Please try again." },
      { status: 500 }
    );
  }
}
