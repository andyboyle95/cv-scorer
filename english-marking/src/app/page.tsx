import Link from "next/link";
import { sql } from "@/lib/db";
import { aiMode } from "@/lib/ai/client";
import { queueStats } from "@/lib/jobs";
import { DemoBanner, Empty, Section, Stat, StatusChip } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

// Rough minutes a teacher spends marking one script by hand, by paper section.
const MINUTES_PER_SCRIPT = 12;

export default async function Home() {
  const [counts] = await sql<{ students: number; assessments: number; marked: number; waiting: number; review: number }[]>`
    SELECT (SELECT count(*)::int FROM students WHERE status = 'active') AS students,
           (SELECT count(*)::int FROM assessments) AS assessments,
           (SELECT count(*)::int FROM scripts WHERE status = 'marked') AS marked,
           (SELECT count(*)::int FROM scripts WHERE status IN ('queued','processing')) AS waiting,
           (SELECT count(*)::int FROM scripts WHERE moderation_selected AND moderated_at IS NULL AND status = 'marked') AS review`;
  const recent = await sql<{ id: string; title: string; year_group: number; paper: string; total: number; marked: number; working: number }[]>`
    SELECT a.id, a.title, a.year_group, a.paper,
      count(s.id)::int AS total,
      count(s.id) FILTER (WHERE s.status = 'marked')::int AS marked,
      count(s.id) FILTER (WHERE s.status IN ('queued','processing'))::int AS working
    FROM assessments a LEFT JOIN scripts s ON s.assessment_id = a.id
    GROUP BY a.id ORDER BY a.created_at DESC LIMIT 6`;
  const q = await queueStats();
  const hours = Math.round((counts.marked * MINUTES_PER_SCRIPT) / 60);

  return (
    <div>
      {aiMode() === "demo" && <DemoBanner />}
      {counts.waiting > 0 && <AutoRefresh seconds={8} />}
      <div className="mb-10">
        <p className="text-sm font-semibold text-rubric-ink">{BRAND.school}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          {counts.marked ? `${counts.marked} scripts marked.` : "Ready when your scripts are."}
        </h1>
        {counts.marked > 0 && <p className="mt-2 text-muted">That is roughly {hours} hours of marking handed back to the department.</p>}
      </div>

      <div className="mb-10 grid grid-cols-2 gap-6 border-y border-line py-6 sm:grid-cols-4">
        <Stat label="Students" value={counts.students} note={<Link className="hover:underline" href="/students">Manage</Link>} />
        <Stat label="Assessments" value={counts.assessments} />
        <Stat label="Being marked" value={counts.waiting} note={q.error ? `${q.error} need attention` : undefined} />
        <Stat label="To moderate" value={counts.review} note={<Link className="hover:underline" href="/moderation">Open queue</Link>} />
      </div>

      <Section title="Recent assessments" actions={<Link href="/assessments/new" className="btn-primary">New assessment</Link>}>
        {recent.length ? (
          <div className="panel overflow-x-auto">
            <table className="table">
              <thead><tr><th>Assessment</th><th>Year</th><th>Paper</th><th>Scripts</th><th></th></tr></thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td><Link className="font-semibold hover:underline" href={`/assessments/${a.id}`}>{a.title}</Link></td>
                    <td>Year {a.year_group}</td>
                    <td>{a.paper === "P1" ? "Paper 1" : "Paper 2"}</td>
                    <td className="tabular">{a.marked}/{a.total}</td>
                    <td>{a.working > 0 ? <StatusChip status="processing" /> : a.total ? <StatusChip status="marked" /> : <span className="text-xs text-muted">No scans yet</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No assessments yet" action={<Link href="/students/import" className="btn-quiet">Start by importing students</Link>}>
            Import your Year 10 and 11 students from Bromcom, then set up an assessment and print cover sheets.
          </Empty>
        )}
      </Section>

      <Section title="How it works">
        <ol className="grid gap-6 text-sm sm:grid-cols-4">
          {[
            ["Import students", "Bromcom CSV with classes, targets and PP/SEND/EAL flags."],
            ["Print cover sheets", "Each student gets a QR code. It goes on top of their work."],
            ["Scan in bulk", "One PDF per class from the photocopier. Cover sheets split it automatically."],
            ["Act on it", "Marks, feedback sheets, class misconceptions and intervention packs."],
          ].map(([t, d], i) => (
            <li key={t}>
              <span className="font-initial text-3xl leading-none text-rubric">{i + 1}</span>
              <p className="mt-1 font-semibold">{t}</p>
              <p className="text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
