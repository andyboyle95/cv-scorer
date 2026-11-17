import { sql, audit } from "@/lib/db";
import { handle } from "@/lib/http";
import { enqueue } from "@/lib/jobs";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = (await req.json()) as { action: "pack" } | { action: "update"; tutor?: string; startDate?: string; addIds?: string[]; removeIds?: string[] };
  if (b.action === "pack") return { job: await enqueue("tutor_pack", { groupId: id }) };
  if (b.tutor !== undefined || b.startDate !== undefined) {
    await sql`UPDATE intervention_groups SET tutor = ${b.tutor ?? null}, start_date = ${b.startDate || null} WHERE id = ${id}`;
  }
  for (const s of b.addIds ?? []) await sql`INSERT INTO intervention_members (group_id, student_id) VALUES (${id}, ${s}) ON CONFLICT DO NOTHING`;
  if (b.removeIds?.length) await sql`DELETE FROM intervention_members WHERE group_id = ${id} AND student_id = ANY(${b.removeIds})`;
  return { ok: true };
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await sql`DELETE FROM intervention_groups WHERE id = ${id}`;
  await audit("intervention_delete", { id });
  return { ok: true };
});
