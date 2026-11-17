import { sql, audit } from "@/lib/db";
import { handle, bad } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { extractText } from "@/lib/library";

export const POST = handle(async (req: Request) => {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    // Find online (AQA site only).
    const b = (await req.json()) as { query: string; paper?: string };
    if (!b.query?.trim()) throw bad("Say what to look for, e.g. 'June 2024 Paper 1 examiner report'.");
    const [row] = await sql<{ id: string }[]>`INSERT INTO reference_docs (kind, title, paper, status)
      VALUES ('examiner_report', ${b.query.trim()}, ${b.paper || null}, 'pending') RETURNING id`;
    await enqueue("research_reference", { referenceId: row.id });
    return { id: row.id };
  }
  const f = await req.formData();
  const file = f.get("file");
  const kind = String(f.get("kind") || "other");
  const pasted = String(f.get("text") ?? "").trim();
  let raw: string | null = pasted || null;
  let bin: Buffer | null = null;
  let mime: string | null = null;
  let title = String(f.get("title") ?? "").trim();
  if (file && typeof file !== "string" && file.size) {
    const data = Buffer.from(await file.arrayBuffer());
    title ||= file.name;
    const text = await extractText(file.name, data);
    if (text) raw = [raw, text].filter(Boolean).join("\n\n");
    else if (file.name.toLowerCase().endsWith(".pdf")) { bin = data; mime = "application/pdf"; }
    else throw bad("Upload a PowerPoint (.pptx), Word (.docx), PDF or text file.");
  }
  if (!raw && !bin) throw bad("Upload a file or paste the text.");
  const [row] = await sql<{ id: string }[]>`INSERT INTO reference_docs (kind, title, paper, raw_text, file, file_mime, status, approved)
    VALUES (${kind}, ${title || "Untitled"}, ${String(f.get("paper") || "") || null}, ${raw}, ${bin}, ${mime}, 'pending', ${kind === "department_structure"})
    RETURNING id`;
  await enqueue("digest_reference", { referenceId: row.id });
  await audit("reference_add", { id: row.id, kind });
  return { id: row.id };
});
