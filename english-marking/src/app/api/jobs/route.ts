import { sql } from "@/lib/db";
import { handle } from "@/lib/http";

export const GET = handle(async (req: Request) => {
  const ids = new URL(req.url).searchParams.getAll("id");
  if (!ids.length) return { jobs: [] };
  const jobs = await sql`SELECT id, status, error FROM jobs WHERE id = ANY(${ids})`;
  return { jobs };
});
