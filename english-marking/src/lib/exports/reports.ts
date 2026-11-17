import ExcelJS from "exceljs";
import { sql } from "../db";
import { QUESTIONS, qid, type Paper } from "../aqa/spec";
import { skillLabel, skillTeach } from "../aqa/taxonomy";
import { classAnalysis, studentName, studentProfiles, suggestGroups, type StudentProfile } from "../analytics";
import { latestInsight, type ClassInsight, type TutorPack } from "../insights";
import type { Summary } from "../pipeline";
import { buildDoc, h, p, bullets, lines, boxed, table, pageBreak } from "./docx";
import { wholeGrade } from "../grades";

type ScriptRow = {
  id: string; first_name: string | null; last_name: string | null; code: string; class_code: string | null;
  target_grade: number | null; grade_estimate: string | null; total_mark: string | null; max_mark: string | null;
  summary: Summary | null; pp: boolean; send: boolean; eal: boolean;
};

async function assessmentScripts(assessmentId: string, classCode?: string) {
  const [a] = await sql<{ title: string; paper: Paper; questions: number[]; sat_on: string | null }[]>`
    SELECT title, paper, questions, sat_on FROM assessments WHERE id = ${assessmentId}`;
  const scripts = await sql<ScriptRow[]>`
    SELECT s.id, st.first_name, st.last_name, st.code, st.class_code, st.target_grade, st.pp, st.send, st.eal,
           s.grade_estimate, s.total_mark, s.max_mark, s.summary
    FROM scripts s JOIN students st ON st.id = s.student_id
    WHERE s.assessment_id = ${assessmentId} AND s.status = 'marked'
      ${classCode ? sql`AND st.class_code = ${classCode}` : sql``}
    ORDER BY st.class_code, st.last_name, st.first_name`;
  const qrs = await sql<{ script_id: string; question: number; max_mark: number; mark: string; level: string | null; weaknesses: { code: string; detail: string }[]; next_step: string | null }[]>`
    SELECT script_id, question, max_mark, COALESCE(teacher_mark, ai_mark) AS mark, level, weaknesses, next_step
    FROM question_results WHERE script_id = ANY(${scripts.map((s) => s.id)}) ORDER BY question`;
  const byScript = new Map<string, typeof qrs>();
  for (const q of qrs) (byScript.get(q.script_id) ?? byScript.set(q.script_id, [] as unknown as typeof qrs).get(q.script_id)!).push(q);
  return { a, scripts, byScript };
}

// ---------------------------------------------------------------- student feedback sheets (A5, one per student)

export async function feedbackSheets(assessmentId: string, classCode?: string) {
  const { a, scripts, byScript } = await assessmentScripts(assessmentId, classCode);
  const sections = scripts.map((s) => {
    const qs = byScript.get(s.id) ?? [];
    const sum = s.summary;
    return [
      p(`${a.title}${a.sat_on ? ` · ${new Date(a.sat_on).toLocaleDateString("en-GB")}` : ""}`, { size: 16, color: "8A7F7A", after: 20 }),
      h(studentName(s), 1),
      p(`Class ${s.class_code ?? "-"}  ·  Target grade ${s.target_grade ?? "-"}  ·  Working at ${wholeGrade(Number(s.grade_estimate)) ?? "-"} (estimate)`, { size: 18 }),
      table(
        ["Question", "Mark", "Level"],
        qs.map((q) => [`Q${q.question} ${QUESTIONS[qid(a.paper, q.question)].title}`, `${Number(q.mark)}/${q.max_mark}`, q.level ?? ""]),
        [60, 15, 25],
      ),
      p(`Total ${Number(s.total_mark)}/${Number(s.max_mark)}`, { bold: true, after: 120 }),
      h("What went well", 3),
      ...bullets(sum?.www ?? []),
      h("Even better if", 3),
      ...bullets(sum?.ebi ?? []),
      boxed("YOUR TARGET", sum?.target ?? ""),
      h("Respond: your task", 3),
      p(sum?.response_task ?? "", { size: 19 }),
      ...lines(7),
    ];
  });
  if (!sections.length) sections.push([p("No marked scripts yet.")]);
  return buildDoc(sections, "A5", "Feedback");
}

// ---------------------------------------------------------------- class report (A4)

