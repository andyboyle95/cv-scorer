import { handle, bad } from "@/lib/http";
import { saveSetting, type AppSettings } from "@/lib/settings";
import { audit } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as Partial<AppSettings>;
  if (b.boundaries) {
    const g = b.boundaries.grades;
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => Number(g[String(k)]));
    if (vals.some((v) => Number.isNaN(v)) || vals.some((v, i) => i && v <= vals[i - 1])) throw bad("Boundaries must rise from grade 1 to grade 9.");
    await saveSetting("boundaries", { label: b.boundaries.label || "Custom", total: Number(b.boundaries.total) || 160, grades: Object.fromEntries(vals.map((v, i) => [String(i + 1), v])) });
  }
  if (b.moderationRate != null) await saveSetting("moderationRate", Math.max(0, Math.min(1, Number(b.moderationRate))));
  if (b.retentionMonths != null) await saveSetting("retentionMonths", Math.max(1, Math.min(84, Math.round(Number(b.retentionMonths)))));
  if (b.doubleMarkFrom != null) await saveSetting("doubleMarkFrom", Math.max(1, Math.round(Number(b.doubleMarkFrom))));
  if (b.disagreementTolerance != null) await saveSetting("disagreementTolerance", Math.max(0, Math.round(Number(b.disagreementTolerance))));
  if (b.interventionGroupSize != null) await saveSetting("interventionGroupSize", Math.max(2, Math.min(15, Math.round(Number(b.interventionGroupSize)))));
  if (b.effort && ["low", "medium", "high", "xhigh", "max"].includes(b.effort)) await saveSetting("effort", b.effort);
  await audit("settings_update", b as Record<string, unknown>);
  return { ok: true };
});
