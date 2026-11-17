import {
  AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageBreak, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, WidthType, Footer, PageNumber,
} from "docx";
import { BRAND } from "../brand";

// A5 (148 x 210 mm) so sheets fit exercise books and print as booklets (two per A4, folded).
const A5 = { width: 8391, height: 11906 };
const A4 = { width: 11906, height: 16838 };
const MARGIN = 567; // 1 cm

const INK = "2B2320";
const RUBRIC = "B3261E";
const FONT = "Arial";

export const p = (text: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean; after?: number } = {}) =>
  new Paragraph({
    spacing: { after: opts.after ?? 80 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 20, color: opts.color ?? INK, italics: opts.italics, font: FONT })],
  });

export const h = (text: string, level: 1 | 2 | 3 = 2) =>
  new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: level === 1 ? 30 : level === 2 ? 24 : 21, color: level === 1 ? RUBRIC : INK, font: FONT })],
  });

export const bullets = (items: string[]) =>
  items.map(
    (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, size: 20, font: FONT, color: INK })] }),
  );

/** Writing lines for students to respond on. */
export const lines = (n: number) =>
  Array.from({ length: n }, () =>
    new Paragraph({
      spacing: { before: 260 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "9A8F8A", space: 1 } },
      children: [new TextRun({ text: "", size: 20 })],
    }),
  );

export const boxed = (title: string, body: string) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "F7ECEA" },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: RUBRIC },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: RUBRIC },
              left: { style: BorderStyle.SINGLE, size: 8, color: RUBRIC },
              right: { style: BorderStyle.SINGLE, size: 8, color: RUBRIC },
            },
            children: [p(title, { bold: true, color: RUBRIC, size: 18, after: 40 }), p(body, { bold: true, size: 21 })],
          }),
        ],
      }),
    ],
  });

export function table(header: string[], rows: (string | number)[][], widths?: number[]) {
  const cell = (t: string | number, head = false, i = 0) =>
    new TableCell({
      width: widths ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
      shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "EFE9E6" } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [p(String(t), { bold: head, size: 18, after: 0 })],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: header.map((t, i) => cell(t, true, i)) }),
      ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, false, i)) })),
    ],
  });
}

export const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

type Child = Paragraph | Table;

export async function buildDoc(sections: Child[][], size: "A4" | "A5" = "A4", footerText = BRAND.name) {
  const page = size === "A5" ? A5 : A4;
  const doc = new Document({
    creator: BRAND.name,
    styles: { default: { document: { run: { font: FONT, size: 20, color: INK } } } },
    sections: sections.map((children) => ({
      properties: { page: { size: page, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: `${footerText}  ·  `, size: 14, color: "8A7F7A", font: FONT }),
                new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "8A7F7A", font: FONT }),
              ],
            }),
          ],
        }),
      },
      children,
    })),
  });
  return Packer.toBuffer(doc);
}
