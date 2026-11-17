// AI write-ups built from aggregated, pseudonymised data. Names never go to the AI:
// students are identified by their code and mapped back to names in the app.
import { z } from "zod/v4";
import { sql } from "./db";
import { aiMode, structured, textBlock } from "./ai/client";
import { classAnalysis, gradeBands, studentProfiles } from "./analytics";
import { QUESTIONS, levelNumber, type Paper } from "./aqa/spec";
import { skillLabel, skillTeach, SKILL_CODES } from "./aqa/taxonomy";

const SYSTEM = `You are an experienced head of English in a UK secondary school, expert in AQA GCSE English Language (8700). You turn marking data into precise, practical teaching decisions. Be specific and granular: name the exact skill, show what students write now and what they need to write instead, and say how to teach it. No vague advice ("practise more", "use more evidence"). Students are identified only by codes; never guess names. Write in plain British English.`;

async function save(scope: string, key: string, content: unknown) {
  await sql`INSERT INTO insights (scope, scope_key, content) VALUES (${scope}, ${key}, ${sql.json(content as never)})`;
}

export async function latestInsight<T>(scope: string, key: string): Promise<{ content: T; created_at: Date } | null> {
  const [row] = await sql<{ content: T; created_at: Date }[]>`
    SELECT content, created_at FROM insights WHERE scope = ${scope} AND scope_key = ${key} ORDER BY created_at DESC LIMIT 1`;
  return row ?? null;
}

// ---------------------------------------------------------------- class

export const ClassInsightSchema = z.object({
  headline: z.string().describe("One or two sentences: where this class is and the single biggest issue."),
  misconceptions: z.array(z.object({
    title: z.string(),
    evidence: z.string().describe("What students actually wrote or did, with brief examples from the notes."),
    students_affected: z.string().describe("How many / what proportion."),
    reteach: z.string().describe("A concrete reteach activity for one lesson, including a model or sentence stems."),
  })).describe("Three to five common misconceptions, most important first."),
  strengths: z.array(z.string()),
  next_lessons: z.array(z.string()).describe("A sequence of 3-4 lesson foci for the next fortnight."),
  watch_list: z.array(z.object({ code: z.string(), reason: z.string() })).describe("Students (by code) who need a teacher conversation, and why."),
});
export type ClassInsight = z.infer<typeof ClassInsightSchema>;

export async function buildClassInsight(assessmentId: string, classCode: string) {
  const { paper, classes } = await classAnalysis(assessmentId);
  const c = classes.find((x) => x.classCode === classCode);
  if (!c) return;
  const students = await sql<{ code: string; target_grade: number | null; grade_estimate: string | null; summary: { teacher_note?: string } | null }[]>`
    SELECT st.code, st.target_grade, s.grade_estimate, s.summary FROM scripts s JOIN students st ON st.id = s.student_id
    WHERE s.assessment_id = ${assessmentId} AND s.status = 'marked' AND COALESCE(st.class_code, 'No class') = ${classCode}`;
  let content: ClassInsight;
  if (aiMode() === "demo") {
    content = {
      headline: `Demo insight for ${classCode}.`,
      misconceptions: c.skills.slice(0, 3).map((s) => ({ title: s.label, evidence: s.examples.join(" | "), students_affected: `${s.students} students`, reteach: skillTeach(s.code) })),
      strengths: ["Demo strength."],
      next_lessons: ["Demo lesson."],
      watch_list: [],
    };
  } else {
    const data = `Paper: ${paper === "P1" ? "Paper 1" : "Paper 2"}. Class ${classCode}: ${c.students} students, average ${c.avgPct}%.
Question averages: ${c.questions.map((q) => `Q${q.q} ${q.title} ${q.avg}/${q.max} levels ${JSON.stringify(q.levels)}`).join("; ")}
Weaknesses (students affected, examples):
${c.skills.slice(0, 12).map((s) => `- ${s.code} ${s.label}: ${s.students} (${s.pct}%). ${s.examples.join(" | ")}`).join("\n")}
Students (code, target, grade estimate, teacher note):
${students.map((s) => `- ${s.code}: target ${s.target_grade ?? "?"}, grade ${s.grade_estimate ?? "?"}. ${s.summary?.teacher_note ?? ""}`).join("\n")}`;
    content = await structured({ schema: ClassInsightSchema, system: [SYSTEM], content: [textBlock(data)], effort: "high" });
  }
  await save("class", `${assessmentId}:${classCode}`, content);
}

