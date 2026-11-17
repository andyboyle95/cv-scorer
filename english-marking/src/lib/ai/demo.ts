// Placeholder marks for demo mode (no API key). Clearly labelled in the UI.
import type { MarkResult, Summary, Transcription } from "../pipeline";
import { QUESTIONS, qid, levelFor, type Paper } from "../aqa/spec";
import { codesForQuestion } from "../aqa/taxonomy";

function seeded(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
}

export function demoTranscription(paper: Paper, questions: number[]): Transcription {
  return {
    answers: questions.map((q) => ({
      question: q,
      text: `[Demo transcription for ${paper} Q${q}. Add an ANTHROPIC_API_KEY to read real scans.]`,
      confidence: "high" as const,
    })),
    shaded_statements: [],
    legibility: "good",
    typed: false,
    notes: "Demo mode: no real transcription was made.",
  };
}

export function demoMark(paper: Paper, q: number, answer: string): MarkResult {
  const rnd = seeded(answer + q + Math.random());
  const spec = QUESTIONS[qid(paper, q)];
  const codes = codesForQuestion(spec.id);
  const pick = () => codes[Math.floor(rnd() * codes.length)];
  let ao5: number | null = null;
  let ao6: number | null = null;
  let mark = Math.round(spec.marks * (0.25 + rnd() * 0.6));
  if (spec.isWriting) {
    ao5 = Math.round(24 * (0.3 + rnd() * 0.6));
    ao6 = Math.round(16 * (0.3 + rnd() * 0.6));
    mark = ao5 + ao6;
  }
  const w = [...new Set([pick(), pick()])];
  return {
    level: levelFor(paper, q, mark, ao5, ao6) ?? "Level 2",
    mark,
    ao5_mark: ao5,
    ao6_mark: ao6,
    descriptor_matched: "Demo mode: placeholder descriptor.",
    evidence: [{ quote: "demo", comment: "Demo mode: no real evidence." }],
    strengths: ["Demo strength: clear attempt at the question."],
    weaknesses: w.map((code) => ({ code, detail: "Demo weakness for testing the analysis screens." })),
    next_step: "Demo next step.",
    department_structure: "partly",
    confidence: rnd() < 0.15 ? "low" : "high",
    rationale: "Demo mode.",
  };
}

export function demoSummary(results: MarkResult[]): Summary {
  const codes = results.flatMap((r) => r.weaknesses.map((w) => w.code));
  return {
    www: ["Demo: you answered every question.", "Demo: your ideas are clear."],
    ebi: ["Demo: explain the effect of each quotation.", "Demo: check your full stops."],
    target: "Demo target: zoom in on single words and explain their connotations.",
    response_task: "Demo task: rewrite one paragraph using the target.",
    teacher_note: "Demo mode: these are not real marks.",
    priority_skills: [...new Set(codes)].slice(0, 3) as Summary["priority_skills"],
  };
}
