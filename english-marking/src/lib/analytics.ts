import { sql } from "./db";
import { QUESTIONS, qid, levelNumber, type Paper } from "./aqa/spec";
import { TAXONOMY, skillLabel, type SkillCode } from "./aqa/taxonomy";
import { getSettings } from "./settings";

export type Weakness = { code: string; detail: string };

export type StudentRow = {
  id: string;
  code: string;
  first_name: string | null;
  last_name: string | null;
  year_group: number;
  class_code: string | null;
  teacher: string | null;
  target_grade: number | null;
  pp: boolean;
  send: boolean;
  eal: boolean;
};

export type StudentProfile = StudentRow & {
  name: string;
  workingGrade: number | null;     // fine grade, e.g. 3.6
  gap: number | null;              // target - working (positive = below target)
  assessments: number;
  skills: { code: string; count: number; weight: number }[];
  questionPct: Record<string, number>; // "P1Q4" -> % of marks (latest)
  latestDetails: { code: string; detail: string; qid: string; title: string }[];
};

export const studentName = (s: { first_name: string | null; last_name: string | null; code: string }) =>
  [s.first_name, s.last_name].filter(Boolean).join(" ") || s.code;

type ResultRow = {
  student_id: string;
  script_id: string;
  assessment_id: string;
  title: string;
  paper: Paper;
  sat_on: string | null;
  created_at: Date;
  grade_estimate: string | null;
  question: number;
  max_mark: number;
  mark: string;
  weaknesses: Weakness[];
};

/** All marked question results for a set of students (teacher marks override AI marks). */
async function resultsFor(studentIds: string[]) {
  if (!studentIds.length) return [] as ResultRow[];
  return sql<ResultRow[]>`
    SELECT s.student_id, s.id AS script_id, a.id AS assessment_id, a.title, a.paper, a.sat_on, s.created_at,
           s.grade_estimate, qr.question, qr.max_mark,
           COALESCE(qr.teacher_mark, qr.ai_mark) AS mark, qr.weaknesses
    FROM scripts s
    JOIN assessments a ON a.id = s.assessment_id
    JOIN question_results qr ON qr.script_id = s.id
    WHERE s.status = 'marked' AND NOT a.is_calibration AND s.student_id = ANY(${studentIds})
    ORDER BY COALESCE(a.sat_on, s.created_at::date) DESC, s.created_at DESC`;
}

export async function studentProfiles(filter: { yearGroup?: number; classCode?: string; ids?: string[] } = {}): Promise<StudentProfile[]> {
  const students = await sql<StudentRow[]>`
    SELECT id, code, first_name, last_name, year_group, class_code, teacher, target_grade, pp, send, eal
    FROM students
    WHERE status = 'active'
      ${filter.yearGroup ? sql`AND year_group = ${filter.yearGroup}` : sql``}
      ${filter.classCode ? sql`AND class_code = ${filter.classCode}` : sql``}
      ${filter.ids ? sql`AND id = ANY(${filter.ids})` : sql``}
    ORDER BY class_code, last_name, first_name`;
  const rows = await resultsFor(students.map((s) => s.id));
  const byStudent = new Map<string, ResultRow[]>();
  for (const r of rows) (byStudent.get(r.student_id) ?? byStudent.set(r.student_id, []).get(r.student_id)!).push(r);

  return students.map((s) => {
    const rs = byStudent.get(s.id) ?? [];
    // Scripts in recency order.
    const scripts: string[] = [];
    for (const r of rs) if (!scripts.includes(r.script_id)) scripts.push(r.script_id);
    // Working grade: mean of the latest script for each paper.
    const latestByPaper = new Map<Paper, ResultRow>();
    for (const r of rs) if (!latestByPaper.has(r.paper)) latestByPaper.set(r.paper, r);
    const grades = [...latestByPaper.values()].map((r) => Number(r.grade_estimate)).filter((g) => !Number.isNaN(g));
    const workingGrade = grades.length ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10 : null;
    // Skills: weight recent scripts more (1, 0.7, 0.5, 0.35 ...).
    const skillMap = new Map<string, { count: number; weight: number }>();
    const latestDetails: StudentProfile["latestDetails"] = [];
    rs.forEach((r) => {
      const idx = scripts.indexOf(r.script_id);
      if (idx > 3) return;
      const w = Math.pow(0.7, idx);
      for (const wk of r.weaknesses ?? []) {
        const e = skillMap.get(wk.code) ?? { count: 0, weight: 0 };
        e.count += 1;
        e.weight += w;
        skillMap.set(wk.code, e);
        if (idx === 0) latestDetails.push({ code: wk.code, detail: wk.detail, qid: qid(r.paper, r.question), title: r.title });
      }
    });
    const questionPct: Record<string, number> = {};
    for (const r of rs) {
      const k = qid(r.paper, r.question);
      if (!(k in questionPct)) questionPct[k] = Math.round((Number(r.mark) / r.max_mark) * 100);
    }
    return {
      ...s,
      name: studentName(s),
      workingGrade,
      gap: workingGrade != null && s.target_grade != null ? Math.round((s.target_grade - workingGrade) * 10) / 10 : null,
      assessments: scripts.length,
      skills: [...skillMap.entries()].map(([code, v]) => ({ code, ...v })).sort((a, b) => b.weight - a.weight),
      questionPct,
      latestDetails,
    };
  });
}

