import { sql, audit } from "@/lib/db";
import { handle, bad, notFound } from "@/lib/http";
import { enqueue } from "@/lib/jobs";

/** One student's pages for an assessment. Cover sheets never reach the server. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const f = await req.formData();
  const [a] = await sql`SELECT id FROM assessments WHERE id = ${id}`;
  if (!a) throw notFound("Assessment not found.");
  let studentId = String(f.get("student_id") ?? "") || null;
  const code = String(f.get("code") ?? "").trim().toUpperCase();
  if (!studentId && code) {
    const [s] = await sql<{ id: string }[]>`SELECT id FROM students WHERE code = ${code}`;
    studentId = s?.id ?? null;
  }
  if (!studentId) throw bad("Choose which student this work belongs to.");
  const pages = f.getAll("pages").filter((p): p is File => typeof p !== "string" && p.size > 0);
  if (!pages.length) throw bad("No pages were uploaded.");
  if (pages.some((p) => p.size > 8 * 1024 * 1024)) throw bad("A page is over 8 MB. Scan at 150-200 dpi and try again.");

  const scriptId = await sql.begin(async (tx) => {
    const [existing] = await tx<{ id: string }[]>`SELECT id FROM scripts WHERE assessment_id = ${id} AND student_id = ${studentId}`;
    let sid: string;
    if (existing) {
      sid = existing.id;
      await tx`DELETE FROM script_pages WHERE script_id = ${sid}`;
      await tx`DELETE FROM question_results WHERE script_id = ${sid}`;
      await tx`UPDATE scripts SET status = 'queued', error = NULL, transcription = NULL, summary = NULL, moderated_at = NULL,
               images_deleted_at = NULL, updated_at = now() WHERE id = ${sid}`;
    } else {
      [{ id: sid }] = await tx<{ id: string }[]>`INSERT INTO scripts (assessment_id, student_id) VALUES (${id}, ${studentId}) RETURNING id`;
    }
    let n = 1;
    for (const p of pages) {
      await tx`INSERT INTO script_pages (script_id, page_no, mime, image) VALUES (${sid}, ${n++}, ${p.type || "image/jpeg"}, ${Buffer.from(await p.arrayBuffer())})`;
    }
    return sid;
  });
  await enqueue("process_script", { scriptId });
  await audit("script_upload", { assessmentId: id, scriptId, pages: pages.length });
  return { scriptId };
});
