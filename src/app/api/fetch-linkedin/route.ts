import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

function extractTextFromHtml(html: string): string {
  // Pull out any JSON-LD blocks first — LinkedIn embeds structured profile data here
  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  const jsonLdText = jsonLdMatches.map((m) => m[1]).join("\n");

  // Pull meta description / og tags
  const metaMatches = [...html.matchAll(/<meta[^>]+content="([^"]{20,})"[^>]*>/gi)];
  const metaText = metaMatches.map((m) => m[1]).join(" ");

  // Strip scripts, styles, nav, footer noise
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return [jsonLdText, metaText, stripped].join("\n").slice(0, 14000);
}

export async function POST(req: NextRequest) {
  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!url || !url.includes("linkedin.com/in/")) {
    return NextResponse.json(
      { error: "Please provide a valid LinkedIn profile URL (linkedin.com/in/...)" },
      { status: 400 }
    );
  }

  // Fetch the LinkedIn page with browser-like headers
  let pageText: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    const html = await res.text();
    pageText = extractTextFromHtml(html);

    // LinkedIn auth wall returns very little content
    if (pageText.trim().length < 300) {
      return NextResponse.json(
        {
          error:
            "LinkedIn returned a login wall for this profile. Ask the candidate to paste their profile text, or upload their CV file instead.",
          blocked: true,
        },
        { status: 422 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach LinkedIn. Check the URL and try again." },
      { status: 502 }
    );
  }

  // Re-use the same extraction schema from extract-cv-fields
  const extractionSchema = {
    type: "object" as const,
    properties: {
      candidateName: { type: "string" },
      executiveSummary: {
        type: "string",
        description:
          "A 2–3 paragraph third-person executive summary written in the style of a recruitment consultant introducing the candidate to a client.",
      },
      profile: {
        type: "string",
        description:
          "First-person profile statement weaving in key strengths and one or two notable achievements. Same length as a typical CV profile paragraph.",
      },
      skills: { type: "array", items: { type: "string" } },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            role: { type: "string" },
            dateFrom: { type: "string" },
            dateTo: { type: "string" },
            description: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["company", "role", "dateFrom", "dateTo", "bullets"],
        },
      },
      qualifications: { type: "array", items: { type: "string" } },
      languages: { type: "array", items: { type: "string" } },
    },
    required: ["candidateName", "experience"],
  };

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      tools: [
        {
          name: "extract_cv_fields",
          description: "Extract structured CV data from a LinkedIn profile page",
          input_schema: extractionSchema,
        },
      ],
      tool_choice: { type: "tool", name: "extract_cv_fields" },
      messages: [
        {
          role: "user",
          content: `Extract CV data from this LinkedIn profile page content. Use best judgement for any fields not explicitly stated.\n\n<linkedin_page>\n${pageText}\n</linkedin_page>`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "Could not extract profile data" }, { status: 500 });
    }

    return NextResponse.json(toolUse.input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    console.error("[fetch-linkedin]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
