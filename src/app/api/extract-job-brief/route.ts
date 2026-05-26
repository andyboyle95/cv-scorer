import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

const outputSchema = {
  type: "object" as const,
  properties: {
    jobTitle:        { type: "string", description: "Job title" },
    company:         { type: "string", description: "Company name; empty string if not stated or confidential" },
    sector:          { type: "string", description: "Industry or sector (e.g. 'B2B SaaS', 'Financial Services')" },
    location:        { type: "string", description: "Location and/or remote working arrangement; empty string if not stated" },
    salaryRange:     { type: "string", description: "Salary, OTE or rate range; empty string if not stated" },
    roleSummary:     { type: "string", description: "Concise 2–4 sentence summary of the role and its purpose" },
    keyRequirements: { type: "string", description: "Must-have requirements, one per line" },
    niceToHaves:     { type: "string", description: "Desirable but not essential requirements, one per line. Empty string if none stated." },
    routeToMarket:   { type: "string", description: "How the salesperson generates revenue — e.g. outbound new business hunting, inbound leads, account expansion, channel/partner sales. Infer intelligently from the role if not explicit." },
    targetClients:   { type: "string", description: "The types, sizes and sectors of clients the salesperson will sell to — e.g. enterprise CFOs in financial services, SME owners in professional services. Infer from context if not explicit." },
    dealComplexity:  { type: "string", description: "Estimated deal values, typical sales cycle length, number of decision-makers, any procurement or legal processes involved. Infer from context (role level, sector, product) if not explicit." },
  },
  required: ["jobTitle", "roleSummary", "keyRequirements", "routeToMarket", "targetClients", "dealComplexity"],
};

export async function POST(req: NextRequest) {
  let text: string;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      tools: [
        {
          name: "extract_job_brief",
          description: "Extract structured job brief fields from a job specification or advert",
          input_schema: outputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "extract_job_brief" },
      messages: [
        {
          role: "user",
          content: `You are an expert recruitment consultant specialising in sales roles at Aaron Wallis Sales Recruitment. Extract structured information from the following job specification or advert.

For the sales-specific fields (routeToMarket, targetClients, dealComplexity), make intelligent inferences based on the role, company, sector, and any clues in the text — even when not explicitly stated. For example:
- An enterprise SaaS AE role implies: outbound new business hunting, enterprise targets (500+ employees across tech/finance/retail), complex multi-stakeholder deals with 3–9 month sales cycles and £50k–£200k ARR values.
- A regional account manager role implies: retention and expansion on existing accounts, mid-market clients in a specific geography, shorter cycles of 1–3 months.

Job specification:
${text.slice(0, 8000)}`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
    }

    return NextResponse.json(toolUse.input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    console.error("[extract-job-brief]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
