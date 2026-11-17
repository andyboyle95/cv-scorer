import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { QUESTIONS, qid, type Paper } from "@/lib/aqa/spec";
import { skillLabel } from "@/lib/aqa/taxonomy";
import { studentName } from "@/lib/analytics";
import { PageHeader, Section, StatusChip } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { ModerateForm } from "./moderate-form";
import type { Summary, Transcription } from "@/lib/pipeline";
import { BASE } from "@/lib/base";

export const dynamic = "force-dynamic";

type QR = {
  question: number; max_mark: number; ai_mark: string; ai_marks_raw: string[] | null; teacher_mark: string | null; teacher_comment: string | null;
  level: string | null; ao_marks: { AO5: number; AO6: number } | null; descriptor: string | null; evidence: { quote: string; comment: string }[];
  strengths: string[]; weaknesses: { code: string; detail: string }[]; next_step: string | null; confidence: string | null; rationale: string | null;
};

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [s] = await sql<{
    id: string; status: string; error: string | null; assessment_id: string; title: string; paper: Paper; student_id: string | null;
    first_name: string | null; last_name: string | null; code: string | null; class_code: string | null; target_grade: number | null;
    total_mark: string | null; max_mark: string | null; grade_estimate: string | null; transcription: Transcription | null; summary: Summary | null;
    moderated_at: Date | null; moderated_by: string | null; ai_mode: string | null; images_deleted_at: Date | null; pages: number; year_group: number;
  }[]>`
    SELECT s.*, a.title, a.paper, a.year_group, st.first_name, st.last_name, st.code, st.class_code, st.target_grade,
      (SELECT count(*)::int FROM script_pages p WHERE p.script_id = s.id) AS pages
    FROM scripts s JOIN assessments a ON a.id = s.assessment_id LEFT JOIN students st ON st.id = s.student_id
    WHERE s.id = ${id}`;
  if (!s) notFound();
  const qrs = await sql<QR[]>`SELECT * FROM question_results WHERE script_id = ${id} ORDER BY question`;
  const name = s.code ? studentName({ first_name: s.first_name, last_name: s.last_name, code: s.code }) : "Unassigned script";

  return (
    <div>
      {(s.status === "queued" || s.status === "processing") && <AutoRefresh seconds={5} />}
      <PageHeader
        title={name}
        back={{ href: `/assessments/${s.assessment_id}${s.class_code ? `?class=${encodeURIComponent(s.class_code)}` : ""}`, label: s.title }}
        lead={
          <>
            {s.class_code ?? ""} {s.target_grade ? `· target ${s.target_grade}` : ""} · <StatusChip status={s.status} />
            {s.ai_mode === "demo" && <span className="chip ml-2 bg-warn-wash text-warn">Demo marks</span>}
            {s.moderated_at && <span className="ml-2 text-sm">Moderated by {s.moderated_by} on {new Date(s.moderated_at).toLocaleDateString("en-GB")}</span>}
          </>
        }
        actions={
          <>
            {s.student_id && <Link className="btn-quiet" href={`/students/${s.student_id}`}>Student profile</Link>}
            {!s.images_deleted_at && <ActionButton path={`/api/scripts/${id}/remark`} confirm="Mark this script again from the scan? Teacher marks on it will be cleared." done="Queued">Mark again</ActionButton>}
          </>
        }
      />
      {s.error && <p className="mb-6 rounded border border-bad bg-bad-wash px-4 py-3 text-sm">{s.error}</p>}

      {s.total_mark != null && (
        <div className="mb-10 flex flex-wrap items-baseline gap-x-10 gap-y-2 border-y border-line py-5">
          <p><span className="tabular text-3xl font-extrabold">{Number(s.total_mark)}</span><span className="text-muted">/{Number(s.max_mark)}</span></p>
          <p>Grade estimate <span className="tabular text-xl font-bold">{Number(s.grade_estimate).toFixed(1)}</span></p>
          {s.summary?.priority_skills?.length ? <p className="text-sm text-muted">Priorities: {s.summary.priority_skills.map(skillLabel).join(" · ")}</p> : null}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Scan</h2>
          {s.images_deleted_at ? (
            <p className="text-sm text-muted">The scan was deleted on {new Date(s.images_deleted_at).toLocaleDateString("en-GB")} under the retention policy. The transcription and marks are kept.</p>
          ) : (
            Array.from({ length: s.pages }, (_, i) => (
              <a key={i} href={`${BASE}/api/scripts/${id}/page/${i + 1}`} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${BASE}/api/scripts/${id}/page/${i + 1}`} alt={`Page ${i + 1}`} loading="lazy" className="w-full rounded border border-line" />
              </a>
            ))
          )}
          {s.transcription && (
            <details className="panel p-4">
              <summary className="cursor-pointer font-semibold">Transcription <span className="font-normal text-muted">· legibility {s.transcription.legibility}</span></summary>
              {s.transcription.notes && <p className="mt-2 text-sm text-muted">{s.transcription.notes}</p>}
              {s.transcription.answers.map((a, i) => (
                <div key={i} className="mt-4">
                  <p className="text-sm font-bold">Q{a.question} <span className="font-normal text-muted">· {a.confidence} confidence</span></p>
                  <p className="whitespace-pre-wrap text-sm">{a.text}</p>
                </div>
              ))}
              {s.transcription.shaded_statements?.length ? <p className="mt-4 text-sm">Shaded: {s.transcription.shaded_statements.join(", ")}</p> : null}
            </details>
          )}
        </div>

        <div>
          {s.summary && (
            <Section title="Feedback">
              <div className="space-y-3 text-sm">
                <div><p className="font-semibold">What went well</p><ul className="list-inside list-disc">{s.summary.www.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
                <div><p className="font-semibold">Even better if</p><ul className="list-inside list-disc">{s.summary.ebi.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
                <p className="rounded border border-rubric bg-rubric-wash px-3 py-2"><span className="font-bold text-rubric-ink">Target:</span> {s.summary.target}</p>
                <p><span className="font-semibold">Response task:</span> {s.summary.response_task}</p>
                <p className="text-muted"><span className="font-semibold text-ink">For the teacher:</span> {s.summary.teacher_note}</p>
              </div>
            </Section>
          )}

          {qrs.map((q) => {
            const spec = QUESTIONS[qid(s.paper, q.question)];
            const raw = (q.ai_marks_raw ?? []).map(Number);
            return (
              <section key={q.question} className="mb-8 border-t border-line pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-bold">Q{q.question} {spec.title}</h3>
                  <p className="tabular">
                    <span className="text-xl font-extrabold">{q.teacher_mark != null ? Number(q.teacher_mark) : Number(q.ai_mark)}</span>
                    <span className="text-muted">/{q.max_mark}</span>
                    {q.teacher_mark != null && Number(q.teacher_mark) !== Number(q.ai_mark) && <span className="ml-2 text-xs text-muted">AI gave {Number(q.ai_mark)}</span>}
                  </p>
                </div>
                <p className="text-sm text-muted">
                  {q.level}
                  {q.ao_marks ? ` · AO5 ${q.ao_marks.AO5}/24, AO6 ${q.ao_marks.AO6}/16` : ""}
                  {q.confidence ? ` · ${q.confidence} confidence` : ""}
                  {raw.length > 1 ? ` · marking passes ${raw.join(", ")}` : ""}
                </p>
                {q.rationale && <p className="mt-2 text-sm">{q.rationale}</p>}
                {q.descriptor && <p className="mt-2 text-sm text-muted"><span className="font-semibold text-ink">Mark scheme fit:</span> {q.descriptor}</p>}
                {q.evidence.length > 0 && (
                  <ul className="mt-3 space-y-2 text-sm">
                    {q.evidence.map((e, i) => (
                      <li key={i}><q className="font-semibold">{e.quote}</q> <span className="text-muted">{e.comment}</span></li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-good">Strengths</p>
                    <ul className="list-inside list-disc">{q.strengths.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                  <div>
                    <p className="font-semibold text-bad">Weaknesses</p>
                    <ul className="space-y-1">{q.weaknesses.map((w, i) => <li key={i}><span className="font-semibold">{skillLabel(w.code)}.</span> {w.detail}</li>)}</ul>
                  </div>
                </div>
                {q.next_step && <p className="mt-3 text-sm"><span className="font-semibold">Next step:</span> {q.next_step}</p>}
                {q.teacher_comment && <p className="mt-2 text-sm text-muted">Moderator: {q.teacher_comment}</p>}
              </section>
            );
          })}

          {qrs.length > 0 && (
            <Section title="Moderate">
              <ModerateForm
                scriptId={id}
                questions={qrs.map((q) => ({ question: q.question, max: q.max_mark, ai: Number(q.ai_mark), teacher: q.teacher_mark == null ? null : Number(q.teacher_mark), title: QUESTIONS[qid(s.paper, q.question)].title }))}
              />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
