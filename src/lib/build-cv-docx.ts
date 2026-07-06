// Client-side DOCX builder for CV downloads. Mirrors the visual structure
// of CvTemplate: cover page (candidate summary + consultant details),
// then main CV pages (profile, skills, experience, quals, languages).
//
// Not pixel-perfect vs the PDF — DOCX and HTML use very different layout
// primitives — but professionally formatted, respects the Aaron Wallis
// navy/pink palette, and gives clients who need a Word doc a clean,
// editable version to work from.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  LevelFormat,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Tab,
  TabStopType,
  TextRun,
} from "docx";
import type { CandidateData, ExperienceEntry } from "@/components/cv-template";

const NAVY = "1a3668";
const PINK = "df2681";
const MUTED = "6b7089";
const LINE = "d9d3c4";

// ── Small helpers ───────────────────────────────────────────────

// Plain paragraph styled to look like a section heading. Avoiding
// HeadingLevel + border combined (docx 9.x is finicky about that combo
// and it was silently blowing up Packer.toBlob at runtime).
const heading = (text: string) =>
  new Paragraph({
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { color: NAVY, size: 8, style: BorderStyle.SINGLE, space: 4 },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        color: NAVY,
        size: 22,
        font: "Arial",
      }),
    ],
  });

const bullet = (text: string) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, font: "Arial", color: "1a1d2b" })],
  });

const bodyLine = (text: string, size = 20) =>
  new Paragraph({
    spacing: { after: 100, line: 300 },
    children: [new TextRun({ text, size, font: "Arial", color: "1a1d2b" })],
  });

const brandStrip = () =>
  new Paragraph({
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: " ", size: 8 })],
  });

const pinkAccent = () =>
  new Paragraph({
    shading: { type: ShadingType.SOLID, color: PINK, fill: PINK },
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: " ", size: 2 })],
  });

// ── Cover page ──────────────────────────────────────────────────

function coverPageParagraphs(data: CandidateData): Paragraph[] {
  const paras: Paragraph[] = [];

  paras.push(brandStrip());
  paras.push(pinkAccent());

  paras.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "AARON WALLIS", bold: true, size: 32, color: NAVY, font: "Arial" }),
      ],
    }),
  );
  paras.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "SALES RECRUITMENT",
          bold: true,
          size: 16,
          color: PINK,
          font: "Arial",
        }),
      ],
    }),
  );

  paras.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "CANDIDATE INTRODUCTION",
          bold: true,
          size: 20,
          color: MUTED,
          font: "Arial",
        }),
      ],
    }),
  );

  paras.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: data.candidateName || "Candidate",
          bold: true,
          size: 40,
          color: NAVY,
          font: "Arial",
        }),
      ],
    }),
  );

  if (data.roleAppliedFor) {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({ text: "for the role of ", italics: true, size: 22, color: MUTED, font: "Arial" }),
          new TextRun({ text: data.roleAppliedFor, bold: true, size: 24, color: NAVY, font: "Arial" }),
        ],
      }),
    );
  }

  // Executive summary
  if (data.executiveSummary?.trim()) {
    paras.push(heading("Executive Summary"));
    for (const para of data.executiveSummary.split(/\n\n+/)) {
      paras.push(bodyLine(para.trim(), 20));
    }
  }

  // Key facts table (rendered as tab-aligned rows for portability)
  paras.push(heading("Key Details"));
  const kv: [string, string | undefined][] = [
    ["Salary expectations", data.salaryExpectations],
    ["Notice period", data.noticePeriod],
    ["Location", data.location],
    ["LinkedIn", data.linkedIn],
  ];
  for (const [k, v] of kv) {
    if (!v) continue;
    paras.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.LEFT, position: 3000 }],
        spacing: { after: 60 },
        children: [
          new TextRun({ text: k, size: 20, color: MUTED, font: "Arial" }),
          new TextRun({ children: [new Tab()] }),
          new TextRun({ text: v, size: 20, color: "1a1d2b", font: "Arial", bold: true }),
        ],
      }),
    );
  }

  // Consultant sign-off
  paras.push(heading("Submitted By"));
  paras.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: data.consultant || "", size: 22, bold: true, color: NAVY, font: "Arial" }),
      ],
    }),
  );
  if (data.consultantEmail) {
    paras.push(
      new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun({ text: data.consultantEmail, size: 20, color: "1a1d2b", font: "Arial" })],
      }),
    );
  }
  if (data.consultantTel) {
    paras.push(
      new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun({ text: data.consultantTel, size: 20, color: "1a1d2b", font: "Arial" })],
      }),
    );
  }
  if (data.dateSubmitted) {
    paras.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: `Submitted ${data.dateSubmitted}`, italics: true, size: 18, color: MUTED, font: "Arial" }),
        ],
      }),
    );
  }

  return paras;
}

