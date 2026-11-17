import { handle, bad } from "@/lib/http";
import { enqueue } from "@/lib/jobs";

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { type: string; assessmentId?: string; classCode?: string; yearGroup?: number };
  if (b.type === "class" && b.assessmentId && b.classCode) return { job: await enqueue("class_insight", { assessmentId: b.assessmentId, classCode: b.classCode }) };
  if (b.type === "year" && b.yearGroup) return { job: await enqueue("year_insight", { yearGroup: b.yearGroup }) };
  if (b.type === "history") return { job: await enqueue("history_insight") };
  throw bad("Unknown insight request.");
});
