import ExcelJS from "exceljs";
import Papa from "papaparse";
import { handle, bad } from "@/lib/http";

// Reads a CSV or XLSX upload and returns rows. Nothing is stored.
export const POST = handle(async (req: Request) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") throw bad("Choose a CSV or Excel file.");
  const name = file.name.toLowerCase();
  let rows: string[][] = [];
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    rows = Papa.parse<string[]>(await file.text(), { skipEmptyLines: true }).data;
  } else if (name.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);
    const ws = wb.worksheets[0];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = (row.values as unknown[]).slice(1).map((v) => {
        if (v == null) return "";
        if (typeof v === "object" && "text" in (v as object)) return String((v as { text: string }).text);
        if (typeof v === "object" && "result" in (v as object)) return String((v as { result: unknown }).result ?? "");
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        return String(v);
      });
      rows.push(vals);
    });
  } else {
    throw bad("Save the file as .csv or .xlsx and try again.");
  }
  // Find the header row: the first row with at least 2 non-empty cells.
  const start = rows.findIndex((r) => r.filter((c) => String(c).trim()).length >= 2);
  if (start < 0) throw bad("The file looks empty.");
  const headers = rows[start].map((h, i) => String(h).trim() || `Column ${i + 1}`);
  const body = rows.slice(start + 1).filter((r) => r.some((c) => String(c).trim()));
  return { headers, rows: body.map((r) => headers.map((_, i) => String(r[i] ?? "").trim())) };
});
