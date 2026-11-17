import { sql, audit } from "@/lib/db";
import { handle, bad } from "@/lib/http";
import { getSettings } from "@/lib/settings";
import { gradeFor } from "@/lib/grades";

type Body = {
  moderator: string;
  questions: { question: number; teacher_mark: number; comment?: string; save_exemplar?: boolean }[];
};

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = (await req.json()) as Body;
  if (!body.moderator?.trim()) throw bad("Add your initials so moderation is traceable.");
  const [s] = await sql<{ assessment_id: string; paper: string; max_mark: string; transcription: { answers: { question: number; text: string }[] } | null }[]>`
    SELECT s.assessment_id, a.paper, s.max_mark, s.transcription FROM scripts s JOIN assessments a ON a.id = s.assessment_id WHERE s.id = ${id}`;
  if (!s) throw bad("Script not found.");
  const settings = await getSettings();
  await sql.begin(async (tx) => {
    for (const q of body.questions) {
      const [row] = await tx<{ max_mark: number }[]>`SELECT max_mark FROM question_results WHERE script_id = ${id} AND question = ${q.question}`;
      if (!row) continue;
      const mark = Math.max(0, Math.min(row.max_mark, Number(q.teacher_mark)));
      await tx`UPDATE question_results SET teacher_mark = ${mark}, teacher_comment = ${q.comment ?? null}
               WHERE script_id = ${id} AND question = ${q.question}`;
      if (q.save_exemplar) {
        const text = s.transcription?.answers.filter((a) => a.question === q.question).map((a) => a.text).join("\n\n");
        if (text) {
          await tx`INSERT INTO exemplars (paper, question, mark, max_mark, commentary, answer_text, source, assessment_id)
                   VALUES (${s.paper}, ${q.question}, ${mark}, ${row.max_mark}, ${q.comment ?? null}, ${text}, 'teacher_override', ${s.assessment_id})`;
        }
      }
    }
    const [{ total }] = await tx<{ total: string }[]>`
      SELECT COALESCE(SUM(COALESCE(teacher_mark, ai_mark)), 0) AS total FROM question_results WHERE script_id = ${id}`;
    await tx`UPDATE scripts SET total_mark = ${Number(total)}, grade_estimate = ${gradeFor(Number(total), Number(s.max_mark), settings.boundaries)},
             moderated_at = now(), moderated_by = ${body.moderator.trim()}, needs_review = false, updated_at = now() WHERE id = ${id}`;
  });
  await audit("script_moderate", { id, moderator: body.moderator });
  return { ok: true };
});