// ── Main CV page ────────────────────────────────────────────────

function experienceParagraphs(entries: ExperienceEntry[]): Paragraph[] {
  const paras: Paragraph[] = [];
  for (const exp of entries) {
    // Header line: Company — Role (dates)
    paras.push(
      new Paragraph({
        spacing: { before: 200, after: 40 },
        children: [
          new TextRun({ text: exp.company || "", bold: true, size: 22, color: NAVY, font: "Arial" }),
          exp.role
            ? new TextRun({ text: `  —  ${exp.role}`, bold: true, size: 22, color: "1a1d2b", font: "Arial" })
            : new TextRun(""),
        ],
      }),
    );
    const dates = [exp.dateFrom, exp.dateTo].filter(Boolean).join(" – ");
    if (dates) {
      paras.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: dates, italics: true, size: 18, color: MUTED, font: "Arial" }),
          ],
        }),
      );
    }
    if (exp.description) {
      paras.push(bodyLine(exp.description, 20));
    }
    for (const b of (exp.bullets ?? []).filter(Boolean)) {
      paras.push(bullet(b));
    }
  }
  return paras;
}

function mainCvParagraphs(data: CandidateData, includeCoverPageBreak: boolean): Paragraph[] {
  const paras: Paragraph[] = [];

  if (includeCoverPageBreak) {
    paras.push(new Paragraph({ children: [new PageBreak()] }));
  }
  paras.push(brandStrip());
  paras.push(pinkAccent());

  paras.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({ text: data.candidateName || "", bold: true, size: 32, color: NAVY, font: "Arial" }),
      ],
    }),
  );

  if (data.profile?.trim()) {
    paras.push(heading("Profile"));
    for (const para of data.profile.split(/\n\n+/)) {
      paras.push(bodyLine(para.trim(), 20));
    }
  }

  const skills = data.skills.filter(Boolean);
  if (skills.length) {
    paras.push(heading("Skills"));
    paras.push(bodyLine(skills.join(" · "), 20));
  }

  // Experience — grouped by pageBreakAfter
  const groups: ExperienceEntry[][] = [];
  let cur: ExperienceEntry[] = [];
  for (const e of data.experience.filter((e) => e.company || e.role)) {
    cur.push(e);
    if (e.pageBreakAfter) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);

  if (groups.length) {
    paras.push(heading("Experience"));
    for (let i = 0; i < groups.length; i++) {
      paras.push(...experienceParagraphs(groups[i]));
      if (i < groups.length - 1) {
        paras.push(new Paragraph({ children: [new PageBreak()] }));
        paras.push(brandStrip());
        paras.push(pinkAccent());
        paras.push(heading("Experience (continued)"));
      }
    }
  }

  const quals = data.qualifications.filter(Boolean);
  if (quals.length) {
    paras.push(heading("Qualifications"));
    for (const q of quals) paras.push(bullet(q));
  }

  const langs = data.languages.filter(Boolean);
  if (langs.length) {
    paras.push(heading("Languages"));
    paras.push(bodyLine(langs.join(" · "), 20));
  }

  return paras;
}

// ── Public entry ────────────────────────────────────────────────

export async function buildCvDocx(data: CandidateData): Promise<Blob> {
  const doc = new Document({
    creator: "Aaron Wallis Recruitment Apps",
    title: data.candidateName || "CV",
    styles: {
      default: {
        document: { run: { font: "Arial" } },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 360, hanging: 260 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Aaron Wallis", bold: true, size: 14, color: MUTED, font: "Arial" }),
                  new TextRun({ text: "  |  ", size: 14, color: LINE, font: "Arial" }),
                  new TextRun({ text: "Sales Recruitment", size: 14, color: PINK, font: "Arial" }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text:
                      "Aaron Wallis and Aaron Wallis Sales Recruitment are trading names of Aaron Wallis Recruitment and Training Limited (No. 6356563). Candidate information is confidential.",
                    size: 12,
                    color: MUTED,
                    font: "Arial",
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverPageParagraphs(data),
          ...mainCvParagraphs(data, true),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
