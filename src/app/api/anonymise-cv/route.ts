import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HUMAN_STYLE_RULES, sanitizeProse, sanitizeProseList } from "@/lib/prose-style";
import { requireSession } from "@/lib/session";
import { logUsage } from "@/lib/usage";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

// The shape we ask Claude to return. Structured tool-use keeps every field
// present so we can swap the whole CV over cleanly on the client. We don't
// touch consultant/date/salary/notice — those are recruiter fields, not
// candidate identity.
const anonymisationSchema = {
  type: "object" as const,
  properties: {
    candidateName: {
      type: "string",
      description: "Always return 'Confidential Candidate'.",
    },
    linkedIn: { type: "string", description: "Always return an empty string." },
    location: {
      type: "string",
      description:
        "Generalise to a broad region only. Examples: 'London' → 'Greater London', 'Manchester' → 'North West England', 'Slough' → 'South East England'. If the original is already generic, keep it. If unclear, return 'UK'.",
    },
    executiveSummary: {
      type: "string",
      description:
        "Rewrite the executive summary to remove ALL identifying data: candidate name (use 'the candidate'), employer names (replace with an industry descriptor, e.g. 'a global credit ratings firm'), specific product/platform names owned by employers (generalise, e.g. 'PitchBook' → 'a leading private markets data platform'), universities, cities, or anything else that would name-identify the candidate or their prior firms. Preserve every substantive claim — deal sizes, sectors, seniority, achievements, methodologies. Same length, same third-person tone.",
    },
    profile: {
      type: "string",
      description:
        "Rewrite the first-person profile paragraph with the same anonymisation rules as executiveSummary. Keep first-person voice and same length.",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "Return the skills list unchanged UNLESS a skill contains a specific employer/product/university name — in that case generalise it (e.g. 'Salesforce CRM administration at BT' → 'Salesforce CRM administration'). Preserve every skill; only edit names within them.",
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: {
            type: "string",
            description:
              "Replace with a descriptor of the employer's type/sector, no brand. Examples: 'Moody's' → 'Global Credit Ratings & Analytics Firm'; 'S&P Global - Visible Alpha' → 'Buy-side Analytics Platform'; 'AME Group' → 'Financial Services Advisory'; 'PitchBook (Morningstar)' → 'Private Markets Data Platform'. Keep it specific enough that the client understands the environment, but not enough to name it.",
          },
          role: {
            type: "string",
            description: "Job title, unchanged unless it embeds an employer name — then generalise it.",
          },
          dateFrom: { type: "string" },
          dateTo: { type: "string" },
          description: {
            type: "string",
            description:
              "Rewrite the company description to remove the brand name and any identifying details. Keep the sector/business model summary. Empty string if the original was empty.",
          },
          bullets: {
            type: "array",
            items: { type: "string" },
            description:
              "Rewrite each bullet to strip employer names, client names (unless they're generic sector labels), product/platform names owned by the employer, city names, and any other identifiers. Preserve every substantive claim including numbers, percentages, deal sizes, sector labels, and achievements. Same tone, roughly same length.",
          },
        },
        required: ["company", "role", "dateFrom", "dateTo", "description", "bullets"],
      },
    },
    qualifications: {
      type: "array",
      items: { type: "string" },
      description:
        "Strip the institution name from each qualification but keep the degree, subject, class, and dates. Example: 'BA (Hons) Media Studies & Digital Art Canterbury Christ Church University 2008 - 2011' → 'BA (Hons) Media Studies & Digital Art 2008 - 2011'.",
    },
    languages: {
      type: "array",
      items: { type: "string" },
      description: "Return unchanged. Language proficiency is not identifying.",
    },
  },
  required: [
    "candidateName",
    "linkedIn",
    "location",
    "executiveSummary",
    "profile",
    "skills",
    "experience",
    "qualifications",
    "languages",
  ],
};

interface ExperienceIn {
  id?: string;
  company?: string;
  role?: string;
  dateFrom?: string;
  dateTo?: string;
  description?: string;
  bullets?: string[];
  pageBreakAfter?: boolean;
}

