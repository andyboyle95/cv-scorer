"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

type Q = { question: number; max: number; ai: number; teacher: number | null; title: string };

export function ModerateForm({ scriptId, questions }: { scriptId: string; questions: Q[] }) {
  const router = useRouter();
  const [vals, setVals] = useState(Object.fromEntries(questions.map((q) => [q.question, { mark: String(q.teacher ?? q.ai), comment: "", exemplar: false }])));
  const [who, setWho] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          await postJson(`/api/scripts/${scriptId}/moderate`, {
            moderator: who,
            questions: questions.map((q) => ({ question: q.question, teacher_mark: Number(vals[q.question].mark), comment: vals[q.question].comment || undefined, save_exemplar: vals[q.question].exemplar })),
          });
          setMsg({ ok: true, text: "Saved. Totals and grades are updated." });
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-muted">Enter your mark for each question. Leave the AI mark if you agree. Tick “Use as exemplar” when a mark is a good anchor: future marking will compare against it.</p>
      {questions.map((q) => {
        const v = vals[q.question];
        const changed = Number(v.mark) !== q.ai;
        return (
          <div key={q.question} className="grid gap-2 sm:grid-cols-[10rem_6rem_1fr] sm:items-start">
            <label className="pt-2 text-sm font-semibold" htmlFor={`m${q.question}`}>Q{q.question} {q.title}</label>
            <div className="flex items-center gap-1">
              <input id={`m${q.question}`} type="number" min={0} max={q.max} className="field tabular" value={v.mark} onChange={(e) => setVals({ ...vals, [q.question]: { ...v, mark: e.target.value } })} />
              <span className="text-sm text-muted">/{q.max}</span>
            </div>
            <div className="space-y-1">
              {changed && <input className="field" placeholder="Why you changed it (helps the marker learn)" value={v.comment} onChange={(e) => setVals({ ...vals, [q.question]: { ...v, comment: e.target.value } })} />}
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={v.exemplar} onChange={(e) => setVals({ ...vals, [q.question]: { ...v, exemplar: e.target.checked } })} /> Use as exemplar
              </label>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="who">Your initials</label>
          <input id="who" className="field w-28" value={who} onChange={(e) => setWho(e.target.value)} required />
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save moderation"}</button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`} role="status">{msg.text}</p>}
    </form>
  );
}
