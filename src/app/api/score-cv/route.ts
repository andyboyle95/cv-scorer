import { NextRequest, NextResponse } from "next/server";
import { scoreCv } from "@/lib/claude";
import type { JobBrief } from "@/lib/types";

export async function POST(req: NextRequest) {
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
    return NextResponse.json(score);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed";
    console.error("[score-cv] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
