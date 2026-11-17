import { sql, audit } from "@/lib/db";
import { handle, bad, fileBuffer } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const f = await req.formData();
  const title = String(f.get("title") ?? "").trim();
  const paper = String(f.get("paper") ?? "");
  const year = Number(f.get("year_group"));
  const questions = String(f.get("questions") ?? "").split(",").map(Number).filter((n) => n >= 1 && n <= 5);
  if (!title) throw bad("Give the assessment a name.");
  if (!["P1", "P2"].includes(paper)) throw bad("Choose Paper 1 or Paper 2.");
  if (![10, 11].includes(year)) throw bad("Choose Year 10 or Year 11.");
  if (!questions.length) throw bad("Choose at least one question.");
  const questionTexts: Record<string, string> = {};
  for (const q of questions) {
    const t = String(f.get(`q${q}`) ?? "").trim();
    if (t) questionTexts[q] = t;
  }
  const key = String(f.get("answer_key") ?? "").toUpperCase().match(/[A-H]/g);
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO assessments (title, year_group, paper, questions, sat_on, question_texts, answer_key, source_text, source_pdf, mark_scheme_pdf, is_calibration)
    VALUES (${title}, ${year}, ${paper}, ${questions}, ${String(f.get("sat_on") || "") || null},
      ${sql.json(questionTexts)}, ${key ? sql.json([...new Set(key)]) : null},
      ${String(f.get("source_text") ?? "").trim() || null}, ${await fileBuffer(f.get("source_pdf"))},
      ${await fileBuffer(f.get("mark_scheme_pdf"))}, ${f.get("is_calibration") === "on"})
    RETURNING id`;
  await audit("assessment_create", { id: row.id, title });
  return { id: row.id };
});
