import Link from "next/link";
import { sql } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Interventions() {
  const groups = await sql<{ id: string; name: string; tutor: string | null; year_group: number | null; start_date: string | null; n: number; has_pack: boolean; origin: string }[]>`
    SELECT g.id, g.name, g.tutor, g.year_group, g.start_date, g.origin, g.pack IS NOT NULL AS has_pack, count(m.student_id)::int AS n
    FROM intervention_groups g LEFT JOIN intervention_members m ON m.group_id = g.id
    GROUP BY g.id ORDER BY g.created_at DESC`;
  return (
    <div>
      <PageHeader
        title="Interventions"
        lead="Import the groups senior leaders set up, or create them from the suggestions in Year groups. Each group gets a tutor pack built from its students' marked work."
        actions={<><Link href="/insights" className="btn-quiet">See suggestions</Link><Link href="/interventions/import" className="btn-primary">Import groups</Link></>}
      />
      {groups.length ? (
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead><tr><th>Group</th><th>Tutor</th><th>Students</th><th>Started</th><th>Tutor pack</th></tr></thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td><Link className="font-semibold hover:underline" href={`/interventions/${g.id}`}>{g.name}</Link>{g.year_group ? <span className="text-muted"> · Y{g.year_group}</span> : null}</td>
                  <td>{g.tutor ?? "-"}</td>
                  <td className="tabular">{g.n}</td>
                  <td className="tabular">{g.start_date ? new Date(g.start_date).toLocaleDateString("en-GB") : "-"}</td>
                  <td>{g.has_pack ? <span className="chip bg-good-wash text-good">Ready</span> : <span className="chip bg-sunk text-muted">Not yet</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No intervention groups yet" action={<Link href="/interventions/import" className="btn-primary">Import groups</Link>}>
          A spreadsheet with one row per student: group name, tutor, and the student&apos;s name or Bromcom ID.
        </Empty>
      )}
    </div>
  );
}
