import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HUMAN_STYLE_RULES, sanitizeProse } from "@/lib/prose-style";
import { requireSession } from "@/lib/session";
import { logUsage } from "@/lib/usage";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const emailSchema = {
  type: "object" as const,
  properties: {
    subject: {
      type: "string",
      description:
        "A short, punchy subject line. Under 70 characters. Emphasise the role type and one standout attribute of the candidate. Do NOT include the candidate's name if the CV is anonymised. Examples: 'Enterprise AE with £1M+ pipeline history — open to a chat?', 'Senior sales leader with buy-side track record'.",
    },
    body: {
      type: "string",
      description:
        "A short, plain-text email body of 90-140 words. Aaron Wallis voice: warm, professional, confident, no hard sell. Structure: (1) one line hook naming what the candidate offers, (2) two or three quick, concrete highlights drawn from the CV (achievements, sectors, deal sizes, seniority), (3) a soft CTA asking if the recipient would like to see the full CV / arrange a chat, (4) sign-off. If the CV is anonymised, refer to the candidate as 'this candidate' throughout — never invent a name or personal detail. Include the consultant's sign-off with their name, email, and phone at the end.",
    },
  },
  required: ["subject", "body"],
};

interface ExperienceIn {
  company?: string;
  role?: string;
  description?: string;
  bullets?: string[];
}

interface CvIn {
  candidateName?: string;
  roleAppliedFor?: string;
  location?: string;
  executiveSummary?: string;
  profile?: string;
  skills?: string[];
  experience?: ExperienceIn[];
  languages?: string[];
  qualifications?: string[];
  consultant?: string;
  consultantEmail?: string;
  consultantTel?: string;
  anonymised?: boolean;
}

export async function POST(req: NextRequest) {
  try { await requireSession() } catch (r) { return r as Response }
  let body: CvIn;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const hasCv =
    body.executiveSummary?.trim() ||
    body.profile?.trim() ||
    (body.experience && body.experience.length);
  if (!hasCv) {
    return NextResponse.json({ error: "Not enough CV content to write an email" }, { status: 400 });
  }

  // Compact the CV into text the model can reason over cheaply.
  const experienceBlock = (body.experience ?? [])
    .filter((e) => e.company || e.role)
    .slice(0, 8)
    .map((e) => {
      const header = [e.role, "at", e.company].filter(Boolean).join(" ");
      const bullets = (e.bullets ?? [])
        .filter(Boolean)
        .slice(0, 4)
        .map((b) => `  - ${b}`)
        .join("\n");
      return `${header}\n${bullets}`.trim();
    })
    .join("\n\n");

  const anonymised = !!body.anonymised;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      tools: [
        {
          name: "write_speculative_email",
          description:
            "Draft a short speculative introduction email pitching a candidate to a potential client",
          input_schema: emailSchema,
        },
      ],
      tool_choice: { type: "tool", name: "write_speculative_email" },
      messages: [
        {
          role: "user",
          content: `You are a senior recruitment consultant at Aaron Wallis Sales Recruitment. Write a short speculative introduction email pitching this candidate to a potential client (a company that hasn't yet asked to see the CV). The goal is to tease the client's interest so they reply asking to see the full CV.

Tone: professional, warm, confident. No hard sell. No superlatives. Every claim must be evident in the CV data below. If the CV is anonymised (see flag), do NOT invent a name or any personal detail; refer to the person as "this candidate" throughout, and refer to their previous employers only by the generic descriptors already used.

${HUMAN_STYLE_RULES}

CV data:
- Anonymised: ${anonymised ? "YES — never name the candidate or their previous employers" : "no — you may use the candidate's name and employer names"}
- Candidate name (only usable if not anonymised): ${body.candidateName || "(unspecified)"}
- Role sought: ${body.roleAppliedFor || "(unspecified)"}
- Location / region: ${body.location || "(unspecified)"}
- Executive summary: ${body.executiveSummary?.trim() || "(none)"}
- Profile: ${body.profile?.trim() || "(none)"}
- Skills: ${(body.skills || []).filter(Boolean).slice(0, 12).join(", ") || "(none)"}
- Languages: ${(body.languages || []).filter(Boolean).join(", ") || "(none)"}
- Recent experience:
${experienceBlock || "(none supplied)"}

Consultant sign-off details to include at the end of the body:
- Name: ${body.consultant || "Rob Scott"}
- Email: ${body.consultantEmail || "robert.scott@aaronwallis.co.uk"}
- Phone: ${body.consultantTel || "01908 061400"}
- Firm: Aaron Wallis Sales Recruitment

Return the email via the tool.`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "No email generated" }, { status: 500 });
    }
    const out = toolUse.input as { subject: string; body: string };

    await logUsage({
      tool: "cv-generator",
      action: "intro-email",
      meta: { anonymised },
    });
    return NextResponse.json({
      subject: sanitizeProse(out.subject),
      body: sanitizeProse(out.body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email generation failed";
    console.error("[speculative-email]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