interface CandidateIn {
  candidateName?: string;
  linkedIn?: string;
  location?: string;
  executiveSummary?: string;
  profile?: string;
  skills?: string[];
  experience?: ExperienceIn[];
  qualifications?: string[];
  languages?: string[];
}

export async function POST(req: NextRequest) {
  try { await requireSession() } catch (r) { return r as Response }
  let body: CandidateIn;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Build a compact JSON payload the model can reason over as a whole. Sending
  // the whole CV in one shot means Claude can be consistent (e.g. if the same
  // employer is mentioned in the profile AND in a bullet, both get the same
  // generalisation).
  const cvJson = JSON.stringify(
    {
      candidateName: body.candidateName ?? "",
      linkedIn: body.linkedIn ?? "",
      location: body.location ?? "",
      executiveSummary: body.executiveSummary ?? "",
      profile: body.profile ?? "",
      skills: body.skills ?? [],
      experience: (body.experience ?? []).map((e) => ({
        company: e.company ?? "",
        role: e.role ?? "",
        dateFrom: e.dateFrom ?? "",
        dateTo: e.dateTo ?? "",
        description: e.description ?? "",
        bullets: e.bullets ?? [],
      })),
      qualifications: body.qualifications ?? [],
      languages: body.languages ?? [],
    },
    null,
    2,
  );

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      tools: [
        {
          name: "anonymise_cv",
          description:
            "Return a fully-anonymised copy of the CV, ready to send speculatively to a client",
          input_schema: anonymisationSchema,
        },
      ],
      tool_choice: { type: "tool", name: "anonymise_cv" },
      messages: [
        {
          role: "user",
          content: `You are anonymising a CV so it can be sent speculatively to a potential client. The client must NOT be able to identify the candidate or their previous employers from the CV alone. Preserve everything of substantive interest — sector experience, deal sizes, percentages, achievements, methodologies, tools used — while removing every proper noun that would identify a person, employer, university, or city.

RULES:
- Candidate name → "Confidential Candidate".
- LinkedIn → empty string.
- Location → broad region only (see schema).
- Every employer becomes a generic descriptor of the type of firm.
- Every university/institution is removed from qualifications; keep the degree.
- Product/platform names owned BY the candidate's employers → generalise.
- Named clients within bullets → replace with a generic sector label if it adds value ("won a top-5 European bank"), otherwise remove.
- Well-known cities named in bullets → generalise or remove.
- Keep numbers, percentages, deal sizes, sector labels, seniority, methodologies.
- Do not introduce facts that weren't in the original CV. If unsure, drop the phrase rather than paraphrase into a claim.

${HUMAN_STYLE_RULES}

CV JSON to anonymise (return via the tool):
${cvJson}`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "No anonymised output from AI" }, { status: 500 });
    }
    const out = toolUse.input as Record<string, unknown>;

    // Defensive scrubbing on top of the AI pass — even if Claude slips, name
    // and LinkedIn are always blanked here.
    const experience = ((out.experience as ExperienceIn[]) || []).map((e, i) => ({
      id: body.experience?.[i]?.id ?? String(i + 1),
      company: sanitizeProse(e.company as string),
      role: sanitizeProse(e.role as string),
      dateFrom: (e.dateFrom as string) || "",
      dateTo: (e.dateTo as string) || "",
      description: sanitizeProse(e.description as string),
      bullets: sanitizeProseList((e.bullets as string[]) || []),
      pageBreakAfter: body.experience?.[i]?.pageBreakAfter,
    }));

    const cleaned = {
      candidateName: "Confidential Candidate",
      linkedIn: "",
      location: sanitizeProse((out.location as string) || "UK"),
      executiveSummary: sanitizeProse(out.executiveSummary as string),
      profile: sanitizeProse(out.profile as string),
      skills: sanitizeProseList((out.skills as string[]) || []),
      experience,
      qualifications: sanitizeProseList((out.qualifications as string[]) || []),
      languages: (out.languages as string[]) || body.languages || [],
    };

    await logUsage({ tool: "cv-generator", action: "anonymise" });
    return NextResponse.json(cleaned);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anonymisation failed";
    console.error("[anonymise-cv]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
