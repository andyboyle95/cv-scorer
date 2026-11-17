import { sql, audit } from "@/lib/db";
import { handle, bad } from "@/lib/http";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { studentId } = (await req.json()) as { studentId: string };
  if (!studentId) throw bad("Choose a student.");
  await sql`UPDATE scripts SET student_id = ${studentId}, updated_at = now() WHERE id = ${id}`;
  await audit("script_assign", { id, studentId });
  return { ok: true };
});
