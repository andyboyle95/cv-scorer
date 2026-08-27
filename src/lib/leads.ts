// Lead capture for the public Job Spec Creator form.
//
// The database row is the source of truth. Email is a notification channel on
// top of it, not the capture mechanism — previously a misconfigured Resend
// sender meant the visitor still got their spec while the lead disappeared
// with nothing but a console.error to show for it.
//
// Every function here is failure-tolerant: a capture problem must never stop
// a visitor getting the spec they asked for. When the DB write itself fails we
// dump the lead to the server log so it is still recoverable from Render's
// logs.

import { prisma } from "./prisma";
import type { JobSpecAnswers } from "./job-spec-config";
import type { GeneratedJobSpec } from "./job-spec-schema";
import type { LeadEmailResult } from "./send-lead-email";

/** Writes the lead. Returns the new row's id, or null if the write failed. */
export async function recordLead(
  answers: JobSpecAnswers,
  spec: GeneratedJobSpec
): Promise<string | null> {
  try {
    const lead = await prisma.lead.create({
      data: {
        source: "job-spec-creator",
        name: answers.name,
        email: answers.email,
        companyUrl: answers.companyUrl || null,
        jobTitle: answers.jobTitle || null,
        industry: answers.industry || null,
        jobFunction: answers.jobFunction || null,
        seniority: answers.seniority || null,
        // Prisma's Json column takes a plain object; both are already
        // JSON-safe (they came off the wire / out of a Zod parse).
        answers: answers as unknown as object,
        spec: spec as unknown as object,
      },
      select: { id: true },
    });
    return lead.id;
  } catch (err) {
    // Last-resort trace. If the Lead table is missing (migration not run) or
    // Postgres is down, the lead is at least in the logs rather than gone.
    console.error(
      "[leads] FAILED to persist lead — recoverable copy follows:",
      err,
      JSON.stringify({
        name: answers.name,
        email: answers.email,
        companyUrl: answers.companyUrl,
        jobTitle: answers.jobTitle,
        industry: answers.industry,
        seniority: answers.seniority,
      })
    );
    return null;
  }
}

/** Stamps the outcome of the two emails onto an existing lead row. */
export async function recordLeadDelivery(
  leadId: string | null,
  result: LeadEmailResult
): Promise<void> {
  if (!leadId) return;
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        notifyStatus: result.notification.status,
        notifyError: result.notification.error ?? null,
        copyStatus: result.copy.status,
        copyError: result.copy.error ?? null,
      },
    });
  } catch (err) {
    console.error("[leads] failed to record delivery status", err);
  }
}
