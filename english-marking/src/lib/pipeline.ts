import { z } from "zod/v4";
import { sql } from "./db";
import { aiMode, structured, imageBlock, pdfBlock, textBlock, type Block } from "./ai/client";
import { QUESTIONS, qid, levelFor, type Paper } from "./aqa/spec";
import { SKILL_CODES, TAXONOMY, codesForQuestion } from "./aqa/taxonomy";
import { getSettings } from "./settings";
import { gradeFor } from "./grades";
import { referenceNotesFor } from "./library";
import { demoTranscription, demoMark, demoSummary } from "./ai/demo";

// ---------------------------------------------------------------- schemas

export const TranscriptionSchema = z.object({
  answers: z.array(
    z.object({
      question: z.number().describe("Question number 1-5"),
      text: z.string().describe("Verbatim transcription. Keep every spelling, grammar and punctuation error exactly as written."),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
  shaded_statements: z.array(z.string()).describe("Paper 2 Q1 only: letters of the statements the student shaded, e.g. ['A','D','E','G']. Empty otherwise."),
  legibility: z.enum(["good", "fair", "poor"]),
  typed: z.boolean().describe("True if the work is typed rather than handwritten."),
  notes: z.string().describe("Anything a teacher should know: missing pages, crossed-out sections, illegible passages, answers to questions not in this assessment."),
});
export type Transcription = z.infer<typeof TranscriptionSchema>;

const CODES = SKILL_CODES as [string, ...string[]];

export const MarkSchema = z.object({
  level: z.string().describe("The level the answer best fits, e.g. 'Level 3' or 'Upper Level 2'. For Q1 write 'n/a'."),
  mark: z.number().describe("Total mark for this question."),
  ao5_mark: z.number().nullable().describe("Question 5 only: content and organisation mark out of 24. Null otherwise."),
  ao6_mark: z.number().nullable().describe("Question 5 only: technical accuracy mark out of 16. Null otherwise."),
  descriptor_matched: z.string().describe("The phrases from the level descriptor that this answer meets, and the next level's phrases it does not yet meet."),
  evidence: z.array(z.object({
    quote: z.string().describe("Exact words copied from the student's answer."),
    comment: z.string().describe("Why this quote supports the mark."),
  })),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.object({
    code: z.enum(CODES),
    detail: z.string().describe("Specific to this answer, with a short quote or reference."),
  })),
  next_step: z.string().describe("One precise action that would move this answer to the next level."),
  department_structure: z.enum(["followed", "partly", "not_followed", "not_applicable"]),
  confidence: z.enum(["high", "medium", "low"]).describe("Low if the transcription is unclear, the answer sits on a level boundary, or the evidence is thin."),
  rationale: z.string().describe("Two to four sentences: why this level, why this mark within the level."),
});
export type MarkResult = z.infer<typeof MarkSchema>;

export const SummarySchema = z.object({
  www: z.array(z.string()).describe("Two 'What went well' points, written to the student."),
  ebi: z.array(z.string()).describe("Two 'Even better if' points, written to the student."),
  target: z.string().describe("The single most important target, written to the student."),
  response_task: z.string().describe("A short task (10-15 minutes) the student completes in their book to act on the target. It must be doable without the source text unless it quotes the lines needed."),
  teacher_note: z.string().describe("Two sentences for the teacher: the main barrier for this student and what to do next."),
  priority_skills: z.array(z.enum(CODES)).describe("Up to three skill codes this student most needs to work on, most important first."),
});
export type Summary = z.infer<typeof SummarySchema>;

// ---------------------------------------------------------------- prompts

const EXAMINER_RULES = `You are a senior AQA examiner for GCSE English Language (8700). You mark a UK secondary school's mock and practice papers. Marking accuracy is the top priority: teachers act on your marks.

How to mark:
1. Read the whole answer first. Judge only what the student wrote. Handwriting and presentation do not affect the mark.
2. Use the levels of response descriptors. Find the level that best fits the answer overall ("best fit"), not the highest level touched by one sentence.
3. Place the mark inside the level: at the top if the level is met securely and some features of the next level appear; at the bottom if the level is only just met.
4. Compare with the moderated exemplars when given. They show this school's agreed standard. If your mark differs from a similar exemplar by more than 2 marks, re-check.
5. Do not reward length for its own sake. Do not reward correct use of terminology unless it supports the analysis.
6. Spelling, punctuation and grammar affect the mark only in Question 5 (AO6).
7. Mark positively: credit valid ideas that the mark scheme does not list.
8. Quotes in "evidence" must be copied exactly from the student's answer.
9. Weakness codes must come from the skills list. Use X_DEPT_STRUCTURE only if a department structure is given and the student clearly does not follow it.
10. Write feedback for teachers: specific, short, and tied to the student's own words. No praise without a reason.

Skills list (codes for weaknesses):
${SKILL_CODES.map((c) => `- ${c}: ${TAXONOMY[c].label}`).join("\n")}`;

function questionBrief(paper: Paper, q: number, extra: string) {
  const spec = QUESTIONS[qid(paper, q)];
  return `QUESTION: ${spec.title} (${spec.marks} marks, ${spec.aos})
Focus: ${spec.focus}

LEVEL DESCRIPTORS
${spec.descriptors}

MARKING GUIDANCE
${spec.guidance}

COMMON WEAKNESSES REPORTED BY EXAMINERS
${spec.commonIssues}

Relevant skill codes for this question: ${codesForQuestion(qid(paper, q)).join(", ")}
${extra ? `\nSCHOOL REFERENCE NOTES (department structures, examiner reports)\n${extra}` : ""}`;
}

// ---------------------------------------------------------------- data loading

type AssessmentRow = {
  id: string;
  title: string;
  paper: Paper;
  questions: number[];
  question_texts: Record<string, string>;
  answer_key: string[] | null;
  source_text: string | null;
  source_pdf: Buffer | null;
  mark_scheme_pdf: Buffer | null;
  is_calibration: boolean;
};

async function loadExemplars(paper: Paper, q: number, assessmentId: string) {
  const rows = await sql<{ mark: string; max_mark: number; ao_marks: Record<string, number> | null; commentary: string | null; answer_text: string; assessment_id: string | null }[]>`
    SELECT mark, max_mark, ao_marks, commentary, answer_text, assessment_id FROM exemplars
    WHERE paper = ${paper} AND question = ${q} AND active AND status = 'ready' AND answer_text IS NOT NULL
    ORDER BY (assessment_id = ${assessmentId}) DESC NULLS LAST, mark, created_at`;
  if (rows.length <= 5) return rows;
  // Spread across the mark range so the model sees the whole scale.
  const sorted = [...rows].sort((a, b) => Number(a.mark) - Number(b.mark));
  const pick = [0, 0.25, 0.5, 0.75, 1].map((f) => sorted[Math.round(f * (sorted.length - 1))]);
  return [...new Set(pick)];
}

function exemplarText(rows: Awaited<ReturnType<typeof loadExemplars>>) {
  if (!rows.length) return "";
  return rows
    .map((r, i) => {
      const ao = r.ao_marks ? ` (${Object.entries(r.ao_marks).map(([k, v]) => `${k} ${v}`).join(", ")})` : "";
      return `<exemplar n="${i + 1}" mark="${Number(r.mark)}/${r.max_mark}"${ao}>
${r.answer_text}
${r.commentary ? `<moderator_comment>${r.commentary}</moderator_comment>` : ""}
</exemplar>`;
    })
    .join("\n\n");
}

function sourceBlocks(a: AssessmentRow, q: number): Block[] {
  const spec = QUESTIONS[qid(a.paper, q)];
  const blocks: Block[] = [];
  if (spec.needsSource) {
    if (a.source_pdf) blocks.push(pdfBlock(a.source_pdf, "Source insert", true));
    else if (a.source_text) blocks.push(textBlock(`<source_insert>\n${a.source_text}\n</source_insert>`, true));
  }
  if (a.mark_scheme_pdf) blocks.push(pdfBlock(a.mark_scheme_pdf, "Mark scheme for this paper (use its indicative content)", true));
  return blocks;
}

// ---------------------------------------------------------------- steps

export async function transcribe(a: AssessmentRow, pages: Buffer[]): Promise<Transcription> {
  const qList = a.questions
    .map((q) => `Q${q}${a.question_texts[q] ? `: ${a.question_texts[q]}` : ` (${QUESTIONS[qid(a.paper, q)].title})`}`)
    .join("\n");
  return structured({
    schema: TranscriptionSchema,
    effort: "medium",
    system: [
      `You transcribe GCSE English exam answers from scans for marking. Accuracy matters more than speed.
Rules:
- Copy the student's words exactly. Never correct spelling, grammar, punctuation or capital letters: these errors are marked.
- Keep paragraph breaks. Mark a new paragraph with a blank line.
- Write [illegible] for words you cannot read and [crossed out] where a passage is struck through (do not transcribe it).
- Students may answer questions out of order, continue an answer on a later page, or forget the question number. Use the content to decide which question each part answers.
- Ignore printed question text, page headers and examiner boxes. Transcribe only what the student wrote or typed.
- Do not transcribe names. If a student name appears, leave it out.`,
    ],
    content: [
      ...pages.map((p) => imageBlock(p)),
      textBlock(`This is one student's answer pages for "${a.title}" (AQA English Language ${a.paper === "P1" ? "Paper 1" : "Paper 2"}).
Questions in this assessment:
${qList}

Transcribe every answer.`),
    ],
  });
}

async function markOnce(a: AssessmentRow, q: number, answer: string, extraNotes: string, effort: "low" | "medium" | "high" | "xhigh" | "max") {
  const spec = QUESTIONS[qid(a.paper, q)];
  const exemplars = exemplarText(await loadExemplars(a.paper, q, a.id));
  const content: Block[] = [...sourceBlocks(a, q)];
  if (exemplars) content.push(textBlock(`<moderated_exemplars question="${q}">\n${exemplars}\n</moderated_exemplars>`, true));
  content.push(
    textBlock(`Question ${q}${a.question_texts[q] ? `: ${a.question_texts[q]}` : ""}
${spec.isWriting ? "Mark AO5 (out of 24) and AO6 (out of 16) separately. 'mark' is their sum." : ""}

<student_answer>
${answer}
</student_answer>

Mark this answer out of ${spec.marks}.`),
  );
  const out = await structured({
    schema: MarkSchema,
    effort,
    system: [EXAMINER_RULES, questionBrief(a.paper, q, extraNotes)],
    content,
  });
  // Keep marks inside the legal range.
  out.mark = clamp(out.mark, 0, spec.marks);
  if (spec.isWriting) {
    out.ao5_mark = clamp(out.ao5_mark ?? 0, 0, 24);
    out.ao6_mark = clamp(out.ao6_mark ?? 0, 0, 16);
    out.mark = out.ao5_mark + out.ao6_mark;
  }
  return out;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** Marks a question with one or more independent passes and settles on the median. */
async function markQuestion(a: AssessmentRow, q: number, answer: string) {
  const settings = await getSettings();
  const spec = QUESTIONS[qid(a.paper, q)];
  const notes = await referenceNotesFor(a.paper, q);
  const passes: MarkResult[] = [];
  const effort = settings.effort;

  passes.push(await markOnce(a, q, answer, notes, effort));
  if (spec.marks >= settings.doubleMarkFrom) {
    passes.push(await markOnce(a, q, answer, notes, effort));
    if (Math.abs(passes[0].mark - passes[1].mark) > settings.disagreementTolerance) {
      passes.push(await markOnce(a, q, answer, notes, effort));
    }
  }
  const marks = passes.map((p) => p.mark);
  const final = median(marks);
  // Use the feedback from the pass closest to the final mark.
  const chosen = passes.reduce((best, p) => (Math.abs(p.mark - final) < Math.abs(best.mark - final) ? p : best));
  const spread = Math.max(...marks) - Math.min(...marks);
  const result: MarkResult = { ...chosen, mark: final };
  if (spec.isWriting) {
    result.ao5_mark = median(passes.map((p) => p.ao5_mark ?? 0));
    result.ao6_mark = median(passes.map((p) => p.ao6_mark ?? 0));
    result.mark = result.ao5_mark + result.ao6_mark;
  }
  if (spread > settings.disagreementTolerance) result.confidence = "low";
  result.level = levelFor(a.paper, q, result.mark, result.ao5_mark, result.ao6_mark) ?? result.level;
  return { result, raw: marks };
}

/** Paper 2 Q1 can be marked from the answer key without the AI. Over-shading: only the first four (A-H order) count. */
function markP2Q1(shaded: string[], key: string[]): MarkResult {
  const all = [...new Set(shaded.map((x) => x.trim().toUpperCase()))].sort();
  const counted = all.slice(0, 4);
  const k = key.map((x) => x.trim().toUpperCase());
  const right = counted.filter((x) => k.includes(x));
  const wrong = counted.filter((x) => !k.includes(x));
  const mark = right.length;
  const over = all.length > 4;
  return {
    level: "n/a",
    mark,
    ao5_mark: null,
    ao6_mark: null,
    descriptor_matched: `Shaded ${all.join(", ") || "nothing"}${over ? " (more than four: only the first four counted)" : ""}. Correct: ${k.join(", ")}.`,
    evidence: [],
    strengths: right.length ? [`Identified ${right.length} true statement${right.length === 1 ? "" : "s"} correctly.`] : [],
    weaknesses:
      mark < 4
        ? [{ code: "R_RETRIEVAL_ACCURACY", detail: `${over ? "Shaded more than four statements. " : ""}Incorrect: ${wrong.join(", ") || "none"}.` }]
        : [],
    next_step: mark < 4 ? "Re-read the lines, check each statement in order, and shade exactly four." : "Keep checking each statement against the lines.",
    department_structure: "not_applicable",
    confidence: "high",
    rationale: `${mark} of 4 correct${over ? "; over-shaded" : ""}.`,
  };
}

function emptyAnswer(q: number): MarkResult {
  return {
    level: "Not attempted",
    mark: 0,
    ao5_mark: null,
    ao6_mark: null,
    descriptor_matched: "No answer found on the scanned pages.",
    evidence: [],
    strengths: [],
    weaknesses: [{ code: "X_INCOMPLETE", detail: `No answer to Question ${q} was found on the scan.` }],
    next_step: `Attempt Question ${q}: plan timings so every question gets an answer.`,
    department_structure: "not_applicable",
    confidence: "medium",
    rationale: "Nothing to mark. Check the scan if the student did answer.",
  };
}

async function summarise(a: AssessmentRow, results: { q: number; r: MarkResult }[]): Promise<Summary> {
  const lines = results
    .map(({ q, r }) => {
      const spec = QUESTIONS[qid(a.paper, q)];
      return `Q${q} (${spec.title}): ${r.mark}/${spec.marks}, ${r.level}
  Strengths: ${r.strengths.join("; ") || "none"}
  Weaknesses: ${r.weaknesses.map((w) => `${w.code} - ${w.detail}`).join("; ") || "none"}
  Next step: ${r.next_step}`;
    })
    .join("\n");
  return structured({
    schema: SummarySchema,
    effort: "medium",
    maxTokens: 6000,
    system: [
      `You write feedback for a GCSE English Language student (age 14-16) after a marked assessment. The student sticks it in their book and responds to it.
Write in plain, encouraging, direct English. Short sentences. Name the skill and show what good looks like. Never mention AI or marks for individual questions unless useful. Do not invent anything not in the marking notes.`,
    ],
    content: [textBlock(`Assessment: ${a.title}\n\nMarking notes per question:\n${lines}`)],
  });
}

// ---------------------------------------------------------------- orchestration

export async function processScript(scriptId: string) {
  const [script] = await sql<{ id: string; assessment_id: string; student_id: string | null }[]>`
    SELECT id, assessment_id, student_id FROM scripts WHERE id = ${scriptId}`;
  if (!script) return;
  const [a] = await sql<AssessmentRow[]>`SELECT * FROM assessments WHERE id = ${script.assessment_id}`;
  const pages = await sql<{ image: Buffer }[]>`SELECT image FROM script_pages WHERE script_id = ${scriptId} ORDER BY page_no`;
  const mode = aiMode();
  const settings = await getSettings();

  await sql`UPDATE scripts SET status = 'processing', error = NULL, updated_at = now() WHERE id = ${scriptId}`;

  const transcription = mode === "demo" ? demoTranscription(a.paper, a.questions) : await transcribe(a, pages.map((p) => p.image));
  await sql`UPDATE scripts SET transcription = ${sql.json(transcription as never)} WHERE id = ${scriptId}`;

  const results: { q: number; r: MarkResult; raw: number[] }[] = [];
  await Promise.all(
    a.questions.map(async (q) => {
      const spec = QUESTIONS[qid(a.paper, q)];
      const answer = transcription.answers.filter((x) => x.question === q).map((x) => x.text).join("\n\n").trim();
      if (spec.id === "P2Q1" && a.answer_key?.length && transcription.shaded_statements.length) {
        const r = markP2Q1(transcription.shaded_statements, a.answer_key);
        results.push({ q, r, raw: [r.mark] });
        return;
      }
      if (!answer && !(spec.id === "P2Q1" && transcription.shaded_statements.length)) {
        results.push({ q, r: emptyAnswer(q), raw: [0] });
        return;
      }
      if (mode === "demo") {
        const r = demoMark(a.paper, q, answer);
        results.push({ q, r, raw: [r.mark] });
        return;
      }
      const text = spec.id === "P2Q1" ? `Shaded statements: ${transcription.shaded_statements.join(", ")}\n${answer}` : answer;
      const { result, raw } = await markQuestion(a, q, text);
      results.push({ q, r: result, raw });
    }),
  );
  results.sort((x, y) => x.q - y.q);

  const summary = mode === "demo" ? demoSummary(results.map((x) => x.r)) : await summarise(a, results);

  const total = results.reduce((s, x) => s + x.r.mark, 0);
  const max = a.questions.reduce((s, q) => s + QUESTIONS[qid(a.paper, q)].marks, 0);
  const grade = gradeFor(total, max, settings.boundaries);
  const lowConfidence = results.some((x) => x.r.confidence === "low") || transcription.legibility === "poor";
  const sampled = a.is_calibration || Math.random() < settings.moderationRate;

  await sql.begin(async (tx) => {
    await tx`DELETE FROM question_results WHERE script_id = ${scriptId}`;
    for (const { q, r, raw } of results) {
      const spec = QUESTIONS[qid(a.paper, q)];
      await tx`INSERT INTO question_results
        (script_id, question, max_mark, ai_mark, ai_marks_raw, level, ao_marks, descriptor, evidence, strengths, weaknesses, next_step, confidence, rationale)
        VALUES (${scriptId}, ${q}, ${spec.marks}, ${r.mark}, ${raw}, ${r.level},
          ${spec.isWriting ? tx.json({ AO5: r.ao5_mark, AO6: r.ao6_mark } as never) : null},
          ${r.descriptor_matched}, ${tx.json(r.evidence as never)}, ${tx.json(r.strengths as never)},
          ${tx.json(r.weaknesses as never)}, ${r.next_step}, ${r.confidence}, ${r.rationale})`;
    }
    await tx`UPDATE scripts SET status = 'marked', summary = ${tx.json(summary as never)},
      total_mark = ${total}, max_mark = ${max}, grade_estimate = ${grade},
      needs_review = ${lowConfidence}, moderation_selected = ${sampled || lowConfidence},
      ai_mode = ${mode}, updated_at = now()
      WHERE id = ${scriptId}`;
  });
}
