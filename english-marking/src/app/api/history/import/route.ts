import { sql, audit } from "@/lib/db";
import { handle, bad } from "@/lib/http";
import { anonId } from "@/lib/codes";

// Past results are stored without names: only a salted one-way hash of the candidate.
export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as {
    cohortYear: number;
    rows: { candidate: string; grade?: number | null; marks: Record<string, number | null>; pp?: boolean; send?: boolean; eal?: boolean }[];
  };
  if (!b.cohortYear || !b.rows?.length) throw bad("Choose the exam year and map at least one column.");
  let n = 0;
  for (const r of b.rows) {
    if (!r.candidate) continue;
    const marks = Object.fromEntries(Object.entries(r.marks).filter(([, v]) => v != null && !Number.isNaN(Number(v))).map(([k, v]) => [k, Number(v)]));
    await sql`INSERT INTO historical_results (cohort_year, anon_id, grade, question_marks, pp, send, eal)
      VALUES (${b.cohortYear}, ${anonId(`${b.cohortYear}:${r.candidate}`)}, ${r.grade ?? null}, ${sql.json(marks)}, ${r.pp ?? null}, ${r.send ?? null}, ${r.eal ?? null})
      ON CONFLICT (cohort_year, anon_id) DO UPDATE SET grade = EXCLUDED.grade, question_marks = EXCLUDED.question_marks`;
    n++;
  }
  await audit("history_import", { cohortYear: b.cohortYear, rows: n });
  return { imported: n };
});

export const DELETE = handle(async (req: Request) => {
  const year = Number(new URL(req.url).searchParams.get("year"));
  await sql`DELETE FROM historical_results WHERE cohort_year = ${year}`;
  return { ok: true };
});
