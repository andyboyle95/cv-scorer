import Link from "next/link";
import { sql } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Assessments() {
  const rows = await sql<{ id: string; title: string; year_group: number; paper: string; questions: number[]; sat_on: string | null; is_calibration: boolean; total: number; marked: number }[]>`
    SELECT a.id, a.title, a.year_group, a.paper, a.questions, a.sat_on, a.is_calibration,
      count(s.id)::int AS total, count(s.id) FILTER (WHERE s.status = 'marked')::int AS marked
    FROM assessments a LEFT JOIN scripts s ON s.assessment_id = a.id
    GROUP BY a.id ORDER BY COALESCE(a.sat_on, a.created_at::date) DESC`;
  return (
    <div>
      <PageHeader title="Assessments" actions={<Link href="/assessments/new" className="btn-primary">New assessment</Link>} />
      {rows.length ? (
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead><tr><th>Assessment</th><th>Year</th><th>Paper</th><th>Questions</th><th>Date</th><th>Marked</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link className="font-semibold hover:underline" href={`/assessments/${a.id}`}>{a.title}</Link>
                    {a.is_calibration && <span className="chip ml-2 bg-sunk text-muted">Accuracy check</span>}
                  </td>
                  <td>Year {a.year_group}</td>
                  <td>{a.paper === "P1" ? "Paper 1" : "Paper 2"}</td>
                  <td className="tabular">{a.questions.map((q) => `Q${q}`).join(" ")}</td>
                  <td className="tabular">{a.sat_on ? new Date(a.sat_on).toLocaleDateString("en-GB") : "-"}</td>
                  <td className="tabular">{a.marked}/{a.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No assessments yet" action={<Link href="/assessments/new" className="btn-primary">New assessment</Link>}>
          An assessment is one paper (or some of its questions) sat by a year group.
        </Empty>
      )}
    </div>
  );
}
