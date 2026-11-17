import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";

export const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

/** Demo mode produces placeholder marks so the app can be tried without an API key. */
export function aiMode(): "live" | "demo" {
  if (process.env.AI_MODE === "demo") return "demo";
  return process.env.ANTHROPIC_API_KEY ? "live" : "demo";
}

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic({ timeout: 10 * 60 * 1000, maxRetries: 4 });
  return _client;
}

export type Block = Anthropic.Beta.BetaContentBlockParam;
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export class RefusedError extends Error {}

/**
 * One structured call. The answer is validated against the zod schema.
 * `system` blocks are cached: put the stable reference material there.
 */
export async function structured<S extends z.ZodType>(opts: {
  schema: S;
  system: string[];          // stable → cached
  content: Block[];          // per-script content
  effort?: Effort;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const system: Anthropic.Beta.BetaTextBlockParam[] = opts.system.map((text, i) => ({
    type: "text",
    text,
    ...(i === opts.system.length - 1 ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));

  const res = await client().beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    output_config: { effort: opts.effort ?? "high", format: betaZodOutputFormat(opts.schema) },
    messages: [{ role: "user", content: opts.content }],
  });

  if (res.stop_reason === "refusal") {
    throw new RefusedError(res.stop_details?.explanation ?? "The model declined this request.");
  }
  if (res.stop_reason === "max_tokens") {
    throw new Error("The answer was cut off (max_tokens). Try again.");
  }
  if (!res.parsed_output) throw new Error("The model did not return valid structured output.");
  return res.parsed_output as z.infer<S>;
}

export function imageBlock(data: Buffer, mime = "image/jpeg"): Block {
  return {
    type: "image",
    source: { type: "base64", media_type: mime as "image/jpeg", data: data.toString("base64") },
  };
}

export function pdfBlock(data: Buffer, title?: string, cache = false): Block {
  return {
    type: "document",
    title,
    source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") },
    ...(cache ? { cache_control: { type: "ephemeral" as const } } : {}),
  };
}

export function textBlock(text: string, cache = false): Block {
  return { type: "text", text, ...(cache ? { cache_control: { type: "ephemeral" as const } } : {}) };
}
