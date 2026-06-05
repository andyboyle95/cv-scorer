import Anthropic from "@anthropic-ai/sdk";
import {
  JOB_SPEC_SYSTEM_PROMPT,
  buildJobSpecPrompt,
  buildSectionPrompt,
  SECTION_META,
  type SpecSection,
} from "./job-spec-prompts";
import {
  GeneratedJobSpecSchema,
  jobSpecJsonSchema,
  type GeneratedJobSpec,
} from "./job-spec-schema";
import type { JobSpecAnswers } from "./job-spec-config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Haiku keeps generation fast and matches the rest of the toolset. The prompt
// carries strong, explicit DiSC + conditional guidance so output stays sharp.
const MODEL = "claude-haiku-4-5-20251001";

export async function generateJobSpec(
  answers: JobSpecAnswers,
  websiteContent: string
): Promise<GeneratedJobSpec> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
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

export interface SectionResult {
  content?: string;
  items?: string[];
}

// Regenerate a single section of the spec, returning prose or a list.
export async function regenerateSection(
  answers: JobSpecAnswers,
  websiteContent: string,
  section: SpecSection
): Promise<SectionResult> {
  const meta = SECTION_META[section];
  const isList = meta.type === "list";

  const input_schema = isList
    ? {
        type: "object" as const,
        properties: {
          items: { type: "array", items: { type: "string" } },
        },
        required: ["items"],
        additionalProperties: false,
      }
    : {
        type: "object" as const,
        properties: { content: { type: "string" } },
        required: ["content"],
        additionalProperties: false,
      };

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: [{ type: "text", text: JOB_SPEC_SYSTEM_PROMPT }],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildSectionPrompt(answers, websiteContent, section) },
        ],
      },
    ],
    tools: [
      {
        name: "write_section",
        description: `Return the regenerated "${meta.label}" section.`,
        input_schema,
      },
    ],
    tool_choice: { type: "tool", name: "write_section" },
  });

  const toolUseBlock = response.content.find(
    (block) => block.type === "tool_use"
  );
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("No tool use block in response");
  }

  const raw = toolUseBlock.input as { content?: string; items?: string[] };
  if (isList) {
    return { items: Array.isArray(raw.items) ? raw.items.filter(Boolean) : [] };
  }
  return { content: typeof raw.content === "string" ? raw.content : "" };
}
