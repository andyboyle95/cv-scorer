import { sql } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await ctx.params;
  const [row] = await sql<{ image: Buffer; mime: string }[]>`
    SELECT image, mime FROM script_pages WHERE script_id = ${id} AND page_no = ${Number(n)}`;
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.image), { headers: { "Content-Type": row.mime, "Cache-Control": "private, no-store" } });
}
