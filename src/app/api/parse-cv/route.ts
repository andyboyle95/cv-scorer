import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "@/lib/parse-pdf";
import { extractDocxText } from "@/lib/parse-docx";
import { requireSession } from "@/lib/session";

function stripRtf(rtf: string): string {
  // Remove RTF control words, groups and special chars
  return rtf
    .replace(/\\([a-z]+)(-?\d+)? ?/g, " ")
    .replace(/[{}\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try { await requireSession() } catch (r) { return r as Response }
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let text = "";

  try {
    if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      text = await extractPdfText(buffer);
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      text = await extractDocxText(buffer);
    } else if (name.endsWith(".doc")) {
      // Try mammoth first (works for some .doc files), fall back to plain text
      try {
        text = await extractDocxText(buffer);
      } catch {
        text = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      }
    } else if (name.endsWith(".rtf")) {
      text = stripRtf(buffer.toString("utf-8"));
    } else if (
      name.endsWith(".txt") ||
      file.type === "text/plain"
    ) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, DOC, RTF, or TXT." },
        { status: 400 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse file";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!text || text.length < 50) {
    return NextResponse.json(
      { error: "Could not extract meaningful text from this file. It may be a scanned image PDF." },
      { status: 422 }
    );
  }

  // Truncate very long CVs
  if (text.length > 16000) {
    text = text.slice(0, 16000) + "\n\n[CV truncated — original was very long]";
  }

  return NextResponse.json({ filename: file.name, text, charCount: text.length });
}
