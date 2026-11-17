import { sql } from "@/lib/db";
import { handle } from "@/lib/http";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { approved } = (await req.json()) as { approved: boolean };
  await sql`UPDATE reference_docs SET approved = ${approved} WHERE id = ${id}`;
  return { ok: true };
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await sql`DELETE FROM reference_docs WHERE id = ${id}`;
  return { ok: true };
});
