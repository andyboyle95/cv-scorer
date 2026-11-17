import Link from "next/link";
import { gradeBands, suggestGroups } from "@/lib/analytics";
import { latestInsight, type YearInsight } from "@/lib/insights";
import { QUESTIONS } from "@/lib/aqa/spec";
import { Empty, GapChip, PageHeader, Section } from "@/components/ui";
import { InsightButton } from "@/components/insight-button";
import { CreateGroupButton } from "./create-group";
import { BASE } from "@/lib/base";

export const dynamic = "force-dynamic";

export default async function Insights({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const year = Number((await searchParams).year ?? 11) === 10 ? 10 : 11;
  const { bands, profiles } = await gradeBands(year);
  const groups = await suggestGroups(year);
  const insight = await latestInsight<YearInsight>("year", String(year));
  const narrative = new Map((insight?.content.bands ?? []).map((b) => [b.grade, b]));
  const below = profiles.filter((p) => (p.gap ?? 0) >= 1).length;

  return (
    <div>
      <PageHeader
        title={`Year ${year}`}
        lead="Where each grade band is, what stops them reaching the next grade, and who needs intervention."
        actions={
          <>
            <Link href="/insights?year=10" className={year === 10 ? "btn-primary" : "btn-quiet"}>Year 10</Link>
            <Link href="/insights?year=11" className={year === 11 ? "btn-primary" : "btn-quiet"}>Year 11</Link>
            <a className="btn-quiet" href={`${BASE}/api/export/year?year=${year}`}>Excel overview</a>
          </>
        }
      />
      {!profiles.length ? (
        <Empty title={`No marked work for Year ${year} yet`}>Upload and mark an assessment first.</Empty>
      ) : (
        <>
          <p className="mb-8 text-lg"><strong className="tabular">{below}</strong> of {profiles.length} students are a grade or more below target.</p>

          <Section title="By grade: why they are not at the next grade" actions={<InsightButton body={{ type: "year", yearGroup: year }} label={insight ? "Rewrite analysis" : "Write analysis"} busyLabel="Reading the whole year…" />}>
            {insight && <p className="mb-6 max-w-3xl">{insight.content.overview}</p>}
            <div className="space-y-8">
              {bands.map((b) => {
                const n = narrative.get(b.grade);
                const qs = Object.keys(QUESTIONS).filter((k) => b.questionPct[k] != null);
                return (
                  <article key={b.grade} className="grid gap-4 border-t border-line pt-5 md:grid-cols-[9rem_1fr]">
                    <div>
                      <p className="font-initial text-5xl leading-none text-rubric">{b.grade}</p>
                      <p className="mt-1 text-sm text-muted">{b.students} student{b.students === 1 ? "" : "s"} working at grade {b.grade}</p>
                    </div>
                    <div className="space-y-3">
                      {n && <p className="font-semibold">{n.why_not_next}</p>}
                      {b.separators.length === 0 && <p className="text-sm text-muted">Too few students at grade {b.grade + 1} to compare with yet.</p>}
                      {b.separators.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold">More common than at grade {b.grade + 1}</p>
                          <ul className="text-sm">
                            {b.separators.map((s) => (
                              <li key={s.code} className="mt-1">
                                {s.label} <span className="tabular text-muted">· {s.pctHere}% vs {s.pctAbove}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {qs.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="table w-auto">
                            <thead><tr><th></th>{qs.map((k) => <th key={k} className="text-right">{k.replace("Q", " Q")}</th>)}</tr></thead>
                            <tbody>
                              <tr><td className="text-muted">Grade {b.grade}</td>{qs.map((k) => <td key={k} className="tabular text-right">{b.questionPct[k]}%</td>)}</tr>
                              {Object.keys(b.questionPctAbove).length > 0 && (
                                <tr><td className="text-muted">Grade {b.grade + 1}</td>{qs.map((k) => <td key={k} className="tabular text-right text-muted">{b.questionPctAbove[k] != null ? `${b.questionPctAbove[k]}%` : "-"}</td>)}</tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {n && (
                        <p className="text-sm"><span className="font-semibold">Intervention:</span> {n.intervention}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {insight && insight.content.priorities.length > 0 && (
              <div className="mt-8">
                <p className="font-semibold">Department priorities</p>
                <ol className="list-inside list-decimal">{insight.content.priorities.map((p, i) => <li key={i}>{p}</li>)}</ol>
              </div>
            )}
          </Section>

          <Section title="Suggested intervention groups" actions={<span className="text-sm text-muted">Furthest below target first, grouped by shared weakness</span>}>
            {groups.length ? (
              <div className="space-y-6">
                {groups.map((g, i) => (
                  <article key={i} className="panel p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{g.focusLabel}</p>
                        <p className="max-w-2xl text-sm text-muted">{g.teach}</p>
                      </div>
                      <CreateGroupButton yearGroup={year} defaultName={`Y${year} ${g.focusLabel.split(/[(,]/)[0].trim()}`} studentIds={g.students.map((s) => s.id)} />
                    </div>
                    <table className="table mt-3">
                      <thead><tr><th>Student</th><th>Class</th><th>Working / target</th><th>Gap</th></tr></thead>
                      <tbody>
                        {g.students.map((s) => (
                          <tr key={s.id}>
                            <td><Link className="hover:underline" href={`/students/${s.id}`}>{s.name}</Link></td>
                            <td>{s.class_code}</td>
                            <td className="tabular">{s.workingGrade.toFixed(1)} / {s.target}</td>
                            <td><GapChip gap={s.gap} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="No one is a grade or more below target" />
            )}
          </Section>
        </>
      )}
    </div>
  );
}
