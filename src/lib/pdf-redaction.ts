// PDF support for the client CV exports. Runs in the browser.
//
// redactPdf: draws each page, paints over contact details in the colour of the
// background, and builds a new PDF from the page images. The layout looks the
// same as the original, and the contact details are gone from the file (not
// only hidden under a box).
//
// extractPdfBlocks: the candidate's text in reading order, with headings and
// bullet points, for the "original wording" view.

import { findContactRanges } from "./contact-redaction";

type PdfjsModule = typeof import("pdfjs-dist");
type PdfPage = Awaited<ReturnType<Awaited<ReturnType<PdfjsModule["getDocument"]>["promise"]>["getPage"]>>;

let pdfjsPromise: Promise<PdfjsModule> | null = null;

function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      // Copied into /public by scripts/copy-pdf-worker.mjs
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function openPdf(file: Blob) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  return { pdfjs, pdf: await pdfjs.getDocument({ data }).promise };
}

interface PlacedItem {
  str: string;
  x: number; // left, in viewport pixels
  width: number;
  baseline: number; // y of the baseline, in viewport pixels (top-down)
  size: number; // font height in viewport pixels
  hasEOL: boolean;
}

async function placedItems(pdfjs: PdfjsModule, page: PdfPage, scale: number) {
  const viewport = page.getViewport({ scale });
  const content = await page.getTextContent();
  const items: PlacedItem[] = [];
  for (const raw of content.items) {
    if (!("str" in raw)) continue;
    const tx = pdfjs.Util.transform(viewport.transform, raw.transform);
    const size = Math.hypot(tx[2], tx[3]) || Math.abs(raw.height * scale);
    items.push({
      str: raw.str,
      x: tx[4],
      width: raw.width * scale,
      baseline: tx[5],
      size,
      hasEOL: raw.hasEOL,
    });
  }
  return { viewport, items };
}

interface LineSpan {
  item: PlacedItem;
  start: number;
  end: number;
}

interface Line {
  text: string;
  spans: LineSpan[];
  baseline: number;
  size: number;
  left: number;
  right: number;
}

// Join items into a line. A wide gap gets three spaces, which the contact
// detection treats as a separator (e.g. two columns side by side).
function buildLine(items: PlacedItem[]): Line {
  let text = "";
  const spans: LineSpan[] = [];
  let prev: PlacedItem | null = null;
  for (const item of items) {
    if (prev) {
      const gap = item.x - (prev.x + prev.width);
      const space = Math.max(prev.size, item.size);
      if (gap > space * 1.5) text += "   ";
      else if (gap > space * 0.15 && !/\s$/.test(text) && !/^\s/.test(item.str)) text += " ";
    }
    spans.push({ item, start: text.length, end: text.length + item.str.length });
    text += item.str;
    prev = item;
  }
  return {
    text,
    spans,
    baseline: items.reduce((s, i) => s + i.baseline, 0) / Math.max(items.length, 1),
    size: Math.max(0, ...items.map((i) => i.size)),
    left: Math.min(...items.map((i) => i.x)),
    right: Math.max(...items.map((i) => i.x + i.width)),
  };
}

// Lines by position on the page: items with the same baseline, left to right.
function visualLines(items: PlacedItem[]): Line[] {
  const sorted = items
    .filter((i) => i.str.length > 0)
    .sort((a, b) => a.baseline - b.baseline || a.x - b.x);
  const groups: PlacedItem[][] = [];
  for (const item of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g[0].baseline - item.baseline) <= Math.max(g[0].size, item.size) * 0.4) {
      g.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups.map((g) => buildLine(g.sort((a, b) => a.x - b.x)));
}