// ---------------------------------------------------------------- year group

export const YearInsightSchema = z.object({
  overview: z.string(),
  bands: z.array(z.object({
    grade: z.number(),
    why_not_next: z.string().describe("Specifically why students at this grade are not reaching the next grade: which questions, which levels they fail to access, which skills."),
    focus: z.array(z.string()).describe("Two or three precise teaching foci."),
    intervention: z.string().describe("What a small-group intervention for this band should deliver."),
  })),
  priorities: z.array(z.string()).describe("Three department-wide priorities, most important first."),
});
export type YearInsight = z.infer<typeof YearInsightSchema>;

export async function buildYearInsight(yearGroup: number) {
  const { bands, profiles } = await gradeBands(yearGroup);
  let content: YearInsight;
  if (aiMode() === "demo" || !bands.length) {
    content = {
      overview: bands.length ? "Demo overview." : "No marked work yet for this year group.",
      bands: bands.map((b) => ({ grade: b.grade, why_not_next: b.separators.map((s) => s.label).join("; ") || "Not enough data.", focus: b.separators.map((s) => s.label), intervention: b.separators[0]?.teach ?? "" })),
      priorities: [],
    };
  } else {
    const data = `Year ${yearGroup}: ${profiles.length} students with marked work.
${bands
  .map(
    (b) => `GRADE ${b.grade} (${b.students} students)
  Most common weaknesses: ${b.topSkills.map((s) => `${s.code} ${s.pct}%`).join(", ")}
  Weaknesses much more common than in grade ${b.grade + 1}: ${b.separators.map((s) => `${s.code} ${s.pctHere}% vs ${s.pctAbove}%`).join(", ") || "none clear"}
  Average % by question: ${JSON.stringify(b.questionPct)}
  Same for grade ${b.grade + 1}: ${JSON.stringify(b.questionPctAbove)}`,
  )
  .join("\n")}
Skill codes: ${SKILL_CODES.map((c) => `${c}=${skillLabel(c)}`).join("; ")}`;
    content = await structured({ schema: YearInsightSchema, system: [SYSTEM], content: [textBlock(data)], effort: "high" });
  }
  await save("year", String(yearGroup), content);
}

// ---------------------------------------------------------------- intervention tutor pack

export const TutorPackSchema = z.object({
  overview: z.string().describe("Three or four sentences: who these students are as a group and what will make the biggest difference."),
  focus_areas: z.array(z.object({
    skill: z.string(),
    what_they_do_now: z.string().describe("What these students actually write, with short examples from the notes."),
    what_good_looks_like: z.string().describe("A short model sentence or paragraph showing the target standard."),
    how_to_teach: z.string().describe("A 15-20 minute teaching sequence."),
  })).describe("Two or three focus areas, most important first."),
  students: z.array(z.object({ code: z.string(), needs: z.string().describe("One or two sentences: this student's specific gap.") })),
  booklet_tasks: z.array(z.object({
    title: z.string(),
    instructions: z.string().describe("Student-facing instructions."),
    model: z.string().describe("A short model answer or worked example."),
  })).describe("Two or three short booklet tasks the tutor can print. Self-contained: include any short extract needed."),
});
export type TutorPack = z.infer<typeof TutorPackSchema>;