export async function classReport(assessmentId: string, classCode: string) {
  const { a, scripts, byScript } = await assessmentScripts(assessmentId, classCode);
  const { classes } = await classAnalysis(assessmentId);
  const c = classes.find((x) => x.classCode === classCode);
  const insight = (await latestInsight<ClassInsight>("class", `${assessmentId}:${classCode}`))?.content;
  const body = [
    h(`${a.title}: class ${classCode}`, 1),
    p(`${c?.students ?? 0} scripts marked · class average ${c?.avgPct ?? 0}%`),
    ...(insight ? [boxed("SUMMARY", insight.headline)] : []),
    h("Questions"),
    table(["Question", "Average", "Levels"], (c?.questions ?? []).map((q) => [`Q${q.q} ${q.title}`, `${q.avg}/${q.max}`, Object.entries(q.levels).map(([k, v]) => `${k}: ${v}`).join("  ")]), [40, 20, 40]),
    h("Common misconceptions"),
    ...(insight
      ? insight.misconceptions.flatMap((m) => [p(m.title, { bold: true }), p(`What we see: ${m.evidence} (${m.students_affected})`), p(`Reteach: ${m.reteach}`, { after: 140 })])
      : (c?.skills ?? []).slice(0, 6).flatMap((s) => [p(`${s.label}: ${s.students} students (${s.pct}%)`, { bold: true }), p(`Reteach: ${skillTeach(s.code)}`, { after: 120 })])),
    ...(insight ? [h("Next lessons"), ...bullets(insight.next_lessons)] : []),
    h("Students below target"),
    table(["Student", "Target", "Working at", "Gap", "Priority skills"], scripts
      .map((s) => ({ s, gap: s.target_grade != null && s.grade_estimate != null ? s.target_grade - Number(s.grade_estimate) : null }))
      .filter((x) => x.gap != null && x.gap >= 1)
      .sort((x, y) => (y.gap ?? 0) - (x.gap ?? 0))
      .map(({ s, gap }) => [studentName(s), s.target_grade ?? "-", Number(s.grade_estimate).toFixed(1), gap!.toFixed(1), (s.summary?.priority_skills ?? []).map(skillLabel).join("; ")]), [22, 10, 12, 8, 48]),
    pageBreak(),
    h("Student by student"),
    ...scripts.flatMap((s) => [
      p(`${studentName(s)} · ${Number(s.total_mark)}/${Number(s.max_mark)} · grade ${Number(s.grade_estimate).toFixed(1)} (target ${s.target_grade ?? "-"})`, { bold: true }),
      p(s.summary?.teacher_note ?? "", { after: 40 }),
      p((byScript.get(s.id) ?? []).map((q) => `Q${q.question}: ${q.next_step ?? ""}`).join("  |  "), { size: 17, color: "5C524E", after: 140 }),
    ]),
  ];
  return buildDoc([body], "A4", `Class ${classCode}`);
}

// ---------------------------------------------------------------- intervention tutor pack (A5 booklet)

export async function tutorPackDoc(groupId: string) {
  const [g] = await sql<{ name: string; tutor: string | null; pack: TutorPack | null }[]>`
    SELECT name, tutor, pack FROM intervention_groups WHERE id = ${groupId}`;
  const members = await sql<{ id: string; code: string; first_name: string | null; last_name: string | null; class_code: string | null }[]>`
    SELECT st.id, st.code, st.first_name, st.last_name, st.class_code FROM intervention_members m
    JOIN students st ON st.id = m.student_id WHERE m.group_id = ${groupId} ORDER BY st.last_name`;
  const name = new Map(members.map((m) => [m.code, `${studentName(m)} (${m.class_code ?? "-"})`]));
  const pack = g?.pack;
  const tutor = [
    h(g?.name ?? "Intervention group", 1),
    p(`Tutor: ${g?.tutor || "-"}  ·  ${members.length} students`),
    ...(pack
      ? [
          boxed("OVERVIEW", pack.overview),
          h("What to focus on"),
          ...pack.focus_areas.flatMap((f, i) => [
            h(`${i + 1}. ${f.skill}`, 3),
            p(`What they do now: ${f.what_they_do_now}`),
            p(`What good looks like: ${f.what_good_looks_like}`, { italics: true }),
            p(`How to teach it: ${f.how_to_teach}`, { after: 160 }),
          ]),
          h("Each student"),
          table(["Student", "Needs"], pack.students.map((s) => [name.get(s.code) ?? s.code, s.needs]), [30, 70]),
        ]
      : [p("Generate the tutor pack in the app first.")]),
  ];
  const booklet = (pack?.booklet_tasks ?? []).flatMap((t, i) => [
    ...(i === 0 ? [] : [pageBreak()]),
    h(t.title, 1),
    p(t.instructions),
    h("Model", 3),
    p(t.model, { italics: true }),
    h("Your turn", 3),
    ...lines(12),
  ]);
  return buildDoc(booklet.length ? [tutor, booklet] : [tutor], "A5", g?.name ?? "Intervention");
}

// ---------------------------------------------------------------- Excel markbook

