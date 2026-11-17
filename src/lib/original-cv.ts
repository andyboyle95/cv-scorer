// "Original format" client CV: the candidate's own file with their contact
// details removed and the layout left as it is. Runs in the browser; no AI.

import { redactText } from "./contact-redaction";
import { toTitleCaseFileName } from "./utils";

type Kind = "pdf" | "docx" | "text" | "other";

function kindOf(file: File): Kind {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".txt") || file.type === "text/plain") return "text";
  return "other";
}

/** The layout can only be kept for PDF, Word (.docx) and text files. */
export function canKeepOriginalFormat(file: File | null): boolean {
  return !!file && kindOf(file) !== "other";
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface OriginalCvResult {
  /** Number of places where contact details were removed. */
  changes: number;
  warning?: string;
}

export async function downloadOriginalCv(file: File, candidateName: string): Promise<OriginalCvResult> {
  const base = toTitleCaseFileName(candidateName) || "Candidate-CV";
  const kind = kindOf(file);

  if (kind === "pdf") {
    const { redactPdf } = await import("./pdf-redaction");
    const result = await redactPdf(file);
    download(result.blob, `${base}.pdf`);
    return {
      changes: result.changes,
      warning: result.hasText
        ? undefined
        : "This PDF is a scanned image, so no contact details could be found. Check it before you send it.",
    };
  }

  if (kind === "docx") {
    const { redactDocx } = await import("./docx-redaction");
    const result = await redactDocx(file);
    download(result.blob, `${base}.docx`);
    return { changes: result.changes };
  }

  if (kind === "text") {
    const text = await file.text();
    const redacted = redactText(text);
    download(new Blob([redacted], { type: "text/plain" }), `${base}.txt`);
    return { changes: text === redacted ? 0 : 1 };
  }

  throw new Error("The original layout can only be kept for PDF and Word (.docx) files.");
}
