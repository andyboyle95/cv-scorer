import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "@/lib/parse-pdf";
import { extractDocxText } from "@/lib/parse-docx";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      text = await extractPdfText(buffer);
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      text = await extractDocxText(buffer);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF or DOCX." },
        { status: 400 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse file";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!text || text.length < 50) {
    return NextResponse.json(
      {
        error:
          "Could not extract meaningful text from this file. It may be a scanned image PDF.",
      },
      { status: 422 }
    );
  }

  // Truncate very long CVs to ~16,000 chars (~4,000 tokens)
  if (text.length > 16000) {
    text =
      text.slice(0, 16000) + "\n\n[CV truncated — original was very long]";
  }

  return NextResponse.json({
    filename: file.name,
    text,
    charCount: text.length,
  });
}
