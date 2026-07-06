import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HUMAN_STYLE_RULES, sanitizeProse, sanitizeProseList } from "@/lib/prose-style";
import { requireSession } from "@/lib/session";
import { logUsage } from "@/lib/usage";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const extractionSchema = {
  type: "object" as const,
  properties: {
    candidateName: { type: "string", description: "Full name of the candidate" },
    executiveSummary: {
      type: "string",
      description: "A 2–3 paragraph third-person executive summary of the candidate, written in the style of a recruitment consultant introducing them to a client. Highlight key achievements, sector expertise, and what makes them stand out.",
    },
    profile: { type: "string", description: "The candidate's profile statement, lightly edited to weave in their key strengths and one or two notable achievements from their experience. Keep the same length and first-person tone as the original — do not add bullet points or headers, just a flowing paragraph." },
    skills: {
      type: "array",
      items: { type: "string" },
      description: "Individual skill items as short phrases",
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          dateFrom: { type: "string", description: "e.g. Jan 2020" },
          dateTo: { type: "string", description: "e.g. Dec 2022 or Present" },
          description: { type: "string", description: "One sentence company description if the CV provides context about the employer" },
          bullets: { type: "array", items: { type: "string" }, description: "Achievement/responsibility bullets, verbatim or lightly tidied" },
        },
        required: ["company", "role", "dateFrom", "dateTo", "bullets"],
      },
    },
    qualifications: {
      type: "array",
      items: { type: "string" },
      description: "Each qualification as a single line, e.g. 'BSc Computer Science  University of Bristol  2010–2013'",
    },
    languages: {
      type: "array",
      items: { type: "string" },
      description: "Each language with proficiency, e.g. 'French - Fluent'",
    },
  },
  required: ["candidateName", "experience"],
};

export async function POST(req: NextRequest) {
  try { await requireSession() } catch (r) { return r as Response }
  let cvText: string;
  try {
    const body = await req.json();
    cvText = body.cvText;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!cvText || cvText.trim().length < 50) {
    return NextResponse.json({ error: "CV text is too short to extract" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      tools: [
        {
          name: "extract_cv_fields",
          description: "Extract structured CV data from raw CV text to populate a formatted CV template",
          input_schema: extractionSchema,
        },
      ],
      tool_choice: { type: "tool", name: "extract_cv_fields" },
      messages: [
        {
          role: "user",
          content: `Extract all CV data from the following text and populate the fields. Use best judgement for any fields not explicitly stated. Preserve the candidate's own words where possible.

${HUMAN_STYLE_RULES}

<cv>
${cvText.slice(0, 12000)}
</cv>`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "No structured output returned by AI" }, { status: 500 });
    }

    // Strip em dashes and other AI tells from the prose fields the LLM
    // wrote itself (executiveSummary/profile). Everything else is
    // pass-through from the source CV so leave it as-is.
    const raw = toolUse.input as Record<string, unknown>;
    const cleaned = {
      ...raw,
      executiveSummary: sanitizeProse(raw.executiveSummary as string | undefined),
      profile: sanitizeProse(raw.profile as string | undefined),
      skills: sanitizeProseList(raw.skills as string[] | undefined),
    };
    await logUsage({ tool: "cv-generator", action: "cv-import" });
    return NextResponse.json(cleaned);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    console.error("[extract-cv-fields]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
