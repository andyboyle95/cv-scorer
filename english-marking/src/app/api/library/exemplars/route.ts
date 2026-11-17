import { sql, audit } from "@/lib/db";
import { handle, bad } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { QUESTIONS } from "@/lib/aqa/spec";

export const POST = handle(async (req: Request) => {
  const f = await req.formData();
  const paper = String(f.get("paper"));
  const question = Number(f.get("question"));
  const spec = QUESTIONS[`${paper}Q${question}`];
  if (!spec) throw bad("Choose the paper and question.");
  const mark = Number(f.get("mark"));
  if (Number.isNaN(mark) || mark < 0 || mark > spec.marks) throw bad(`Enter a mark from 0 to ${spec.marks}.`);
  const ao5 = f.get("ao5") ? Number(f.get("ao5")) : null;
  const ao6 = f.get("ao6") ? Number(f.get("ao6")) : null;
  const text = String(f.get("answer_text") ?? "").trim();
  const pages = f.getAll("pages").filter((p): p is File => typeof p !== "string" && p.size > 0);
  if (!text && !pages.length) throw bad("Paste the answer or upload scans of it.");
  const images = pages.length ? await Promise.all(pages.map(async (p) => Buffer.from(await p.arrayBuffer()).toString("base64"))) : null;
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO exemplars (paper, question, mark, max_mark, ao_marks, commentary, answer_text, source, status, images)
    VALUES (${paper}, ${question}, ${mark}, ${spec.marks}, ${spec.isWriting && ao5 != null ? sql.json({ AO5: ao5, AO6: ao6 }) : null},
      ${String(f.get("commentary") ?? "").trim() || null}, ${text || null}, ${String(f.get("source") || "moderated")},
      ${text ? "ready" : "pending"}, ${images ? sql.json(images) : null})
    RETURNING id`;
  if (!text) await enqueue("transcribe_exemplar", { exemplarId: row.id });
  await audit("exemplar_add", { id: row.id });
  return { id: row.id };
});

export const DELETE = handle(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw bad("Missing id.");
  await sql`UPDATE exemplars SET active = false WHERE id = ${id}`;
  return { ok: true };
});