function styleHeader(ws: ExcelJS.Worksheet) {
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2B2320" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

const gapFill = (gap: number | null): ExcelJS.Fill | undefined =>
  gap == null ? undefined : { type: "pattern", pattern: "solid", fgColor: { argb: gap >= 2 ? "FFF4C7C3" : gap >= 1 ? "FFFCE8B2" : "FFD9EAD3" } };

export async function markbookXlsx(assessmentId: string) {
  const { a, scripts, byScript } = await assessmentScripts(assessmentId);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Markbook");
  ws.columns = [
    { header: "Student", key: "name", width: 24 },
    { header: "Code", key: "code", width: 9 },
    { header: "Class", key: "class", width: 10 },
    { header: "Target", key: "target", width: 8 },
    ...a.questions.map((q) => ({ header: `Q${q} /${QUESTIONS[qid(a.paper, q)].marks}`, key: `q${q}`, width: 9 })),
    { header: "Total", key: "total", width: 8 },
    { header: "%", key: "pct", width: 7 },
    { header: "Grade (est.)", key: "grade", width: 11 },
    { header: "Gap to target", key: "gap", width: 12 },
    { header: "Priority skills", key: "skills", width: 60 },
    { header: "Target set", key: "tgt", width: 60 },
    { header: "PP", key: "pp", width: 5 },
    { header: "SEND", key: "send", width: 6 },
    { header: "EAL", key: "eal", width: 5 },
  ];
  for (const s of scripts) {
    const qs = byScript.get(s.id) ?? [];
    const grade = s.grade_estimate == null ? null : Number(s.grade_estimate);
    const gap = grade != null && s.target_grade != null ? Math.round((s.target_grade - grade) * 10) / 10 : null;
    const row = ws.addRow({
      name: studentName(s), code: s.code, class: s.class_code, target: s.target_grade,
      ...Object.fromEntries(qs.map((q) => [`q${q.question}`, Number(q.mark)])),
      total: Number(s.total_mark), pct: Math.round((Number(s.total_mark) / Number(s.max_mark)) * 100),
      grade, gap, skills: (s.summary?.priority_skills ?? []).map(skillLabel).join("; "), tgt: s.summary?.target ?? "",
      pp: s.pp ? "Y" : "", send: s.send ? "Y" : "", eal: s.eal ? "Y" : "",
    });
    const fill = gapFill(gap);
    if (fill) row.getCell("gap").fill = fill;
  }
  styleHeader(ws);

  const { classes, year } = await classAnalysis(assessmentId);
  const qa = wb.addWorksheet("Question analysis");
  qa.columns = [{ header: "Class", key: "c", width: 14 }, ...a.questions.map((q) => ({ header: `Q${q} avg`, key: `q${q}`, width: 10 })), { header: "Average %", key: "avg", width: 11 }];
  for (const c of [...classes, ...(year ? [year] : [])]) qa.addRow({ c: c.classCode, ...Object.fromEntries(c.questions.map((q) => [`q${q.q}`, q.avg])), avg: c.avgPct });
  styleHeader(qa);

  const sk = wb.addWorksheet("Misconceptions");
  sk.columns = [{ header: "Class", key: "c", width: 14 }, { header: "Skill gap", key: "s", width: 55 }, { header: "Students", key: "n", width: 9 }, { header: "%", key: "p", width: 6 }, { header: "Examples", key: "e", width: 90 }];
  for (const c of [...classes, ...(year ? [year] : [])]) for (const s of c.skills) sk.addRow({ c: c.classCode, s: s.label, n: s.students, p: s.pct, e: s.examples.join(" | ") });
  styleHeader(sk);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function yearXlsx(yearGroup: number) {
  const profiles = await studentProfiles({ yearGroup });
  const groups = await suggestGroups(yearGroup);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Year ${yearGroup}`);
  ws.columns = [
    { header: "Student", key: "name", width: 24 }, { header: "Class", key: "class", width: 10 },
    { header: "Target", key: "target", width: 8 }, { header: "Working grade", key: "wg", width: 13 },
    { header: "Gap", key: "gap", width: 7 }, { header: "Assessments", key: "n", width: 11 },
    { header: "Top skill gaps", key: "skills", width: 80 },
    { header: "PP", key: "pp", width: 5 }, { header: "SEND", key: "send", width: 6 }, { header: "EAL", key: "eal", width: 5 },
  ];
  for (const p of profiles.sort((x, y) => (y.gap ?? -9) - (x.gap ?? -9))) {
    const row = ws.addRow({ name: p.name, class: p.class_code, target: p.target_grade, wg: p.workingGrade, gap: p.gap, n: p.assessments, skills: p.skills.slice(0, 4).map((s) => skillLabel(s.code)).join("; "), pp: p.pp ? "Y" : "", send: p.send ? "Y" : "", eal: p.eal ? "Y" : "" });
    const fill = gapFill(p.gap);
    if (fill) row.getCell("gap").fill = fill;
  }
  styleHeader(ws);
  const gs = wb.addWorksheet("Suggested groups");
  gs.columns = [{ header: "Group", key: "g", width: 8 }, { header: "Focus", key: "f", width: 50 }, { header: "Student", key: "s", width: 24 }, { header: "Class", key: "c", width: 10 }, { header: "Working / target", key: "wt", width: 16 }, { header: "What to deliver", key: "t", width: 90 }];
  groups.forEach((g, i) => g.students.forEach((s) => gs.addRow({ g: i + 1, f: g.focusLabel, s: s.name, c: s.class_code, wt: `${s.workingGrade} / ${s.target}`, t: g.teach })));
  styleHeader(gs);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export type { StudentProfile };
