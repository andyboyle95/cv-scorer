import { handle, bad } from "@/lib/http";
import { audit } from "@/lib/db";
import { feedbackSheets, classReport, tutorPackDoc, markbookXlsx, yearXlsx } from "@/lib/exports/reports";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function file(buf: Buffer, name: string, type: string) {
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${name.replace(/[^\w.\- ]+/g, "_")}"` },
  });
}

export const GET = handle(async (req: Request, ctx: { params: Promise<{ kind: string }> }) => {
  const { kind } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const a = q.get("assessment") ?? "";
  const c = q.get("class") ?? undefined;
  await audit("export", { kind, assessment: a, class: c });
  switch (kind) {
    case "feedback":
      return file(await feedbackSheets(a, c), `Feedback ${c ?? "all"}.docx`, DOCX);
    case "class-report":
      if (!c) throw bad("Choose a class.");
      return file(await classReport(a, c), `Class report ${c}.docx`, DOCX);
    case "markbook":
      return file(await markbookXlsx(a), "Markbook.xlsx", XLSX);
    case "year":
      return file(await yearXlsx(Number(q.get("year"))), `Year ${q.get("year")} overview.xlsx`, XLSX);
    case "tutor-pack":
      return file(await tutorPackDoc(q.get("group") ?? ""), "Tutor pack.docx", DOCX);
    default:
      throw bad("Unknown export.");
  }
});
