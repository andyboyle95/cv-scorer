import { sql } from "@/lib/db";
import { QUESTIONS } from "@/lib/aqa/spec";
import { PageHeader, Section, StatusChip, Empty } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { ExemplarForm, ReferenceForm, FindOnline } from "./forms";

export const dynamic = "force-dynamic";

export default async function Library() {
  const exemplars = await sql<{ id: string; paper: string; question: number; mark: string; max_mark: number; source: string; status: string; commentary: string | null; created_at: Date }[]>`
    SELECT id, paper, question, mark, max_mark, source, status, commentary, created_at FROM exemplars WHERE active ORDER BY paper, question, mark`;
  const refs = await sql<{ id: string; kind: string; title: string; paper: string | null; status: string; approved: boolean; error: string | null; digest: { general?: string; questions?: Record<string, string> } | null; sources: string[] | null }[]>`
    SELECT id, kind, title, paper, status, approved, error, digest, sources FROM reference_docs ORDER BY created_at DESC`;
  const counts = new Map<string, number>();
  for (const e of exemplars) counts.set(`${e.paper}Q${e.question}`, (counts.get(`${e.paper}Q${e.question}`) ?? 0) + 1);
  const pending = refs.some((r) => r.status === "pending") || exemplars.some((e) => e.status === "pending");

  return (
    <div>
      {pending && <AutoRefresh seconds={6} />}
      <PageHeader
        title="Library"
        lead="Everything the marker compares against. The AQA level descriptors, mark caps and examiner-report weaknesses for all ten questions are built in. Add your own moderated scripts and department structures to tune it to your standard."
      />

      <Section title="Moderated exemplars">
        <p className="mb-4 max-w-3xl text-sm text-muted">The marker sees up to five exemplars per question, spread across the mark range, and checks its mark against them. Aim for at least five per question: a low, middle and high answer as a minimum. Scripts returned from AQA with their real marks are the best anchors.</p>
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          {Object.keys(QUESTIONS).map((k) => {
            const n = counts.get(k) ?? 0;
            return <span key={k} className={`chip ${n >= 5 ? "bg-good-wash text-good" : n ? "bg-warn-wash text-warn" : "bg-sunk text-muted"}`}>{k.replace("Q", " Q")}: {n}</span>;
          })}
        </div>
        <ExemplarForm />
        {exemplars.length > 0 && (
          <div className="panel mt-6 overflow-x-auto">
            <table className="table">
              <thead><tr><th>Question</th><th>Mark</th><th>Source</th><th>Comment</th><th></th><th></th></tr></thead>
              <tbody>
                {exemplars.map((e) => (
                  <tr key={e.id}>
                    <td>{e.paper} Q{e.question}</td>
                    <td className="tabular">{Number(e.mark)}/{e.max_mark}</td>
                    <td>{{ moderated: "Moderated", exam_return: "AQA return", teacher_override: "Teacher correction" }[e.source] ?? e.source}</td>
                    <td className="max-w-md truncate text-muted">{e.commentary}</td>
                    <td><StatusChip status={e.status} /></td>
                    <td><ActionButton path={`/api/library/exemplars?id=${e.id}`} method="DELETE" className="btn-text text-muted">Remove</ActionButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Department structures and examiner reports">
        <p className="mb-4 max-w-3xl text-sm text-muted">Upload your structures PowerPoint and they are applied to every question they cover, so feedback can say when a student is not following them. Examiner reports and mark schemes are turned into short notes per question. Nothing from “Find online” is used until you approve it.</p>
        <div className="grid gap-8 lg:grid-cols-2">
          <ReferenceForm />
          <FindOnline />
        </div>
        {refs.length ? (
          <div className="mt-8 space-y-4">
            {refs.map((r) => (
              <details key={r.id} className="panel p-4">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                  <span className="font-semibold">{r.title}</span>
                  <span className="text-sm text-muted">{r.kind.replace("_", " ")}{r.paper ? ` · ${r.paper}` : ""}</span>
                  <StatusChip status={r.status} />
                  {r.status === "ready" && (r.approved ? <span className="chip bg-good-wash text-good">In use</span> : <span className="chip bg-warn-wash text-warn">Waiting for approval</span>)}
                </summary>
                {r.error && <p className="mt-2 text-sm text-bad">{r.error}</p>}
                {r.digest?.general && <p className="mt-3 whitespace-pre-wrap text-sm">{r.digest.general}</p>}
                {r.digest?.questions && Object.entries(r.digest.questions).map(([k, v]) => (
                  <div key={k} className="mt-3 text-sm"><p className="font-semibold">{k.replace("Q", " Q")}</p><p className="whitespace-pre-wrap text-muted">{v}</p></div>
                ))}
                {r.sources?.length ? <p className="mt-3 text-xs text-muted">Sources: {r.sources.join(" · ")}</p> : null}
                <div className="mt-4 flex gap-2">
                  {r.status === "ready" && <ActionButton path={`/api/library/references/${r.id}`} method="PATCH" body={{ approved: !r.approved }}>{r.approved ? "Stop using" : "Approve and use"}</ActionButton>}
                  <ActionButton path={`/api/library/references/${r.id}`} method="DELETE" className="btn-text text-muted" confirm="Delete this document?">Delete</ActionButton>
                </div>
              </details>
            ))}
          </div>
        ) : null}
      </Section>

      <Section title="Built-in AQA reference">
        <div className="space-y-3">
          {Object.values(QUESTIONS).map((q) => (
            <details key={q.id} className="panel p-4">
              <summary className="cursor-pointer"><span className="font-semibold">{q.paper} Q{q.number} {q.title}</span> <span className="text-sm text-muted">· {q.marks} marks · {q.aos}</span></summary>
              <p className="mt-3 text-sm">{q.focus}</p>
              <h4 className="mt-3 text-sm font-semibold">Level descriptors</h4>
              <p className="whitespace-pre-wrap text-sm text-muted">{q.descriptors}</p>
              <h4 className="mt-3 text-sm font-semibold">Marking rules</h4>
              <p className="whitespace-pre-wrap text-sm text-muted">{q.guidance}</p>
              <h4 className="mt-3 text-sm font-semibold">What examiners see going wrong</h4>
              <p className="text-sm text-muted">{q.commonIssues}</p>
            </details>
          ))}
        </div>
        {!exemplars.length && <div className="mt-6"><Empty title="Tip">Start with 30-50 scripts teachers have already marked: create an “accuracy check” assessment, upload them, and compare marks in Moderation.</Empty></div>}
      </Section>
    </div>
  );
}
