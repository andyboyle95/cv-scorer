import Anthropic from "@anthropic-ai/sdk";
import {
  JOB_SPEC_SYSTEM_PROMPT,
  buildJobSpecPrompt,
} from "./job-spec-prompts";
import {
  GeneratedJobSpecSchema,
  jobSpecJsonSchema,
  type GeneratedJobSpec,
} from "./job-spec-schema";
import type { JobSpecAnswers } from "./job-spec-config";

const client = new Anthropic();

export async function generateJobSpec(
  answers: JobSpecAnswers,
  websiteContent: string
): Promise<GeneratedJobSpec> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2200,
    system: [
      {
        type: "text",
        text: JOB_SPEC_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildJobSpecPrompt(answers, websiteContent) },
        ],
      },
    ],
    tools: [
      {
        name: "create_job_spec",
        description:
          "Return a structured job specification and person specification for the role.",
        input_schema: jobSpecJsonSchema,
      },
    ],
    tool_choice: { type: "tool", name: "create_job_spec" },
  });

  const toolUseBlock = response.content.find(
    (block) => block.type === "tool_use"
  );

  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("No tool use block in response");
  }

  const rawData = toolUseBlock.input as unknown;
  try {
    return GeneratedJobSpecSchema.parse(rawData);
  } catch (err) {
    console.error(
      "[job-spec] Schema validation failed. Raw data:",
      JSON.stringify(rawData, null, 2)
    );
    throw err;
  }
}