// ---------------------------------------------------------------- class view for one assessment

export type ClassAnalysis = {
  classCode: string;
  students: number;
  marked: number;
  avgPct: number;
  questions: { q: number; title: string; max: number; avg: number; levels: Record<string, number> }[];
  skills: { code: string; label: string; students: number; pct: number; examples: string[] }[];
  belowTarget: { id: string; name: string; target: number | null; grade: number | null; gap: number | null }[];
};

export async function classAnalysis(assessmentId: string): Promise<{ paper: Paper; classes: ClassAnalysis[]; year: ClassAnalysis | null }> {
  const [a] = await sql<{ paper: Paper; questions: number[] }[]>`SELECT paper, questions FROM assessments WHERE id = ${assessmentId}`;
  if (!a) throw new Error("Assessment not found");
  const rows = await sql<{
    student_id: string; first_name: string | null; last_name: string | null; code: string; class_code: string | null;
    target_grade: number | null; grade_estimate: string | null; total_mark: string | null; max_mark: string | null;
    question: number; qmax: number; mark: string; weaknesses: Weakness[];
  }[]>`
    SELECT st.id AS student_id, st.first_name, st.last_name, st.code, st.class_code, st.target_grade,
           s.grade_estimate, s.total_mark, s.max_mark, qr.question, qr.max_mark AS qmax,
           COALESCE(qr.teacher_mark, qr.ai_mark) AS mark, qr.weaknesses
    FROM scripts s
    JOIN students st ON st.id = s.student_id
    JOIN question_results qr ON qr.script_id = s.id
    WHERE s.assessment_id = ${assessmentId} AND s.status = 'marked'`;

  const groups = new Map<string, (typeof rows)[number][]>();
  for (const r of rows) {
    const k = r.class_code ?? "No class";
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  type Row = (typeof rows)[number];
  const build = (classCode: string, rs: Row[]): ClassAnalysis => {
    const studentIds = [...new Set(rs.map((r) => r.student_id))];
    const perStudent = new Map(rs.map((r) => [r.student_id, r]));
    const pctList = [...perStudent.values()].map((r) => (Number(r.total_mark) / Number(r.max_mark)) * 100);
    const questions = a.questions.map((q) => {
      const qr = rs.filter((r) => r.question === q);
      const levels: Record<string, number> = {};
      for (const r of qr) {
        const l = levelNumber(a.paper, q, Number(r.mark));
        const key = l == null ? `${Number(r.mark)}/${r.qmax}` : `L${l}`;
        levels[key] = (levels[key] ?? 0) + 1;
      }
      const spec = QUESTIONS[qid(a.paper, q)];
      return {
        q,
        title: spec.title,
        max: spec.marks,
        avg: qr.length ? Math.round((qr.reduce((s, r) => s + Number(r.mark), 0) / qr.length) * 10) / 10 : 0,
        levels,
      };
    });
    const skill = new Map<string, { students: Set<string>; examples: string[] }>();
    for (const r of rs) {
      for (const w of r.weaknesses ?? []) {
        const e = skill.get(w.code) ?? { students: new Set(), examples: [] };
        e.students.add(r.student_id);
        if (e.examples.length < 4) e.examples.push(`Q${r.question}: ${w.detail}`);
        skill.set(w.code, e);
      }
    }
    const skills = [...skill.entries()]
      .map(([code, e]) => ({ code, label: skillLabel(code), students: e.students.size, pct: Math.round((e.students.size / studentIds.length) * 100), examples: e.examples }))
      .sort((x, y) => y.students - x.students);
    const belowTarget = [...perStudent.values()]
      .map((r) => {
        const grade = r.grade_estimate == null ? null : Number(r.grade_estimate);
        const gap = grade != null && r.target_grade != null ? Math.round((r.target_grade - grade) * 10) / 10 : null;
        return { id: r.student_id, name: studentName(r), target: r.target_grade, grade, gap };
      })
      .filter((x) => x.gap != null && x.gap >= 1)
      .sort((x, y) => (y.gap ?? 0) - (x.gap ?? 0));
    return {
      classCode,
      students: studentIds.length,
      marked: studentIds.length,
      avgPct: pctList.length ? Math.round(pctList.reduce((s, x) => s + x, 0) / pctList.length) : 0,
      questions,
      skills,
      belowTarget,
    };
  };
  const classes = [...groups.entries()].map(([k, rs]) => build(k, rs)).sort((x, y) => x.classCode.localeCompare(y.classCode));
  return { paper: a.paper, classes, year: rows.length ? build("Whole cohort", rows) : null };
}

// ---------------------------------------------------------------- grade bands: "why are 3s not 4s?"

export type BandAnalysis = {
  grade: number;
  students: number;
  topSkills: { code: string; label: string; pct: number }[];
  /** Skills much more common in this band than in the band above: what holds them back. */
  separators: { code: string; label: string; pctHere: number; pctAbove: number; teach: string }[];
  questionPct: Record<string, number>;
  questionPctAbove: Record<string, number>;
};

export async function gradeBands(yearGroup: number): Promise<{ profiles: StudentProfile[]; bands: BandAnalysis[] }> {
  const profiles = (await studentProfiles({ yearGroup })).filter((p) => p.workingGrade != null);
  const byBand = new Map<number, StudentProfile[]>();
  for (const p of profiles) {
    const g = Math.max(1, Math.min(9, Math.floor(p.workingGrade!)));
    (byBand.get(g) ?? byBand.set(g, []).get(g)!).push(p);
  }
  const pctWith = (ps: StudentProfile[], code: string) =>
    ps.length ? Math.round((ps.filter((p) => p.skills.some((s) => s.code === code)).length / ps.length) * 100) : 0;
  const qAvg = (ps: StudentProfile[]) => {
    const acc: Record<string, number[]> = {};
    for (const p of ps) for (const [k, v] of Object.entries(p.questionPct)) (acc[k] ??= []).push(v);
    return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)]));
  };
  const bands: BandAnalysis[] = [...byBand.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([grade, ps]) => {
      const above = byBand.get(grade + 1) ?? [];
      const codes = new Set(ps.flatMap((p) => p.skills.map((s) => s.code)));
      const topSkills = [...codes]
        .map((code) => ({ code, label: skillLabel(code), pct: pctWith(ps, code) }))
        .sort((x, y) => y.pct - x.pct)
        .slice(0, 6);
      const separators = [...codes]
        .map((code) => ({
          code,
          label: skillLabel(code),
          pctHere: pctWith(ps, code),
          pctAbove: pctWith(above, code),
          teach: TAXONOMY[code as SkillCode]?.teach ?? "",
        }))
        // Only compare with a band that has enough students to mean something.
        .filter((x) => above.length >= 3 && x.pctHere - x.pctAbove >= 10)
        .sort((x, y) => y.pctHere - y.pctAbove - (x.pctHere - x.pctAbove))
        .slice(0, 5);
      return { grade, students: ps.length, topSkills, separators, questionPct: qAvg(ps), questionPctAbove: qAvg(above) };
    });
  return { profiles, bands };
}

