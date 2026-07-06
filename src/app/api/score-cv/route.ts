import { NextRequest, NextResponse } from "next/server";
import { scoreCv } from "@/lib/claude";
import type { JobBrief } from "@/lib/types";
import { requireSession } from "@/lib/session";
import { logUsage } from "@/lib/usage";

export const maxDuration = 60; // seconds

export async function POST(req: NextRequest) {
  try { await requireSession() } catch (r) { return r as Response }
  const { jobBrief, cvText } = (await req.json()) as {
    jobBrief: JobBrief;
    cvText: string;
  };

  if (!jobBrief || !cvText) {
    return NextResponse.json(
      { error: "Missing jobBrief or cvText" },
      { status: 400 }
    );
  }

  try {
    const score = await scoreCv(jobBrief, cvText);
    await logUsage({ tool: "cv-scorer", action: "score" });
    return NextResponse.json(score);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed";
    console.error("[score-cv] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
