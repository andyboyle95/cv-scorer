import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { scoringJsonSchema, CVScoreSchema, type CVScore } from "./schemas";
import type { JobBrief } from "./types";

const client = new Anthropic();

export async function scoreCv(
  jobBrief: JobBrief,
  cvText: string
): Promise<CVScore> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
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
        content: buildUserPrompt(jobBrief, cvText),
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
  const parsed = CVScoreSchema.parse(rawData);
  return parsed;
}
