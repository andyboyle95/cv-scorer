// Usage tracking helper. Call from any server-side context (API route,
// server action) to record a user action. Never throws — if the write
// fails, we log and continue so a downstream DB hiccup doesn't fail the
// user's actual request.
//
// Values are typed as string unions so it's cheap to add a new event
// without a migration, but hard to typo one that already exists.

import { prisma } from "./prisma";
import { getSession } from "./session";

export type UsageTool =
  | "cv-generator"
  | "cv-scorer"
  | "job-spec-creator"
  | "interview-generator"
  | "commute-calculator";

export type UsageAction =
  // CV Generator
  | "cv-import"
  | "auto-rewrite"
  | "tailor-job-spec"
  | "anonymise"
  | "intro-email"
  | "interview-questions"
  | "pdf-export"
  | "docx-export"
  // CV Scorer
  | "score"
  // Job Spec Creator
  | "generate-spec"
  // Interview Generator (standalone)
  | "generate-questions"
  // Commute Calculator
  | "commute-lookup";

interface LogUsageInput {
  tool: UsageTool;
  action: UsageAction;
  meta?: Record<string, unknown>;
  // Explicit userId/email override for cases where getSession() is not
  // usable (e.g. public /job-spec form has no session).
  userId?: string | null;
  userEmail?: string | null;
}

export async function logUsage({ tool, action, meta, userId, userEmail }: LogUsageInput): Promise<void> {
  try {
    // If caller didn't pass an explicit userId, try the session.
    let finalUserId = userId;
    let finalEmail = userEmail;
    if (finalUserId === undefined) {
      const session = await getSession();
      finalUserId = session?.user?.id ?? null;
      finalEmail = session?.user?.email ?? null;
    }
    await prisma.usageEvent.create({
      data: {
        tool,
        action,
        userId: finalUserId,
        userEmail: finalEmail,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (err) {
    // Never throw. A tracking outage should never break the actual product.
    console.error("[usage] failed to log", tool, action, err);
  }
}
