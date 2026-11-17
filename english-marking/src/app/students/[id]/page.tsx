import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { studentProfiles } from "@/lib/analytics";
import { GapChip, PageHeader, Section, Stat, StatusChip, Empty } from "@/components/ui";
import { skillLabel, skillTeach } from "@/lib/aqa/taxonomy";
import { ActionButton } from "@/components/action-button";
import { BASE } from "@/lib/base";

export const dynamic = "force-dynamic";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p] = await studentProfiles({ ids: [id] });
  if (!p) notFound();
  const scripts = await sql<{ id: string; title: string; paper: string; status: string; total_mark: string | null; max_mark: string | null; grade_estimate: string | null; created_at: Date; summary: { target?: string } | null }[]>`
    SELECT s.id, a.title, a.paper, s.status, s.total_mark, s.max_mark, s.grade_estimate, s.created_at, s.summary
    FROM scripts s JOIN assessments a ON a.id = s.assessment_id WHERE s.student_id = ${id} ORDER BY s.created_at DESC`;
  const groups = await sql<{ id: string; name: string }[]>`
    SELECT g.id, g.name FROM intervention_members m JOIN intervention_groups g ON g.id = m.group_id WHERE m.student_id = ${id}`;
  return (
    <div>
      <PageHeader title={p.name} back={{ href: "/students", label: "Students" }} lead={`Year ${p.year_group} · ${p.class_code ?? "no class"} · code ${p.code}${p.teacher ? ` · ${p.teacher}` : ""}`} />
      <div className="mb-10 grid grid-cols-2 gap-6 border-y border-line py-6 sm:grid-cols-4">
        <Stat label="Target" value={p.target_grade ?? "-"} />
        <Stat label="Working grade" value={p.workingGrade?.toFixed(1) ?? "-"} note="estimate" />
        <Stat label="Gap" value={<GapChip gap={p.gap} />} />
        <Stat label="Assessments" value={p.assessments} />
      </div>
      <Section title="What to work on">
        {p.skills.length ? (
          <ol className="space-y-4">
            {p.skills.slice(0, 5).map((s, i) => (
              <li key={s.code} className="grid gap-1 sm:grid-cols-[2rem_1fr]">
                <span className="font-initial text-2xl leading-none text-rubric">{i + 1}</span>
                <div>
                  <p className="font-semibold">{skillLabel(s.code)} <span className="font-normal text-muted">· seen {s.count}×</span></p>
                  <p className="text-sm text-muted">{skillTeach(s.code)}</p>
                  <ul className="mt-1 text-sm">
                    {p.latestDetails.filter((d) => d.code === s.code).slice(0, 2).map((d, j) => <li key={j}>“{d.detail}” <span className="text-muted">({d.qid})</span></li>)}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        ) : <Empty title="No marked work yet" />}
      </Section>
      <Section title="Assessments">
        {scripts.length ? (
          <div className="panel overflow-x-auto">
            <table className="table">
              <thead><tr><th>Assessment</th><th>Mark</th><th>Grade (est.)</th><th>Target set</th><th></th></tr></thead>
              <tbody>
                {scripts.map((s) => (
                  <tr key={s.id}>
                    <td><Link href={`/scripts/${s.id}`} className="font-semibold hover:underline">{s.title}</Link></td>
                    <td className="tabular">{s.total_mark != null ? `${Number(s.total_mark)}/${Number(s.max_mark)}` : "-"}</td>
                    <td className="tabular">{s.grade_estimate != null ? Number(s.grade_estimate).toFixed(1) : "-"}</td>
                    <td className="max-w-md text-muted">{s.summary?.target ?? ""}</td>
                    <td><StatusChip status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title="No scripts uploaded yet" />}
      </Section>
      {groups.length > 0 && (
        <Section title="Intervention groups">
          <ul className="list-inside list-disc">{groups.map((g) => <li key={g.id}><Link className="hover:underline" href={`/interventions/${g.id}`}>{g.name}</Link></li>)}</ul>
        </Section>
      )}
      <Section title="Data protection">
        <div className="flex flex-wrap gap-3">
          <a className="btn-quiet" href={`${BASE}/api/gdpr?student=${p.id}`}>Download everything held (subject access)</a>
          <ActionButton path="/api/gdpr" body={{ action: "erase", studentId: p.id }} className="btn-quiet text-bad" confirm={`Permanently delete ${p.name} and all their marks? This cannot be undone.`}>
            Erase this student
          </ActionButton>
        </div>
      </Section>
    </div>
  );
}
