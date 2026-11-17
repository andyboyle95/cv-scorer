import { historyStats, latestInsight, type HistoryInsight } from "@/lib/insights";
import { QUESTIONS } from "@/lib/aqa/spec";
import { Empty, PageHeader, Section } from "@/components/ui";
import { InsightButton } from "@/components/insight-button";
import { HistoryImport } from "./history-import";
import { ActionButton } from "@/components/action-button";

export const dynamic = "force-dynamic";

export default async function History() {
  const stats = await historyStats();
  const insight = await latestInsight<HistoryInsight>("history", "all");
  const qs = Object.keys(QUESTIONS);
  const grades = Object.keys(stats.byGrade).map(Number).sort((a, b) => a - b);
  return (
    <div>
      <PageHeader
        title="History"
        lead="Past Year 11 results from AQA Enhanced Results Analysis. Stored without names: each candidate becomes a one-way code, so trends can be kept for years."
      />
      {stats.years.length ? (
        <>
          <Section title="Average by question, by year">
            <div className="panel overflow-x-auto">
              <table className="table">
                <thead><tr><th>Year</th><th>Students</th>{qs.map((k) => <th key={k} className="text-right">{k.replace("Q", " Q")}</th>)}</tr></thead>
                <tbody>
                  {stats.years.map((y) => (
                    <tr key={y}>
                      <td className="font-semibold">{y}</td>
                      <td className="tabular">{stats.perYear[y].n}</td>
                      {qs.map((k) => <td key={k} className="tabular text-right">{stats.perYear[y].questionPct[k] != null ? `${stats.perYear[y].questionPct[k]}%` : "-"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          <Section title="Who reaches Level 3 or above, by final grade">
            <p className="mb-3 max-w-3xl text-sm text-muted">Percent of students at each final grade who reached Level 3+ on each question. Low numbers in the grade 3-5 rows show which skills hold students back from the next grade.</p>
            <div className="panel overflow-x-auto">
              <table className="table">
                <thead><tr><th>Grade</th><th>Students</th>{qs.filter((k) => QUESTIONS[k].levels.length).map((k) => <th key={k} className="text-right">{k.replace("Q", " Q")}</th>)}</tr></thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g}>
                      <td className="font-semibold">{g}</td>
                      <td className="tabular">{stats.byGrade[g].n}</td>
                      {qs.filter((k) => QUESTIONS[k].levels.length).map((k) => {
                        const v = stats.byGrade[g].reachL3[k];
                        return <td key={k} className={`tabular text-right ${v != null && v < 40 ? "font-semibold text-bad" : ""}`}>{v != null ? `${v}%` : "-"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          <Section title="Trends" actions={<InsightButton body={{ type: "history" }} label={insight ? "Rewrite trends" : "Find trends"} busyLabel="Reading past results…" />}>
            {insight ? (
              <div className="space-y-4">
                {insight.content.findings.map((f, i) => (
                  <div key={i} className="border-t border-line pt-3">
                    <p className="font-semibold">{f.finding}</p>
                    <p className="text-sm text-muted">{f.implication}</p>
                  </div>
                ))}
                {insight.content.priorities.length > 0 && <ol className="list-inside list-decimal">{insight.content.priorities.map((p, i) => <li key={i}>{p}</li>)}</ol>}
              </div>
            ) : <p className="text-sm text-muted">Ask for a write-up once a year or more is imported.</p>}
          </Section>
          <Section title="Imported years">
            <div className="flex flex-wrap gap-3">
              {stats.years.map((y) => (
                <ActionButton key={y} path={`/api/history/import?year=${y}`} method="DELETE" confirm={`Remove all ${y} results?`}>Remove {y}</ActionButton>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <div className="mb-10"><Empty title="No past results yet">Import an Enhanced Results Analysis export below.</Empty></div>
      )}
      <Section title="Import past results">
        <HistoryImport />
      </Section>
    </div>
  );
}
