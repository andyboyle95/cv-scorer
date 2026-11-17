import { sql } from "./db";

export type GradeBoundaries = { label: string; total: number; grades: Record<string, number> };

// AQA 8700 subject boundaries (out of 160). Sources: AQA grade boundary documents.
export const BOUNDARY_PRESETS: GradeBoundaries[] = [
  { label: "AQA June 2026", total: 160, grades: { "9": 122, "8": 112, "7": 103, "6": 93, "5": 84, "4": 75, "3": 55, "2": 35, "1": 16 } },
  { label: "AQA June 2025", total: 160, grades: { "9": 119, "8": 109, "7": 100, "6": 91, "5": 82, "4": 73, "3": 54, "2": 35, "1": 16 } },
  { label: "AQA June 2024", total: 160, grades: { "9": 121, "8": 111, "7": 102, "6": 92, "5": 82, "4": 73, "3": 54, "2": 35, "1": 16 } },
  { label: "AQA June 2023", total: 160, grades: { "9": 121, "8": 111, "7": 102, "6": 91, "5": 81, "4": 71, "3": 52, "2": 34, "1": 16 } },
];

export type AppSettings = {
  boundaries: GradeBoundaries;
  moderationRate: number;       // fraction of scripts sampled for teacher check
  retentionMonths: number;      // scan images are deleted after this
  doubleMarkFrom: number;       // questions worth at least this many marks are marked twice
  disagreementTolerance: number;// marks; above this a third pass decides
  interventionGroupSize: number;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
};

export const DEFAULT_SETTINGS: AppSettings = {
  boundaries: BOUNDARY_PRESETS[0],
  moderationRate: 0.2,
  retentionMonths: 12,
  doubleMarkFrom: 16,
  disagreementTolerance: 2,
  interventionGroupSize: 6,
  effort: "high",
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await sql<{ key: string; value: unknown }[]>`SELECT key, value FROM settings`;
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out as AppSettings;
}

export async function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  await sql`INSERT INTO settings (key, value) VALUES (${key}, ${sql.json(value as never)})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}
