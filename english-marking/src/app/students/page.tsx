import Link from "next/link";
import { studentProfiles } from "@/lib/analytics";
import { Empty, GapChip, PageHeader } from "@/components/ui";
import { skillLabel } from "@/lib/aqa/taxonomy";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Students({ searchParams }: { searchParams: Promise<{ year?: string; class?: string }> }) {
  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : undefined;
  const profiles = await studentProfiles({ yearGroup: year, classCode: sp.class || undefined });
  const classes = await sql<{ class_code: string; year_group: number }[]>`
    SELECT DISTINCT class_code, year_group FROM students WHERE status = 'active' AND class_code IS NOT NULL ORDER BY year_group, class_code`;
  return (
    <div>
      <PageHeader
        title="Students"
        lead="Working grade is the average of each student's latest Paper 1 and Paper 2 estimates. Gap compares it with their target."
        actions={<Link href="/students/import" className="btn-primary">Import from Bromcom</Link>}
      />
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="year">Year</label>
          <select id="year" name="year" defaultValue={sp.year ?? ""} className="field">
            <option value="">All</option><option value="10">Year 10</option><option value="11">Year 11</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="class">Class</label>
          <select id="class" name="class" defaultValue={sp.class ?? ""} className="field">
            <option value="">All</option>
            {classes.map((c) => <option key={c.class_code} value={c.class_code}>{c.class_code}</option>)}
          </select>
        </div>
        <button className="btn-quiet">Filter</button>
      </form>
      {profiles.length ? (
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead><tr><th>Student</th><th>Code</th><th>Class</th><th>Target</th><th>Working</th><th>Gap</th><th>Biggest skill gap</th><th>Flags</th></tr></thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/students/${p.id}`} className="font-semibold hover:underline">{p.name}</Link></td>
                  <td className="font-mono text-xs">{p.code}</td>
                  <td>{p.class_code ?? "-"}</td>
                  <td className="tabular">{p.target_grade ?? "-"}</td>
                  <td className="tabular">{p.workingGrade?.toFixed(1) ?? "-"}</td>
                  <td><GapChip gap={p.gap} /></td>
                  <td className="text-muted">{p.skills[0] ? skillLabel(p.skills[0].code) : "-"}</td>
                  <td className="text-xs text-muted">{[p.pp && "PP", p.send && "SEND", p.eal && "EAL"].filter(Boolean).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No students yet" action={<Link href="/students/import" className="btn-primary">Import from Bromcom</Link>}>
          Export a CSV from Bromcom with student ID, names, year, English class and target grade.
        </Empty>
      )}
    </div>
  );
}
