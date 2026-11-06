import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HUMAN_STYLE_RULES, sanitizeProse, sanitizeProseList } from "@/lib/prose-style";
import { requireSession } from "@/lib/session";
import { logUsage } from "@/lib/usage";
import { finaliseVerbatim } from "@/lib/verbatim";

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

// "Exact wording" mode: clients who ask for a CV that is not AI-written.
// The AI only sorts the candidate's own text into the template fields. It
// writes nothing new, and the server checks every line against the CV.
const COPY = "Copy it EXACTLY as written in the CV, word for word. Do not reword, shorten, improve, summarise or correct it.";
const verbatimSchema = {
  type: "object" as const,
  properties: {
    candidateName: { type: "string", description: "The candidate's name as written on the CV." },
    profile: {
      type: "string",
      description: `The candidate's own profile, summary or personal statement. ${COPY} If it has more than one paragraph, keep them with a blank line between. Empty string if the CV has none.`,
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description: `Each item from the CV's skills section. ${COPY} Empty array if the CV has no skills section.`,
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string", description: "Employer name as written." },
          role: { type: "string", description: "Job title as written." },
          dateFrom: { type: "string", description: "Start date as written." },
          dateTo: { type: "string", description: "End date as written, e.g. Present." },
          description: {
            type: "string",
            description: `A sentence about the employer ONLY if the CV has one for this role. ${COPY} Otherwise an empty string.`,
          },
          bullets: {
            type: "array",
            items: { type: "string" },
            description: `All of the text under this role, in the original order, one item per bullet point or paragraph. ${COPY} Include every line; do not leave any out or merge them.`,
          },
        },
        required: ["company", "role", "dateFrom", "dateTo", "description", "bullets"],
      },
    },
    qualifications: {
      type: "array",
      items: { type: "string" },
      description: `Each qualification or education entry on one line. ${COPY}`,
    },
    languages: { type: "array", items: { type: "string" }, description: `Each language entry. ${COPY}` },
  },
  required: ["candidateName", "profile", "skills", "experience", "qualifications", "languages"],
};

async function extractVerbatim(cvText: string) {
  const source = cvText.slice(0, 16000);
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    tools: [
      {
        name: "sort_cv_text",
        description: "Place the candidate's own CV text, unchanged, into the fields of a CV template",
        input_schema: verbatimSchema,
      },
    ],
    tool_choice: { type: "tool", name: "sort_cv_text" },
    messages: [
      {
        role: "user",
        content: `Sort the text of this CV into the template fields. The client has asked for a CV that is NOT written or edited by AI, so you must COPY, not write.

RULES:
- Every value must be text that is already in the CV, copied word for word, with the same spelling, punctuation and capitalisation.
- Do not add, reword, summarise, correct or leave out any of the candidate's content.
- You may only: remove bullet symbols at the start of a line, and join a sentence that the file broke across two lines.
- Leave out contact details: email, phone numbers, home address and LinkedIn or other web links.
- If the CV has a section that does not fit a field (e.g. Achievements, Interests), put each line under the most relevant role's bullets if it is about that role; otherwise leave it out.

<cv>
${source}
</cv>`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("No structured output returned by AI");
  // No sanitizeProse here: it changes punctuation, and the point of this mode
  // is that the candidate's text stays exactly as written.
  return finaliseVerbatim(toolUse.input as Record<string, unknown>, source);
}

export async function POST(req: NextRequest) {
  try { await requireSession() } catch (r) { return r as Response }
  let cvText: string;
  let mode: string | undefined;
  try {
    const body = await req.json();
    cvText = body.cvText;
    mode = body.mode;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!cvText || cvText.trim().length < 50) {
    return NextResponse.json({ error: "CV text is too short to extract" }, { status: 400 });
  }

  if (mode === "verbatim") {
    try {
      const { cv, unverified } = await extractVerbatim(cvText);
      await logUsage({ tool: "cv-generator", action: "cv-import", meta: { mode: "verbatim", unverified: unverified.length } });
      return NextResponse.json({ ...cv, unverified });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      console.error("[extract-cv-fields:verbatim]", err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
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
