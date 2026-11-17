import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { groupImpact, studentProfiles } from "@/lib/analytics";
import { skillLabel, skillTeach } from "@/lib/aqa/taxonomy";
import type { TutorPack } from "@/lib/insights";
import { Empty, GapChip, PageHeader, Section } from "@/components/ui";
import { InsightButton } from "@/components/insight-button";
import { ActionButton } from "@/components/action-button";
import { GroupSettings } from "./group-settings";
import { BASE } from "@/lib/base";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [g] = await sql<{ id: string; name: string; tutor: string | null; year_group: number | null; start_date: string | null; pack: TutorPack | null; pack_generated_at: Date | null }[]>`
    SELECT id, name, tutor, year_group, start_date, pack, pack_generated_at FROM intervention_groups WHERE id = ${id}`;
  if (!g) notFound();
  const memberIds = (await sql<{ student_id: string }[]>`SELECT student_id FROM intervention_members WHERE group_id = ${id}`).map((m) => m.student_id);
  const profiles = await studentProfiles({ ids: memberIds });
  const counts = new Map<string, number>();
  for (const p of profiles) for (const s of p.skills.slice(0, 5)) counts.set(s.code, (counts.get(s.code) ?? 0) + 1);
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const classes = [...new Set(profiles.map((p) => p.class_code).filter(Boolean))];
  const impact = await groupImpact(id);
  const byCode = new Map(profiles.map((p) => [p.code, p]));
  const nameOf = new Map(profiles.map((p) => [p.id, p.name]));

  return (
    <div>
      <PageHeader
        title={g.name}
        back={{ href: "/interventions", label: "Interventions" }}
        lead={`${profiles.length} students from ${classes.length} class${classes.length === 1 ? "" : "es"}${classes.length ? ` (${classes.join(", ")})` : ""}${g.tutor ? ` · tutor ${g.tutor}` : ""}`}
        actions={
          <>
            <InsightButton path={`/api/interventions/${id}`} body={{ action: "pack" }} label={g.pack ? "Rebuild tutor pack" : "Build tutor pack"} busyLabel="Reading their scripts…" />
            {g.pack && <a className="btn-primary" href={`${BASE}/api/export/tutor-pack?group=${id}`}>Tutor pack (Word booklet)</a>}
          </>
        }
      />

      <Section title="What these students share">
        {common.length ? (
          <ol className="space-y-3">
            {common.map(([code, n], i) => (
              <li key={code} className="grid gap-1 sm:grid-cols-[2rem_1fr]">
                <span className="font-initial text-2xl leading-none text-rubric">{i + 1}</span>
                <div>
                  <p className="font-semibold">{skillLabel(code)} <span className="font-normal text-muted">· {n} of {profiles.length}</span></p>
                  <p className="text-sm text-muted">{skillTeach(code)}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : <Empty title="No marked work for these students yet" />}
      </Section>

      {g.pack && (
        <Section title="Tutor pack" actions={<span className="text-xs text-muted">Built {g.pack_generated_at ? new Date(g.pack_generated_at).toLocaleString("en-GB") : ""}</span>}>
          <p className="mb-6 max-w-3xl">{g.pack.overview}</p>
          <div className="space-y-6">
            {g.pack.focus_areas.map((f, i) => (
              <article key={i} className="border-t border-line pt-4">
                <h3 className="font-bold">{i + 1}. {f.skill}</h3>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-[11rem_1fr]">
                  <dt className="font-semibold">What they do now</dt><dd>{f.what_they_do_now}</dd>
                  <dt className="font-semibold">What good looks like</dt><dd className="italic">{f.what_good_looks_like}</dd>
                  <dt className="font-semibold">How to teach it</dt><dd>{f.how_to_teach}</dd>
                </dl>
              </article>
            ))}
          </div>
          <h3 className="mt-8 font-bold">Each student</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {g.pack.students.map((s) => <li key={s.code}><span className="font-semibold">{byCode.get(s.code)?.name ?? s.code}:</span> {s.needs}</li>)}
          </ul>
        </Section>
      )}

      <Section title="Students">
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead><tr><th>Student</th><th>Class</th><th>Working / target</th><th>Gap</th><th>Top skill gaps</th></tr></thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td><Link className="font-semibold hover:underline" href={`/students/${p.id}`}>{p.name}</Link></td>
                  <td>{p.class_code}</td>
                  <td className="tabular">{p.workingGrade?.toFixed(1) ?? "-"} / {p.target_grade ?? "-"}</td>
                  <td><GapChip gap={p.gap} /></td>
                  <td className="text-muted">{p.skills.slice(0, 3).map((s) => skillLabel(s.code)).join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Impact">
        {!g.start_date ? (
          <p className="text-sm text-muted">Set a start date below to compare grades before and after the intervention.</p>
        ) : impact && impact.students.some((s) => s.after != null) ? (
          <div className="panel overflow-x-auto">
            <table className="table">
              <thead><tr><th>Student</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
              <tbody>
                {impact.students.map((s) => (
                  <tr key={s.id}>
                    <td>{nameOf.get(s.id)}</td>
                    <td className="tabular">{s.before ?? "-"}</td>
                    <td className="tabular">{s.after ?? "-"}</td>
                    <td className="tabular">{s.before != null && s.after != null ? <span className={s.after >= s.before ? "text-good" : "text-bad"}>{(s.after - s.before > 0 ? "+" : "") + (s.after - s.before).toFixed(1)}</span> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-xs text-muted">Average grade estimates of assessments sat before and after {new Date(g.start_date).toLocaleDateString("en-GB")}. Compare like with like: different papers vary in difficulty.</p>
          </div>
        ) : (
          <p className="text-sm text-muted">No assessments since {new Date(g.start_date).toLocaleDateString("en-GB")} yet. Impact appears after the next marked assessment.</p>
        )}
      </Section>

      <Section title="Group settings">
        <GroupSettings id={id} tutor={g.tutor ?? ""} startDate={g.start_date ? new Date(g.start_date).toISOString().slice(0, 10) : ""} />
        <div className="mt-6">
          <ActionButton path={`/api/interventions/${id}`} method="DELETE" className="btn-quiet text-bad" confirm="Delete this group? Students and marks are not affected.">Delete group</ActionButton>
        </div>
      </Section>
    </div>
  );
}