// ---------------------------------------------------------------- suggested intervention groups

export type SuggestedGroup = {
  focus: string;
  focusLabel: string;
  teach: string;
  students: { id: string; name: string; class_code: string | null; gap: number; workingGrade: number; target: number; skills: string[] }[];
};

/**
 * Students furthest below target first, then grouped by the weakness they share,
 * so each group has one clear teaching focus.
 */
export async function suggestGroups(yearGroup: number, minGap = 1): Promise<SuggestedGroup[]> {
  const settings = await getSettings();
  const size = settings.interventionGroupSize;
  const candidates = (await studentProfiles({ yearGroup }))
    .filter((p) => p.gap != null && p.gap >= minGap && p.skills.length)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
  const remaining = new Set(candidates.map((c) => c.id));
  const groups: SuggestedGroup[] = [];
  while (remaining.size) {
    const pool = candidates.filter((c) => remaining.has(c.id));
    // The most common top-3 weakness across the remaining pool, weighted by gap.
    const score = new Map<string, number>();
    for (const c of pool) for (const s of c.skills.slice(0, 3)) score.set(s.code, (score.get(s.code) ?? 0) + (c.gap ?? 1));
    const [focus] = [...score.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!focus) break;
    const members = pool.filter((c) => c.skills.slice(0, 3).some((s) => s.code === focus)).slice(0, size);
    if (!members.length) break;
    members.forEach((m) => remaining.delete(m.id));
    groups.push({
      focus,
      focusLabel: skillLabel(focus),
      teach: TAXONOMY[focus as SkillCode]?.teach ?? "",
      students: members.map((m) => ({
        id: m.id,
        name: m.name,
        class_code: m.class_code,
        gap: m.gap!,
        workingGrade: m.workingGrade!,
        target: m.target_grade!,
        skills: m.skills.slice(0, 3).map((s) => s.code),
      })),
    });
  }
  return groups;
}

