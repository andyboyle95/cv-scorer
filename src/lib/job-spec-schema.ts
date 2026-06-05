import { z } from "zod";

// Zod schema validating the structured output Claude returns via tool use.
export const GeneratedJobSpecSchema = z.object({
  opening_statement: z.string().default(""),
  job_spec: z.object({
    job_title: z.string().default(""),
    role_overview: z.string().default(""),
    key_responsibilities: z.array(z.string()).default([]),
    experience_and_skills: z.array(z.string()).default([]),
    desirable: z.array(z.string()).default([]),
  }),
  person_spec: z.object({
    behavioural_summary: z.string().default(""),
    disc_profile: z.string().default(""),
    key_behaviours: z.array(z.string()).default([]),
    motivational_drivers: z.array(z.string()).default([]),
    watch_outs: z.array(z.string()).default([]),
  }),
});

export type GeneratedJobSpec = z.infer<typeof GeneratedJobSpecSchema>;

// JSON schema passed to the Anthropic tool definition.
export const jobSpecJsonSchema = {
  type: "object" as const,
  properties: {
    opening_statement: {
      type: "string",
      description:
        "A short opening paragraph in the form 'X company is...' that introduces the hiring business, based on the supplied website content. Warm, factual, 2–3 sentences.",
    },
    job_spec: {
      type: "object",
      properties: {
        job_title: { type: "string" },
        role_overview: {
          type: "string",
          description: "2–4 sentence summary of the purpose of the role.",
        },
        key_responsibilities: {
          type: "array",
          items: { type: "string" },
          description: "6–10 concise bullet points of what the person will do.",
        },
        experience_and_skills: {
          type: "array",
          items: { type: "string" },
          description: "Essential experience, skills and track record required.",
        },
        desirable: {
          type: "array",
          items: { type: "string" },
          description: "Nice-to-have, desirable (not essential) attributes.",
        },
      },
      required: [
        "job_title",
        "role_overview",
        "key_responsibilities",
        "experience_and_skills",
        "desirable",
      ],
      additionalProperties: false,
    },
    person_spec: {
      type: "object",
      properties: {
        behavioural_summary: {
          type: "string",
          description:
            "2–4 sentences describing the ideal personality and behavioural profile for this role.",
        },
        disc_profile: {
          type: "string",
          description:
            "Plain-English explanation of the ideal DiSC profile and why it fits this role.",
        },
        key_behaviours: {
          type: "array",
          items: { type: "string" },
          description: "The behavioural competencies that matter most.",
        },
        motivational_drivers: {
          type: "array",
          items: { type: "string" },
          description: "What motivates a person who thrives in this role.",
        },
        watch_outs: {
          type: "array",
          items: { type: "string" },
          description:
            "Personality types or traits that would struggle in this role.",
        },
      },
      required: [
        "behavioural_summary",
        "disc_profile",
        "key_behaviours",
        "motivational_drivers",
        "watch_outs",
      ],
      additionalProperties: false,
    },
  },
  required: ["opening_statement", "job_spec", "person_spec"],
  additionalProperties: false,
};
