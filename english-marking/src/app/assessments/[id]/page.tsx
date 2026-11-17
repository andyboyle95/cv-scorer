import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { classAnalysis, studentName } from "@/lib/analytics";
import { latestInsight, type ClassInsight } from "@/lib/insights";
import { QUESTIONS, qid, type Paper } from "@/lib/aqa/spec";
import { skillTeach } from "@/lib/aqa/taxonomy";
import { aiMode } from "@/lib/ai/client";
import { Bar, DemoBanner, Empty, GapChip, PageHeader, Section, StatusChip } from "@/components/ui";
import { AutoRefresh } from "@/components/auto-refresh";
import { InsightButton } from "@/components/insight-button";
import { BASE } from "@/lib/base";

export const dynamic = "force-dynamic";

type ScriptRow = {
  id: string; status: string; student_id: string | null; first_name: string | null; last_name: string | null; code: string | null;
  class_code: string | null; target_grade: number | null; total_mark: string | null; max_mark: string | null; grade_estimate: string | null;
  needs_review: boolean; moderation_selected: boolean; moderated_at: Date | null; error: string | null;
};

export default async function AssessmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ class?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [a] = await sql<{ id: string; title: string; paper: Paper; year_group: number; questions: number[]; sat_on: string | null; is_calibration: boolean; has_source: boolean; has_ms: boolean }[]>`
    SELECT id, title, paper, year_group, questions, sat_on, is_calibration,
      (source_pdf IS NOT NULL OR source_text IS NOT NULL) AS has_source, mark_scheme_pdf IS NOT NULL AS has_ms
    FROM assessments WHERE id = ${id}`;
  if (!a) notFound();
  const scripts = await sql<ScriptRow[]>`
    SELECT s.id, s.status, s.student_id, st.first_name, st.last_name, st.code, st.class_code, st.target_grade,
      s.total_mark, s.max_mark, s.grade_estimate, s.needs_review, s.moderation_selected, s.moderated_at, s.error
    FROM scripts s LEFT JOIN students st ON st.id = s.student_id
    WHERE s.assessment_id = ${id} ORDER BY st.class_code, st.last_name`;
  const marks = await sql<{ script_id: string; question: number; mark: string }[]>`
    SELECT qr.script_id, qr.question, COALESCE(qr.teacher_mark, qr.ai_mark) AS mark
    FROM question_results qr JOIN scripts s ON s.id = qr.script_id WHERE s.assessment_id = ${id}`;
  const markOf = new Map(marks.map((m) => [`${m.script_id}:${m.question}`, Number(m.mark)]));
  const roster = await sql<{ class_code: string | null; n: number }[]>`
    SELECT class_code, count(*)::int AS n FROM students WHERE status = 'active' AND year_group = ${a.year_group} GROUP BY class_code ORDER BY class_code`;
  const analysis = await classAnalysis(id);
  const current = sp.class ? analysis.classes.find((c) => c.classCode === sp.class) : analysis.year;
  const insight = sp.class ? await latestInsight<ClassInsight>("class", `${id}:${sp.class}`) : null;
  const working = scripts.some((s) => s.status === "queued" || s.status === "processing");
  const shown = sp.class ? scripts.filter((s) => (s.class_code ?? "No class") === sp.class) : scripts;
  const errors = scripts.filter((s) => s.status === "error");

  return (
    <div>
      {aiMode() === "demo" && <DemoBanner />}
      {working && <AutoRefresh seconds={6} />}
      <PageHeader
        title={a.title}
        back={{ href: "/assessments", label: "Assessments" }}
        lead={`Year ${a.year_group} · ${a.paper === "P1" ? "Paper 1" : "Paper 2"} · ${a.questions.map((q) => `Q${q}`).join(", ")}${a.sat_on ? ` · ${new Date(a.sat_on).toLocaleDateString("en-GB")}` : ""}`}
        actions={
          <>
            <Link href={`/assessments/${id}/cover-sheets`} className="btn-quiet">Print cover sheets</Link>
            <Link href={`/assessments/${id}/upload`} className="btn-primary">Upload scans</Link>
          </>
        }
      />
      {!a.has_source && a.questions.some((q) => q < 5) && (
        <p className="mb-6 rounded border border-warn bg-warn-wash px-4 py-3 text-sm">No source insert is attached. Reading questions are marked more accurately with the source.</p>
      )}

      <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-3 text-sm">
        <Link href={`/assessments/${id}`} className={!sp.class ? "font-bold text-rubric-ink" : "text-muted hover:text-ink"}>Whole cohort</Link>
        {roster.map((r) => {
          const c = r.class_code ?? "No class";
          const done = scripts.filter((s) => (s.class_code ?? "No class") === c && s.status === "marked").length;
          return (
            <Link key={c} href={`/assessments/${id}?class=${encodeURIComponent(c)}`} className={sp.class === c ? "font-bold text-rubric-ink" : "text-muted hover:text-ink"}>
              {c} <span className="tabular text-xs">{done}/{r.n}</span>
            </Link>
          );
        })}
      </div>

      {errors.length > 0 && (
        <Section title="Needs attention">
          <ul className="space-y-1 text-sm">
            {errors.map((s) => (
              <li key={s.id}><Link className="font-semibold hover:underline" href={`/scripts/${s.id}`}>{s.code ? studentName({ first_name: s.first_name, last_name: s.last_name, code: s.code }) : "Unassigned script"}</Link>: <span className="text-bad">{s.error}</span></li>
            ))}
          </ul>
        </Section>
      )}

      {current ? (
        <>
          <Section title={`Questions${sp.class ? ` · ${sp.class}` : ""}`} actions={<span className="text-sm text-muted">Average {current.avgPct}% · {current.students} marked</span>}>
            <div className="panel overflow-x-auto">
              <table className="table">
                <thead><tr><th>Question</th><th className="w-1/3">Average</th><th>Levels reached</th></tr></thead>
                <tbody>
                  {current.questions.map((q) => (
                    <tr key={q.q}>
                      <td><strong>Q{q.q}</strong> {q.title}</td>
                      <td><div className="flex items-center gap-3"><Bar value={q.avg} max={q.max} tone="rubric" /><span className="tabular whitespace-nowrap">{q.avg}/{q.max}</span></div></td>
                      <td className="tabular text-muted">{Object.entries(q.levels).sort().map(([k, v]) => `${k} ${v}`).join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            title="Common misconceptions"
            actions={sp.class ? <InsightButton body={{ type: "class", assessmentId: id, classCode: sp.class }} label={insight ? "Rewrite summary" : "Write class summary"} /> : null}
          >
            {insight && (
              <div className="mb-6 space-y-4">
                <p className="text-lg font-semibold">{insight.content.headline}</p>
                <ol className="space-y-4">
                  {insight.content.misconceptions.map((m, i) => (
                    <li key={i} className="grid gap-1 sm:grid-cols-[2rem_1fr]">
                      <span className="font-initial text-2xl leading-none text-rubric">{i + 1}</span>
                      <div>
                        <p className="font-semibold">{m.title} <span className="font-normal text-muted">· {m.students_affected}</span></p>
                        <p className="text-sm">{m.evidence}</p>
                        <p className="mt-1 text-sm"><span className="font-semibold">Reteach:</span> {m.reteach}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {insight.content.next_lessons.length > 0 && (
                  <div><p className="font-semibold">Next lessons</p><ul className="list-inside list-disc text-sm">{insight.content.next_lessons.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
                )}
              </div>
            )}
            <div className="panel overflow-x-auto">
              <table className="table">
                <thead><tr><th>Skill gap</th><th>Students</th><th>What to reteach</th></tr></thead>
                <tbody>
                  {current.skills.slice(0, 8).map((s) => (
                    <tr key={s.code}>
                      <td className="font-semibold">{s.label}</td>
                      <td className="tabular whitespace-nowrap">{s.students} ({s.pct}%)</td>
                      <td className="text-muted">{skillTeach(s.code)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      ) : null}

      <Section
        title="Students"
        actions={
          <div className="flex flex-wrap gap-2">
            <a className="btn-quiet" href={`${BASE}/api/export/markbook?assessment=${id}`}>Markbook (Excel)</a>
            <a className="btn-quiet" href={`${BASE}/api/export/feedback?assessment=${id}${sp.class ? `&class=${encodeURIComponent(sp.class)}` : ""}`}>Feedback sheets (Word)</a>
            {sp.class && <a className="btn-quiet" href={`${BASE}/api/export/class-report?assessment=${id}&class=${encodeURIComponent(sp.class)}`}>Class report (Word)</a>}
          </div>
        }
      >
        {shown.length ? (
          <div className="panel overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>{a.questions.map((q) => <th key={q} className="text-right">Q{q}<span className="font-normal normal-case">/{QUESTIONS[qid(a.paper, q)].marks}</span></th>)}
                  <th className="text-right">Total</th><th>Grade</th><th>Gap</th><th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => {
                  const grade = s.grade_estimate == null ? null : Number(s.grade_estimate);
                  const gap = grade != null && s.target_grade != null ? Math.round((s.target_grade - grade) * 10) / 10 : null;
                  return (
                    <tr key={s.id}>
                      <td><Link className="font-semibold hover:underline" href={`/scripts/${s.id}`}>{s.code ? studentName({ first_name: s.first_name, last_name: s.last_name, code: s.code }) : "Unassigned"}</Link></td>
                      {a.questions.map((q) => <td key={q} className="tabular text-right">{markOf.get(`${s.id}:${q}`) ?? "-"}</td>)}
                      <td className="tabular text-right font-semibold">{s.total_mark != null ? Number(s.total_mark) : "-"}</td>
                      <td className="tabular">{grade?.toFixed(1) ?? "-"}</td>
                      <td><GapChip gap={gap} /></td>
                      <td className="whitespace-nowrap">
                        <StatusChip status={s.status} />
                        {s.status === "marked" && s.moderation_selected && !s.moderated_at && <span className="chip ml-1 bg-warn-wash text-warn">Check</span>}
                        {s.moderated_at && <span className="chip ml-1 bg-sunk text-muted">Moderated</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No scripts yet" action={<Link className="btn-primary" href={`/assessments/${id}/upload`}>Upload scans</Link>}>
            Print cover sheets, have students put them on top of their work, then scan each class as one PDF.
          </Empty>
        )}
      </Section>
    </div>
  );
}