export async function buildTutorPack(groupId: string) {
  const members = await sql<{ student_id: string }[]>`SELECT student_id FROM intervention_members WHERE group_id = ${groupId}`;
  const profiles = await studentProfiles({ ids: members.map((m) => m.student_id) });
  const counts = new Map<string, number>();
  for (const p of profiles) for (const s of p.skills.slice(0, 5)) counts.set(s.code, (counts.get(s.code) ?? 0) + 1);
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  let pack: TutorPack;
  if (aiMode() === "demo") {
    pack = {
      overview: "Demo tutor pack.",
      focus_areas: common.slice(0, 3).map(([code]) => ({ skill: skillLabel(code), what_they_do_now: "Demo.", what_good_looks_like: "Demo.", how_to_teach: skillTeach(code) })),
      students: profiles.map((p) => ({ code: p.code, needs: p.skills.slice(0, 2).map((s) => skillLabel(s.code)).join("; ") })),
      booklet_tasks: [],
    };
  } else {
    const data = `Intervention group of ${profiles.length} students from several classes.
Shared weaknesses (number of students): ${common.map(([c, n]) => `${c} ${skillLabel(c)}: ${n}`).join("; ")}
Students:
${profiles
  .map(
    (p) => `- ${p.code}: target ${p.target_grade ?? "?"}, working grade ${p.workingGrade ?? "?"}. Question %: ${JSON.stringify(p.questionPct)}
   Latest feedback: ${p.latestDetails.slice(0, 8).map((d) => `${d.qid} ${d.code}: ${d.detail}`).join(" | ")}`,
  )
  .join("\n")}`;
    pack = await structured({ schema: TutorPackSchema, system: [SYSTEM], content: [textBlock(data)], effort: "high" });
  }
  await sql`UPDATE intervention_groups SET pack = ${sql.json(pack as never)}, pack_generated_at = now() WHERE id = ${groupId}`;
}

// ---------------------------------------------------------------- historical trends

export const HistoryInsightSchema = z.object({
  findings: z.array(z.object({
    finding: z.string().describe("A trend in the data, with numbers."),
    implication: z.string().describe("What skill this implies students struggle with, and what to change in teaching."),
  })),
  priorities: z.array(z.string()),
});
export type HistoryInsight = z.infer<typeof HistoryInsightSchema>;

export type HistoryStats = {
  years: number[];
  perYear: Record<number, { n: number; questionPct: Record<string, number>; reachL3: Record<string, number> }>;
  byGrade: Record<number, { n: number; questionPct: Record<string, number>; reachL3: Record<string, number> }>;
};

export async function historyStats(): Promise<HistoryStats> {
  const rows = await sql<{ cohort_year: number; grade: number | null; question_marks: Record<string, number> }[]>`
    SELECT cohort_year, grade, question_marks FROM historical_results`;
  const agg = (rs: (typeof rows)[number][]) => {
    const pct: Record<string, number[]> = {};
    const l3: Record<string, number[]> = {};
    for (const r of rs) {
      for (const [k, v] of Object.entries(r.question_marks ?? {})) {
        const spec = QUESTIONS[k];
        if (!spec || v == null) continue;
        (pct[k] ??= []).push((Number(v) / spec.marks) * 100);
        const lvl = levelNumber(spec.paper as Paper, spec.number, Number(v));
        if (lvl != null) (l3[k] ??= []).push(lvl >= 3 ? 1 : 0);
      }
    }
    const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    return {
      n: rs.length,
      questionPct: Object.fromEntries(Object.entries(pct).map(([k, v]) => [k, mean(v)])),
      reachL3: Object.fromEntries(Object.entries(l3).map(([k, v]) => [k, Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100)])),
    };
  };
  const years = [...new Set(rows.map((r) => r.cohort_year))].sort();
  const grades = [...new Set(rows.map((r) => r.grade).filter((g): g is number => g != null))].sort();
  return {
    years,
    perYear: Object.fromEntries(years.map((y) => [y, agg(rows.filter((r) => r.cohort_year === y))])),
    byGrade: Object.fromEntries(grades.map((g) => [g, agg(rows.filter((r) => r.grade === g))])),
  };
}

export async function buildHistoryInsight() {
  const stats = await historyStats();
  let content: HistoryInsight;
  if (aiMode() === "demo" || !stats.years.length) {
    content = { findings: [{ finding: stats.years.length ? "Demo finding." : "No historical data yet.", implication: "" }], priorities: [] };
  } else {
    const data = `Past AQA 8700 results, question level. "reachL3" = % of students reaching Level 3 or above on that question.
By cohort year: ${JSON.stringify(stats.perYear)}
By final grade (all years): ${JSON.stringify(stats.byGrade)}
Question ids: ${Object.values(QUESTIONS).map((q) => `${q.id} ${q.title} (${q.marks})`).join("; ")}
Find recurring trends, especially which levels students at grades 3, 4 and 5 fail to access, and what skill that implies.`;
    content = await structured({ schema: HistoryInsightSchema, system: [SYSTEM], content: [textBlock(data)], effort: "high" });
  }
  await save("history", "all", content);
}
