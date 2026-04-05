import { z } from "zod";

export const CategoryScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string(),
  evidence: z.array(z.string()),
});

export const CVScoreSchema = z.object({
  candidate_name: z.string(),
  overall_score: z.number().int().min(0).max(100),
  recommendation: z.enum(["strong_yes", "yes", "maybe", "no", "strong_no"]),
  category_scores: z.object({
    route_to_market: CategoryScoreSchema,
    client_type_fit: CategoryScoreSchema,
    deal_complexity: CategoryScoreSchema,
    sector_fit: CategoryScoreSchema,
    career_trajectory: CategoryScoreSchema,
    quota_attainment: CategoryScoreSchema,
  }),
  strengths: z.array(z.string()).min(1).max(5),
  weaknesses: z.array(z.string()).min(1).max(5),
  red_flags: z.array(z.string()),
  summary: z.string(),
  data_gaps: z.array(z.string()),
  overqualification_risk: z.boolean(),
  aspirational_flag: z.boolean(),
});

export type CVScore = z.infer<typeof CVScoreSchema>;

export const scoringJsonSchema = {
  type: "object" as const,
  properties: {
    candidate_name: { type: "string" },
    overall_score: { type: "integer" },
    recommendation: {
      type: "string",
      enum: ["strong_yes", "yes", "maybe", "no", "strong_no"],
    },
    category_scores: {
      type: "object",
      properties: {
        route_to_market: {
          type: "object",
          properties: {
            score: { type: "integer" },
            rationale: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rationale", "evidence"],
          additionalProperties: false,
        },
        client_type_fit: {
          type: "object",
          properties: {
            score: { type: "integer" },
            rationale: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rationale", "evidence"],
          additionalProperties: false,
        },
        deal_complexity: {
          type: "object",
          properties: {
            score: { type: "integer" },
            rationale: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rationale", "evidence"],
          additionalProperties: false,
        },
        sector_fit: {
          type: "object",
          properties: {
            score: { type: "integer" },
            rationale: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rationale", "evidence"],
          additionalProperties: false,
        },
        career_trajectory: {
          type: "object",
          properties: {
            score: { type: "integer" },
            rationale: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rationale", "evidence"],
          additionalProperties: false,
        },
        quota_attainment: {
          type: "object",
          properties: {
            score: { type: "integer" },
            rationale: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rationale", "evidence"],
          additionalProperties: false,
        },
      },
      required: [
        "route_to_market",
        "client_type_fit",
        "deal_complexity",
        "sector_fit",
        "career_trajectory",
        "quota_attainment",
      ],
      additionalProperties: false,
    },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    red_flags: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    data_gaps: { type: "array", items: { type: "string" } },
    overqualification_risk: { type: "boolean" },
    aspirational_flag: { type: "boolean" },
  },
  required: [
    "candidate_name",
    "overall_score",
    "recommendation",
    "category_scores",
    "strengths",
    "weaknesses",
    "red_flags",
    "summary",
    "data_gaps",
    "overqualification_risk",
    "aspirational_flag",
  ],
  additionalProperties: false,
};
