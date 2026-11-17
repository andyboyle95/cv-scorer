import { sql, audit } from "@/lib/db";
import { handle, bad } from "@/lib/http";
import { enqueue } from "@/lib/jobs";

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const [s] = await sql<{ images_deleted_at: Date | null }[]>`SELECT images_deleted_at FROM scripts WHERE id = ${id}`;
  if (!s) throw bad("Script not found.");
  if (s.images_deleted_at) throw bad("The scan was deleted under the retention policy, so it cannot be re-marked.");
  await sql`UPDATE scripts SET status = 'queued', error = NULL, updated_at = now() WHERE id = ${id}`;
  await enqueue("process_script", { scriptId: id });
  await audit("script_remark", { id });
  return { ok: true };
});
