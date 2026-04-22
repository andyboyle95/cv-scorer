import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let roughNotes: string, candidateName: string, roleAppliedFor: string;
  try {
    ({ roughNotes, candidateName, roleAppliedFor } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!roughNotes?.trim()) {
    return NextResponse.json({ error: "No notes provided" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are a senior recruitment consultant at Aaron Wallis Sales Recruitment writing a candidate introduction for a client.

Rewrite the notes below into a polished 2–3 paragraph executive summary in third person. Write in a professional, confident and persuasive tone — the goal is to sell the candidate to the hiring manager. Weave in any specific details provided (reasons for leaving, aspirations, achievements, etc.) naturally into the narrative. Keep it concise — roughly the same length as the notes, not longer.

Candidate name: ${candidateName || "the candidate"}
Role applied for: ${roleAppliedFor || "the role"}

Notes to rewrite:
${roughNotes.trim()}

Return only the rewritten summary text, no preamble.`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    return NextResponse.json({ summary: text.text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rewrite failed";
    console.error("[rewrite-summary]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
