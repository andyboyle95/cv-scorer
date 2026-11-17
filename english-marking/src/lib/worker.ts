import Anthropic from "@anthropic-ai/sdk";
import { claim, finish, fail, enqueue, type JobType } from "./jobs";
import { sql } from "./db";

type Handler = (payload: Record<string, unknown>) => Promise<void>;

async function handlers(): Promise<Record<JobType, Handler>> {
  const pipeline = await import("./pipeline");
  const library = await import("./library");
  const insights = await import("./insights");
  const retention = await import("./retention");
  return {
    process_script: (p) => pipeline.processScript(p.scriptId as string),
    transcribe_exemplar: (p) => library.transcribeExemplar(p.exemplarId as string),
    digest_reference: (p) => library.digestReference(p.referenceId as string),
    research_reference: (p) => library.researchReference(p.referenceId as string),
    class_insight: (p) => insights.buildClassInsight(p.assessmentId as string, p.classCode as string),
    year_insight: (p) => insights.buildYearInsight(Number(p.yearGroup)),
    tutor_pack: (p) => insights.buildTutorPack(p.groupId as string),
    history_insight: () => insights.buildHistoryInsight(),
    retention_sweep: () => retention.sweep(),
  };
}

function retryable(err: unknown) {
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.InternalServerError) return true;
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.APIError) return (err.status ?? 0) >= 500 || err.status === 429;
  return true; // database blips, timeouts
}

let started = false;

export function startWorker() {
  if (started || !process.env.DATABASE_URL) return;
  started = true;
  const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 3);
  let table: Record<JobType, Handler> | null = null;

  const loop = async (slot: number) => {
    // Small stagger so slots do not all hit the DB at once.
    await new Promise((r) => setTimeout(r, 500 * slot));
    for (;;) {
      try {
        table ??= await handlers();
        const job = await claim();
        if (!job) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        try {
          await table[job.type](job.payload);
          await finish(job.id);
        } catch (err) {
          console.error(`[worker] ${job.type} ${job.id} failed`, err);
          await fail(job.id, job.attempts, err, retryable(err));
          if (job.type === "process_script" && !(retryable(err) && job.attempts < 3)) {
            await sql`UPDATE scripts SET status = 'error', error = ${String((err as Error)?.message ?? err)}
                      WHERE id = ${job.payload.scriptId as string}`;
          }
        }
      } catch (err) {
        console.error("[worker] loop error", err);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };
  for (let i = 0; i < concurrency; i++) void loop(i);

  // Daily retention sweep (deletes old scan images).
  setInterval(() => void enqueue("retention_sweep").catch(() => {}), 24 * 60 * 60 * 1000);
  console.log(`[worker] started with ${concurrency} slots`);
}
