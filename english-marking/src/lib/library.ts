import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { sql } from "./db";
import { aiMode, structured, imageBlock, pdfBlock, textBlock, MODEL, type Block } from "./ai/client";
import { QUESTIONS, qid, type Paper } from "./aqa/spec";

// ---------------------------------------------------------------- reference notes used in marking

type Digest = { general?: string; questions?: Record<string, string> };

/** Approved notes from the library that apply to one question. Kept short so prompts stay focused. */
export async function referenceNotesFor(paper: Paper, q: number): Promise<string> {
  const id = qid(paper, q);
  const rows = await sql<{ kind: string; title: string; digest: Digest | null }[]>`
    SELECT kind, title, digest FROM reference_docs
    WHERE status = 'ready' AND approved AND (paper IS NULL OR paper = ${paper})
    ORDER BY kind = 'department_structure' DESC, created_at DESC`;
  const parts: string[] = [];
  for (const r of rows) {
    const specific = r.digest?.questions?.[id];
    if (!specific && r.kind !== "department_structure") continue;
    const general = r.kind === "department_structure" ? r.digest?.general : undefined;
    const body = [general, specific].filter(Boolean).join("\n");
    if (body) parts.push(`[${r.kind === "department_structure" ? "Department structure" : r.title}]\n${body}`);
  }
  return parts.join("\n\n").slice(0, 8000);
}

// ---------------------------------------------------------------- exemplars

export async function transcribeExemplar(exemplarId: string) {
  const [ex] = await sql<{ id: string; paper: Paper; question: number; images: string[] | null }[]>`
    SELECT id, paper, question, images FROM exemplars WHERE id = ${exemplarId}`;
  if (!ex || !ex.images?.length) return;
  let text: string;
  if (aiMode() === "demo") {
    text = "[Demo transcription. Add an ANTHROPIC_API_KEY to transcribe exemplars.]";
  } else {
    const out = await structured({
      schema: z.object({ text: z.string() }),
      effort: "medium",
      system: [
        "You transcribe one GCSE English exam answer from scans. Copy the words exactly, keeping every spelling, grammar and punctuation error and paragraph breaks. Write [illegible] for unreadable words. Leave out names and printed question text.",
      ],
      content: [
        ...ex.images.map((b64) => imageBlock(Buffer.from(b64, "base64"))),
        textBlock(`Transcribe the student's answer to ${ex.paper === "P1" ? "Paper 1" : "Paper 2"} Question ${ex.question}.`),
      ],
    });
    text = out.text;
  }
  // Images are deleted once transcribed: only the text is kept.
  await sql`UPDATE exemplars SET answer_text = ${text}, images = NULL, status = 'ready' WHERE id = ${exemplarId}`;
}

// ---------------------------------------------------------------- digests of uploaded documents

const DigestSchema = z.object({
  general: z.string().describe("Points that apply to every question (for department structures: the structures themselves, in full, as steps or sentence stems)."),
  questions: z.array(
    z.object({
      id: z.enum(Object.keys(QUESTIONS) as [string, ...string[]]),
      notes: z.string().describe("Specific, usable marking or teaching points for this question. Include department structures that apply to it word for word."),
    }),
  ),
});

const DIGEST_SYSTEM = `You prepare reference notes for an AI that marks AQA GCSE English Language (8700) answers. Question ids: ${Object.values(QUESTIONS)
  .map((q) => `${q.id} = ${q.title}`)
  .join("; ")}.
Turn the document into short, precise notes per question: what examiners rewarded, what held answers back, indicative content, and any structure students are taught to follow. Keep the document's wording for structures, sentence stems and acronyms. Do not invent anything.`;

