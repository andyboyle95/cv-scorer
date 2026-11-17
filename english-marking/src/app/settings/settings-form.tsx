"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";
import type { AppSettings, GradeBoundaries } from "@/lib/settings";
import { Section } from "@/components/ui";

export function SettingsForm({ settings, presets }: { settings: AppSettings; presets: GradeBoundaries[] }) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const grade = (g: string, v: string) => setS({ ...s, boundaries: { ...s.boundaries, label: "Custom", grades: { ...s.boundaries.grades, [g]: Number(v) } } });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await postJson("/api/settings", s);
          setMsg({ ok: true, text: "Saved. New marks use these settings; existing grades update when scripts are re-marked or moderated." });
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        }
      }}
    >
      <Section title="Grade boundaries">
        <p className="mb-3 text-sm text-muted">Out of 160 (both papers). For a single paper or some questions, the boundaries are scaled to the marks available, so grades are estimates. Now using: <strong>{s.boundaries.label}</strong>.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {presets.map((p) => <button type="button" key={p.label} className={s.boundaries.label === p.label ? "btn-primary" : "btn-quiet"} onClick={() => setS({ ...s, boundaries: p })}>{p.label}</button>)}
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((g) => (
            <div key={g}>
              <label className="label" htmlFor={`g${g}`}>Grade {g}</label>
              <input id={`g${g}`} type="number" className="field tabular" value={s.boundaries.grades[g]} onChange={(e) => grade(g, e.target.value)} />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Marking">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="mr">Teacher check sample</label>
            <select id="mr" className="field" value={s.moderationRate} onChange={(e) => setS({ ...s, moderationRate: Number(e.target.value) })}>
              {[0.1, 0.2, 0.25, 0.33, 0.5, 1].map((r) => <option key={r} value={r}>{r === 1 ? "Every script" : `1 in ${Math.round(1 / r)}`}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="dm">Mark twice when a question is worth at least</label>
            <select id="dm" className="field" value={s.doubleMarkFrom} onChange={(e) => setS({ ...s, doubleMarkFrom: Number(e.target.value) })}>
              {[4, 8, 12, 16, 20, 41].map((n) => <option key={n} value={n}>{n === 41 ? "Never" : `${n} marks`}</option>)}
            </select>
            <p className="hint">Two independent passes; if they differ by more than the tolerance, a third pass decides. More accurate, costs more.</p>
          </div>
          <div>
            <label className="label" htmlFor="tol">Tolerance between passes (marks)</label>
            <input id="tol" type="number" min={0} className="field" value={s.disagreementTolerance} onChange={(e) => setS({ ...s, disagreementTolerance: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="eff">Thinking effort</label>
            <select id="eff" className="field" value={s.effort} onChange={(e) => setS({ ...s, effort: e.target.value as AppSettings["effort"] })}>
              <option value="medium">Medium (cheaper)</option><option value="high">High (recommended)</option><option value="xhigh">Extra high</option><option value="max">Maximum (slowest)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="gs">Intervention group size</label>
            <input id="gs" type="number" min={2} max={15} className="field" value={s.interventionGroupSize} onChange={(e) => setS({ ...s, interventionGroupSize: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="ret">Delete scans after (months)</label>
            <input id="ret" type="number" min={1} max={84} className="field" value={s.retentionMonths} onChange={(e) => setS({ ...s, retentionMonths: Number(e.target.value) })} />
          </div>
        </div>
      </Section>
      <div className="mb-10 flex items-center gap-3">
        <button className="btn-primary">Save settings</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}
