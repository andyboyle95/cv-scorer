import Link from "next/link";
import { sql } from "@/lib/db";
import { QUESTIONS } from "@/lib/aqa/spec";
import { getSettings } from "@/lib/settings";
import { studentName } from "@/lib/analytics";
import { Empty, PageHeader, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Moderation() {
  const settings = await getSettings();
  const queue = await sql<{ id: string; title: string; first_name: string | null; last_name: string | null; code: string | null; class_code: string | null; needs_review: boolean; total_mark: string; max_mark: string }[]>`
    SELECT s.id, a.title, st.first_name, st.last_name, st.code, st.class_code, s.needs_review, s.total_mark, s.max_mark
    FROM scripts s JOIN assessments a ON a.id = s.assessment_id LEFT JOIN students st ON st.id = s.student_id
    WHERE s.status = 'marked' AND s.moderation_selected AND s.moderated_at IS NULL
    ORDER BY s.needs_review DESC, s.created_at LIMIT 200`;
  const pairs = await sql<{ paper: string; question: number; max_mark: number; ai: string; teacher: string }[]>`
    SELECT a.paper, qr.question, qr.max_mark, qr.ai_mark AS ai, qr.teacher_mark AS teacher
    FROM question_results qr JOIN scripts s ON s.id = qr.script_id JOIN assessments a ON a.id = s.assessment_id
    WHERE qr.teacher_mark IS NOT NULL`;
  const tol = settings.disagreementTolerance;
  const byQ = new Map<string, { n: number; abs: number; bias: number; within: number; max: number }>();
  for (const p of pairs) {
    const k = `${p.paper}Q${p.question}`;
    const e = byQ.get(k) ?? { n: 0, abs: 0, bias: 0, within: 0, max: p.max_mark };
    const d = Number(p.ai) - Number(p.teacher);
    e.n++;
    e.abs += Math.abs(d);
    e.bias += d;
    if (Math.abs(d) <= (p.max_mark >= 16 ? tol : Math.min(tol, 1))) e.within++;
    byQ.set(k, e);
  }
  const rows = Object.keys(QUESTIONS).filter((k) => byQ.has(k)).map((k) => ({ k, ...byQ.get(k)! }));

  return (
    <div>
      <PageHeader
        title="Moderation"
        lead={`About ${Math.round(settings.moderationRate * 100)}% of scripts are picked at random for a teacher check, plus any the marker was unsure about. Every check makes the accuracy figures below more reliable.`}
      />
      <Section title="How close is the AI to teachers?">
        {rows.length ? (
          <div className="panel overflow-x-auto">
            <table className="table">
              <thead><tr><th>Question</th><th>Checked</th><th>Average difference</th><th>Within tolerance</th><th>Tendency</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const bias = r.bias / r.n;
                  return (
                    <tr key={r.k}>
                      <td><strong>{r.k.replace("Q", " Q")}</strong> {QUESTIONS[r.k].title}</td>
                      <td className="tabular">{r.n}</td>
                      <td className="tabular">{(r.abs / r.n).toFixed(1)} marks</td>
                      <td className="tabular">{Math.round((r.within / r.n) * 100)}%</td>
                      <td className="text-sm">{Math.abs(bias) < 0.5 ? "Balanced" : bias > 0 ? `AI ${bias.toFixed(1)} higher` : `AI ${Math.abs(bias).toFixed(1)} lower`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-3 py-2 text-xs text-muted">Tolerance: ±{tol} marks on 16+ mark questions, ±{Math.min(tol, 1)} on shorter ones. If one question drifts, add moderated exemplars for it in the Library.</p>
          </div>
        ) : (
          <Empty title="No teacher checks yet">Moderate a few scripts, or create an “accuracy check” assessment from 30-50 scripts teachers have already marked.</Empty>
        )}
      </Section>
      <Section title={`To check (${queue.length})`}>
        {queue.length ? (
          <div className="panel overflow-x-auto">
            <table className="table">
              <thead><tr><th>Student</th><th>Assessment</th><th>AI total</th><th>Why</th></tr></thead>
              <tbody>
                {queue.map((q) => (
                  <tr key={q.id}>
                    <td><Link className="font-semibold hover:underline" href={`/scripts/${q.id}`}>{q.code ? studentName({ first_name: q.first_name, last_name: q.last_name, code: q.code }) : "Unassigned"}</Link> <span className="text-muted">{q.class_code}</span></td>
                    <td>{q.title}</td>
                    <td className="tabular">{Number(q.total_mark)}/{Number(q.max_mark)}</td>
                    <td>{q.needs_review ? <span className="chip bg-warn-wash text-warn">Marker unsure</span> : <span className="chip bg-sunk text-muted">Random sample</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing to check right now" />
        )}
      </Section>
    </div>
  );
}
