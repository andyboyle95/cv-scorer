import { sql } from "./db";

export type JobType =
  | "process_script"
  | "transcribe_exemplar"
  | "digest_reference"
  | "research_reference"
  | "class_insight"
  | "year_insight"
  | "tutor_pack"
  | "history_insight"
  | "retention_sweep";

export async function enqueue(type: JobType, payload: Record<string, unknown> = {}) {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO jobs (type, payload) VALUES (${type}, ${sql.json(payload as never)}) RETURNING id`;
  return row.id;
}

/** Claim one job atomically. Stale locks (crashed worker) are reclaimed after 20 minutes. */
export async function claim() {
  const rows = await sql<{ id: string; type: JobType; payload: Record<string, unknown>; attempts: number }[]>`
    UPDATE jobs SET status = 'running', locked_at = now(), attempts = attempts + 1
    WHERE id = (
      SELECT id FROM jobs
      WHERE (status = 'queued' AND run_after <= now())
         OR (status = 'running' AND locked_at < now() - interval '20 minutes')
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, type, payload, attempts`;
  return rows[0] ?? null;
}

export async function finish(id: string) {
  await sql`UPDATE jobs SET status = 'done', finished_at = now(), error = NULL WHERE id = ${id}`;
}

export async function fail(id: string, attempts: number, err: unknown, retryable: boolean) {
  const message = err instanceof Error ? err.message : String(err);
  if (retryable && attempts < 3) {
    const delay = 30 * attempts;
    await sql`UPDATE jobs SET status = 'queued', error = ${message},
              run_after = now() + make_interval(secs => ${delay}) WHERE id = ${id}`;
  } else {
    await sql`UPDATE jobs SET status = 'error', error = ${message}, finished_at = now() WHERE id = ${id}`;
  }
}

export async function queueStats() {
  const rows = await sql<{ status: string; n: number }[]>`
    SELECT status, count(*)::int AS n FROM jobs WHERE created_at > now() - interval '2 days' GROUP BY status`;
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}