export async function digestReference(referenceId: string) {
  const [doc] = await sql<{ id: string; kind: string; title: string; raw_text: string | null; file: Buffer | null; file_mime: string | null }[]>`
    SELECT id, kind, title, raw_text, file, file_mime FROM reference_docs WHERE id = ${referenceId}`;
  if (!doc) return;
  try {
    let digest: Digest;
    if (aiMode() === "demo") {
      digest = { general: `Demo digest of "${doc.title}".`, questions: {} };
    } else {
      const content: Block[] = [];
      if (doc.file && doc.file_mime === "application/pdf") content.push(pdfBlock(doc.file, doc.title));
      if (doc.raw_text) content.push(textBlock(`<document>\n${doc.raw_text.slice(0, 200_000)}\n</document>`));
      content.push(textBlock(`Document type: ${doc.kind.replace("_", " ")}. Title: ${doc.title}. Write the notes.`));
      const out = await structured({ schema: DigestSchema, system: [DIGEST_SYSTEM], content, effort: "high" });
      digest = { general: out.general, questions: Object.fromEntries(out.questions.map((q) => [q.id, q.notes])) };
    }
    await sql`UPDATE reference_docs SET digest = ${sql.json(digest as never)}, status = 'ready', error = NULL,
              file = NULL WHERE id = ${referenceId}`;
  } catch (err) {
    await sql`UPDATE reference_docs SET status = 'error', error = ${(err as Error).message} WHERE id = ${referenceId}`;
    throw err;
  }
}

// ---------------------------------------------------------------- find online (AQA site only)

const AQA_DOMAINS = ["aqa.org.uk", "filestore.aqa.org.uk"];

export async function researchReference(referenceId: string) {
  const [doc] = await sql<{ id: string; title: string; paper: Paper | null }[]>`
    SELECT id, title, paper FROM reference_docs WHERE id = ${referenceId}`;
  if (!doc) return;
  if (aiMode() === "demo") {
    await sql`UPDATE reference_docs SET status = 'ready', digest = ${sql.json({ general: "Demo: online research needs an API key.", questions: {} } as never)} WHERE id = ${referenceId}`;
    return;
  }
  try {
    const client = new Anthropic({ timeout: 15 * 60 * 1000 });
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Find the official AQA material for: "${doc.title}" (GCSE English Language 8700${doc.paper ? `, ${doc.paper === "P1" ? "Paper 1" : "Paper 2"}` : ""}).
Look for the published mark scheme and examiner report on aqa.org.uk. Read them, then write detailed notes for each question (Q1-Q5): indicative content, what top answers did, common weaknesses, and anything examiners stressed. Quote the descriptors and examiner comments closely. List the URLs you used at the end. If you cannot find a document, say so plainly.`,
      },
    ];
    let report = "";
    const urls = new Set<string>();
    for (let turn = 0; turn < 6; turn++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 32000,
        output_config: { effort: "high" },
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 8, allowed_domains: AQA_DOMAINS },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: 8, allowed_domains: AQA_DOMAINS },
        ],
        messages,
      });
      for (const block of res.content) {
        if (block.type === "text") report += block.text;
        if (block.type === "web_fetch_tool_result" && "url" in block.content) urls.add(String(block.content.url));
      }
      if (res.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: res.content });
    }
    if (!report.trim()) throw new Error("The search found nothing to report.");

    const out = await structured({
      schema: DigestSchema,
      system: [DIGEST_SYSTEM],
      content: [textBlock(`<research_report>\n${report}\n</research_report>\nWrite the notes from this report only.`)],
      effort: "medium",
    });
    const digest = { general: out.general, questions: Object.fromEntries(out.questions.map((q) => [q.id, q.notes])) };
    await sql`UPDATE reference_docs SET digest = ${sql.json(digest as never)}, raw_text = ${report},
              sources = ${sql.json([...urls] as never)}, status = 'ready', error = NULL WHERE id = ${referenceId}`;
  } catch (err) {
    await sql`UPDATE reference_docs SET status = 'error', error = ${(err as Error).message} WHERE id = ${referenceId}`;
    throw err;
  }
}

// ---------------------------------------------------------------- text extraction for uploads

export async function extractText(name: string, data: Buffer): Promise<string | null> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pptx")) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(data);
    const slides = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => Number(a.match(/(\d+)/)![1]) - Number(b.match(/(\d+)/)![1]));
    const out: string[] = [];
    for (const [i, f] of slides.entries()) {
      const xml = await zip.files[f].async("string");
      const paras = xml.split(/<\/a:p>/).map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join("")).filter(Boolean);
      out.push(`--- Slide ${i + 1} ---\n${paras.join("\n")}`);
    }
    return decodeXml(out.join("\n\n"));
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: data })).value;
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return data.toString("utf8");
  return null; // PDFs are read directly by the model
}

function decodeXml(s: string) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