// Lines in the order the PDF stores the text, which is normally reading order
// (one column after the other).
function readingLines(items: PlacedItem[]): Line[] {
  const lines: Line[] = [];
  let current: PlacedItem[] = [];
  const flush = () => {
    if (current.some((i) => i.str.trim())) lines.push(buildLine(current));
    current = [];
  };
  for (const item of items) {
    const last = current[current.length - 1];
    if (last && Math.abs(last.baseline - item.baseline) > Math.max(last.size, item.size) * 0.4) flush();
    if (item.str.length > 0) current.push(item);
    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function contactBoxes(lines: Line[]): Box[] {
  const boxes: Box[] = [];
  for (const line of lines) {
    for (const [s, e] of findContactRanges(line.text)) {
      for (const { item, start, end } of line.spans) {
        if (end <= s || start >= e) continue;
        const len = Math.max(item.str.length, 1);
        const from = Math.max(s, start) - start;
        const to = Math.min(e, end) - start;
        const x0 = item.x + (item.width * from) / len;
        const x1 = item.x + (item.width * to) / len;
        const pad = item.size * 0.15;
        boxes.push({
          x: x0 - pad,
          y: item.baseline - item.size * 1.0 - pad,
          w: x1 - x0 + pad * 2,
          h: item.size * 1.3 + pad * 2,
        });
      }
    }
  }
  return boxes;
}

// Most common colour on the edge of a box, so the patch matches coloured
// side bars and headers, not only white paper.
function backgroundColour(ctx: CanvasRenderingContext2D, box: Box): string {
  const x = Math.max(0, Math.floor(box.x - 2));
  const y = Math.max(0, Math.floor(box.y - 2));
  const w = Math.min(ctx.canvas.width - x, Math.ceil(box.w + 4));
  const h = Math.min(ctx.canvas.height - y, Math.ceil(box.h + 4));
  if (w <= 0 || h <= 0) return "#ffffff";
  const data = ctx.getImageData(x, y, w, h).data;
  // Group similar colours, then average the exact colours of the largest group.
  const groups = new Map<string, [number, number, number, number]>();
  const sample = (px: number, py: number) => {
    const i = (py * w + px) * 4;
    const key = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`;
    const g = groups.get(key) ?? [0, 0, 0, 0];
    g[0] += data[i];
    g[1] += data[i + 1];
    g[2] += data[i + 2];
    g[3]++;
    groups.set(key, g);
  };
  for (let px = 0; px < w; px++) {
    sample(px, 0);
    sample(px, h - 1);
  }
  for (let py = 0; py < h; py++) {
    sample(0, py);
    sample(w - 1, py);
  }
  let best: [number, number, number, number] = [255, 255, 255, 1];
  groups.forEach((g) => {
    if (g[3] > best[3]) best = g;
  });
  const [r, g, b] = best.slice(0, 3).map((v) => Math.round(v / best[3]));
  return `rgb(${r},${g},${b})`;
}

export interface PdfRedactionResult {
  blob: Blob;
  changes: number;
  /** False when the PDF has no text layer (a scan), so nothing could be found. */
  hasText: boolean;
}

export async function redactPdf(file: Blob): Promise<PdfRedactionResult> {
  const { pdfjs, pdf } = await openPdf(file);
  const { default: jsPDF } = await import("jspdf");
  let out: InstanceType<typeof jsPDF> | null = null;
  const scale = 2.5; // about 180 dpi: sharp when printed, files stay small
  let changes = 0;
  let textItems = 0;

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const { viewport, items } = await placedItems(pdfjs, page, scale);
    textItems += items.filter((i) => i.str.trim()).length;

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Your browser could not draw the PDF page.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const boxes = contactBoxes(visualLines(items));
    // Pick all colours first, so one patch does not change the next one's sample.
    const colours = boxes.map((b) => backgroundColour(ctx, b));
    boxes.forEach((b, i) => {
      ctx.fillStyle = colours[i];
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    changes += boxes.length;

    // Same page size as the original, in points
    const base = page.getViewport({ scale: 1 });
    const size: [number, number] = [base.width, base.height];
    const orientation = base.width > base.height ? "landscape" : "portrait";
    if (!out) out = new jsPDF({ unit: "pt", format: size, orientation, compress: true });
    else out.addPage(size, orientation);
    out.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, base.width, base.height);
    page.cleanup();
  }

  await pdf.destroy();
  if (!out) throw new Error("This PDF has no pages.");
  return {
    blob: out.output("blob"),
    changes,
    hasText: textItems > 0,
  };
}

export type TextBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string };

const BULLET = /^\s*([•●▪◦‣∙·■□➢►▶✓✔\-–*])\s+/;

/** The CV's text in reading order, split into headings, paragraphs and bullet points. */
export async function extractPdfBlocks(file: Blob): Promise<TextBlock[]> {
  const { pdfjs, pdf } = await openPdf(file);
  const lines: Line[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const { items } = await placedItems(pdfjs, page, 1);
    // Make baselines unique per page so a gap between pages starts a new paragraph.
    const pageLines = readingLines(items).map((l) => ({ ...l, baseline: l.baseline + n * 100000 }));
    lines.push(...pageLines);
    page.cleanup();
  }
  await pdf.destroy();
  return linesToBlocks(lines);
}

function linesToBlocks(lines: Line[]): TextBlock[] {
  const sizes = lines.map((l) => l.size).sort((a, b) => a - b);
  const body = sizes[Math.floor(sizes.length / 2)] ?? 10;

  // Right edge of the column a line is in, so we can tell a wrapped line (it
  // runs to the edge) from a short line that ends on purpose (a list item).
  const columnRight = (l: Line) =>
    Math.max(l.right, ...lines.filter((o) => o.left <= l.left + 2 && o.right > l.left).map((o) => o.right));

  const blocks: TextBlock[] = [];
  let prev: Line | null = null;
  for (const line of lines) {
    const text = line.text.replace(/\s{3,}/g, "   ").trim();
    if (!text) continue;
    const last = blocks[blocks.length - 1];
    const isHeading =
      text.length <= 60 &&
      (line.size > body * 1.15 ||
        (line.size >= body * 1.05 && /[A-Z]/.test(text) && text === text.toUpperCase() && !/^\d/.test(text)));
    const bullet = text.match(BULLET);
    const gap = prev ? line.baseline - prev.baseline : Infinity;
    const continues =
      !!last &&
      last.type !== "heading" &&
      !isHeading &&
      !bullet &&
      gap > 0 &&
      gap <= Math.max(line.size, body) * 1.6 &&
      !!prev && Math.abs(prev.size - line.size) < 0.5 &&
      prev.right >= columnRight(prev) * 0.85;

    if (isHeading) blocks.push({ type: "heading", text });
    else if (bullet) blocks.push({ type: "bullet", text: text.slice(bullet[0].length) });
    else if (continues) last.text += " " + text;
    else blocks.push({ type: "paragraph", text });
    prev = line;
  }
  return blocks;
}

/** The same blocks from plain text (TXT, RTF and DOC files). */
export function textToBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let lastBlank = true;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      lastBlank = true;
      continue;
    }
    const last = blocks[blocks.length - 1];
    const bullet = line.match(BULLET);
    const isHeading =
      line.length <= 60 && /[A-Z]/.test(line) && line === line.toUpperCase() && !/^\d/.test(line);
    if (isHeading) blocks.push({ type: "heading", text: line });
    else if (bullet) blocks.push({ type: "bullet", text: line.slice(bullet[0].length) });
    else if (!lastBlank && last && last.type === "paragraph") last.text += "\n" + line;
    else blocks.push({ type: "paragraph", text: line });
    lastBlank = false;
  }
  return blocks;
}
