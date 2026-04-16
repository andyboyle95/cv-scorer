import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildJobBriefBlock } from "./prompts";
import { scoringJsonSchema, CVScoreSchema, type CVScore } from "./schemas";
import type { JobBrief } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function scoreCv(
  jobBrief: JobBrief,
  cvText: string
): Promise<CVScore> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1100,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildJobBriefBlock(jobBrief),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: `<cv>\n${cvText}\n</cv>\n\nScore this CV against the job brief and rubric above.`,
          },
        ],
      },
    ],
    tools: [
      {
        name: "score_cv",
        description: "Score a CV against the job brief and return structured scoring data",
        input_schema: scoringJsonSchema,
      },
    ],
    tool_choice: { type: "tool", name: "score_cv" },
  });

  const toolUseBlock = response.content.find(
    (block) => block.type === "tool_use"
  );

  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("No tool use block in response");
  }

  const rawData = toolUseBlock.input as unknown;
  try {
    return CVScoreSchema.parse(rawData);
  } catch (err) {
    console.error("[claude] Schema validation failed. Raw data:", JSON.stringify(rawData, null, 2));
    throw err;
  }
}
