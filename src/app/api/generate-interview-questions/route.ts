import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HUMAN_STYLE_RULES, sanitizeProse } from "@/lib/prose-style";
import { requireSession } from "@/lib/session";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const outputSchema = {
  type: "object" as const,
  properties: {
    candidateName: {
      type: "string",
      description: "Full name of the candidate as shown on the CV",
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theme: { type: "string", description: "The competency theme this question addresses" },
          question: { type: "string", description: "The main STAR-format competency-based interview question" },
          followUp: { type: "string", description: "A follow-up probe to dig deeper into the candidate's answer" },
          rationale: { type: "string", description: "One sentence explaining why this question is particularly relevant to this candidate based on their CV" },
        },
        required: ["theme", "question", "followUp", "rationale"],
      },
    },
  },
  required: ["candidateName", "questions"],
};

export async function POST(req: NextRequest) {
  try { await requireSession() } catch (r) { return r as Response }
  let cvText: string, themes: string[], questionCount: number, avoidQuestion: string | undefined;
  try {
    ({ cvText, themes, questionCount, avoidQuestion } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!cvText?.trim()) {
    return NextResponse.json({ error: "No CV text provided" }, { status: 400 });
  }
  if (!themes?.length) {
    return NextResponse.json({ error: "No themes selected" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      tools: [
        {
          name: "generate_interview_questions",
          description: "Generate competency-based interview questions tailored to a candidate's CV",
          input_schema: outputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "generate_interview_questions" },
      messages: [
        {
          role: "user",
          content: `You are a senior recruitment consultant at Aaron Wallis Sales Recruitment. Generate exactly ${questionCount} competency-based interview questions tailored specifically to this candidate's background and experience.

Select the most relevant competency themes from the list provided, based on what will best reveal the candidate's suitability. Spread the questions sensibly across themes but prioritise those where the candidate has clear relevant experience. Each question must follow the STAR format style ("Tell me about a time when…", "Give me an example of…", "Describe a situation where…") and reference the candidate's specific companies, roles, or achievements where possible to make it more incisive.

For each question also provide:
- A sharp follow-up probe to uncover depth or challenge the answer
- A concise one-sentence rationale explaining why this question is relevant to this specific candidate

${HUMAN_STYLE_RULES}

Themes available: ${themes.join("; ")}
${avoidQuestion ? `\nImportant: generate a DIFFERENT question from this one (which has already been used): "${avoidQuestion}"` : ''}
Candidate CV:
${cvText.slice(0, 12000)}`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "No structured output from AI" }, { status: 500 });
    }

    // Sanitize AI-authored prose fields (theme is a fixed label; leave it).
    const raw = toolUse.input as {
      candidateName?: string;
      questions?: { theme: string; question: string; followUp: string; rationale: string }[];
    };
    const cleaned = {
      ...raw,
      questions: (raw.questions || []).map((q) => ({
        theme: q.theme,
        question: sanitizeProse(q.question),
        followUp: sanitizeProse(q.followUp),
        rationale: sanitizeProse(q.rationale),
      })),
    };
    return NextResponse.json(cleaned);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[generate-interview-questions]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
