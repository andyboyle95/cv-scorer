import { sql, audit } from "@/lib/db";
import { handle, bad } from "@/lib/http";
import { anonymiseStudents, eraseStudent, sweep } from "@/lib/retention";

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { action: "anonymise_leavers" | "erase" | "sweep"; studentId?: string };
  if (b.action === "anonymise_leavers") {
    const ids = (await sql<{ id: string }[]>`SELECT id FROM students WHERE status = 'left'`).map((r) => r.id);
    return { anonymised: await anonymiseStudents(ids) };
  }
  if (b.action === "erase" && b.studentId) {
    await eraseStudent(b.studentId);
    return { ok: true };
  }
  if (b.action === "sweep") {
    await sweep();
    return { ok: true };
  }
  throw bad("Unknown action.");
});

/** Subject access request: everything held about one student, as JSON. */
export const GET = handle(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("student");
  if (!id) throw bad("Missing student.");
  const [student] = await sql`SELECT * FROM students WHERE id = ${id}`;
  const scripts = await sql`SELECT s.id, a.title, s.created_at, s.total_mark, s.max_mark, s.grade_estimate, s.summary, s.transcription
    FROM scripts s JOIN assessments a ON a.id = s.assessment_id WHERE s.student_id = ${id}`;
  const results = await sql`SELECT * FROM question_results WHERE script_id = ANY(${scripts.map((s) => s.id as string)})`;
  const groups = await sql`SELECT g.name, g.tutor FROM intervention_members m JOIN intervention_groups g ON g.id = m.group_id WHERE m.student_id = ${id}`;
  await audit("subject_access_export", { id });
  return new Response(JSON.stringify({ student, scripts, results, groups }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="student-${student?.code ?? id}.json"` },
  });
});
