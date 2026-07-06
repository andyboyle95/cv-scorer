import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { logUsage, UsageTool, UsageAction } from "@/lib/usage";

// Client-callable tracking endpoint. Fire-and-forget from the browser
// for actions that happen entirely client-side (PDF + DOCX downloads,
// primarily). Session-gated so a stray request from a signed-out
// visitor can't spam the analytics table.
//
// The set of accepted tool/action pairs is restricted to the same union
// types used server-side — anything else is a 400. Prevents an unhappy
// client from writing arbitrary rows.
const VALID_TOOLS = new Set([
  "cv-generator",
  "cv-scorer",
  "job-spec-creator",
  "interview-generator",
  "commute-calculator",
]);
const VALID_ACTIONS = new Set([
  "cv-import",
  "auto-rewrite",
  "tailor-job-spec",
  "anonymise",
  "intro-email",
  "interview-questions",
  "pdf-export",
  "docx-export",
  "score",
  "generate-spec",
  "generate-questions",
  "commute-lookup",
]);

export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch (r) {
    return r as Response;
  }

  const body = await req.json().catch(() => null);
  const tool = body?.tool as string | undefined;
  const action = body?.action as string | undefined;
  const meta = (body?.meta as Record<string, unknown> | undefined) ?? undefined;

  if (!tool || !action || !VALID_TOOLS.has(tool) || !VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid tool or action" }, { status: 400 });
  }

  await logUsage({ tool: tool as UsageTool, action: action as UsageAction, meta });
  return NextResponse.json({ ok: true });
}
