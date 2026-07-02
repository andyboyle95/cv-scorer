import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HUMAN_STYLE_RULES, sanitizeProse } from "@/lib/prose-style";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let roughNotes: string,
    candidateName: string,
    roleAppliedFor: string,
    jobSpec: string | undefined,
    length: string | undefined;
  try {
    ({ roughNotes, candidateName, roleAppliedFor, jobSpec, length } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!roughNotes?.trim()) {
    return NextResponse.json({ error: "No notes provided" }, { status: 400 });
  }

  // Cap the job spec so a huge advert can't blow the prompt budget; the top of
  // the document is where the essential requirements live anyway.
  const jobSpecText = jobSpec?.trim().slice(0, 8000) || "";
  const wantLonger = length === "longer";

  const tailoringBlock = jobSpecText
    ? `

You are also tailoring this summary to the job spec below. Emphasise the parts of the candidate's background that map to the role's requirements (skills, sectors, seniority, deal size, tools, methodologies). Mirror the vocabulary the advert uses where it fits naturally. STRICT RULE: only surface experience and skills that are already evident in the notes, never invent, exaggerate, or imply capabilities the notes don't support. If a requirement isn't covered by the notes, quietly leave it out rather than papering over the gap.

Job spec / advert:
${jobSpecText}`
    : "";

  const lengthRule = wantLonger
    ? "Aim for a fuller 3–4 paragraph summary. Draw more concrete detail from the notes and, if present, the job spec. Every sentence must add substance, no padding, no filler, no repetition."
    : "Keep it concise, roughly the same length as the notes, not longer.";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are a senior recruitment consultant at Aaron Wallis Sales Recruitment writing a candidate introduction for a client.

Rewrite the notes below into a polished executive summary in third person. Write in a professional, confident, persuasive tone. The goal is to sell the candidate to the hiring manager. Weave in any specific details provided (reasons for leaving, aspirations, achievements) naturally into the narrative. ${lengthRule}

${HUMAN_STYLE_RULES}

Candidate name: ${candidateName || "the candidate"}
Role applied for: ${roleAppliedFor || "the role"}

Notes to rewrite:
${roughNotes.trim()}${tailoringBlock}

Return only the rewritten summary text, no preamble.`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    return NextResponse.json({ summary: sanitizeProse(text.text) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rewrite failed";
    console.error("[rewrite-summary]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