// ---------------------------------------------------------------- intervention impact

export async function groupImpact(groupId: string) {
  const [g] = await sql<{ start_date: string | null }[]>`SELECT start_date FROM intervention_groups WHERE id = ${groupId}`;
  const members = await sql<{ student_id: string }[]>`SELECT student_id FROM intervention_members WHERE group_id = ${groupId}`;
  const rows = await resultsFor(members.map((m) => m.student_id));
  if (!g?.start_date) return null;
  const start = new Date(g.start_date);
  const when = (r: ResultRow) => new Date(r.sat_on ?? r.created_at);
  const per = new Map<string, { before: number[]; after: number[] }>();
  const skillsBefore = new Map<string, number>();
  const skillsAfter = new Map<string, number>();
  const seenScripts = new Set<string>();
  for (const r of rows) {
    const after = when(r) >= start;
    const e = per.get(r.student_id) ?? { before: [], after: [] };
    if (!seenScripts.has(r.script_id)) {
      seenScripts.add(r.script_id);
      if (r.grade_estimate != null) (after ? e.after : e.before).push(Number(r.grade_estimate));
    }
    per.set(r.student_id, e);
    for (const w of r.weaknesses ?? []) {
      const m = after ? skillsAfter : skillsBefore;
      m.set(w.code, (m.get(w.code) ?? 0) + 1);
    }
  }
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  return {
    students: [...per.entries()].map(([id, v]) => ({ id, before: avg(v.before), after: avg(v.after) })),
    skillsBefore: Object.fromEntries(skillsBefore),
    skillsAfter: Object.fromEntries(skillsAfter),
  };
}
