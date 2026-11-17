"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/client";

const TITLES: Record<string, string[]> = {
  P1: ["List four things", "Language analysis", "Structure", "Evaluation of a statement", "Descriptive or narrative writing"],
  P2: ["True statements", "Summary and synthesis", "Language analysis (one source)", "Comparing perspectives", "Writing a viewpoint"],
};

export default function NewAssessment() {
  const router = useRouter();
  const [paper, setPaper] = useState("P1");
  const [qs, setQs] = useState<number[]>([1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reading = qs.some((q) => q < 5);

  return (
    <div className="max-w-3xl">
      <PageHeader title="New assessment" back={{ href: "/assessments", label: "Assessments" }} lead="The source insert and the paper's own mark scheme make marking much more accurate. Upload them if you have them." />
      <form
        className="space-y-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          fd.set("questions", qs.join(","));
          fd.set("paper", paper);
          const res = await fetch(api("/api/assessments"), { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error);
            setBusy(false);
            return;
          }
          router.push(`/assessments/${data.id}`);
        }}
      >
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">Name</label>
            <input id="title" name="title" className="field" placeholder="Year 11 mock, November, Paper 1" required />
          </div>
          <div>
            <label className="label" htmlFor="year_group">Year group</label>
            <select id="year_group" name="year_group" className="field" defaultValue="11"><option value="10">Year 10</option><option value="11">Year 11</option></select>
          </div>
          <div>
            <label className="label" htmlFor="sat_on">Date sat</label>
            <input id="sat_on" name="sat_on" type="date" className="field" />
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Paper</legend>
          <div className="flex gap-2">
            {["P1", "P2"].map((p) => (
              <button type="button" key={p} onClick={() => setPaper(p)} aria-pressed={paper === p} className={paper === p ? "btn-primary" : "btn-quiet"}>
                {p === "P1" ? "Paper 1: Creative reading and writing" : "Paper 2: Viewpoints and perspectives"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Questions in this assessment</legend>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((q) => (
              <div key={q} className="grid gap-2 sm:grid-cols-[14rem_1fr] sm:items-start">
                <label className="flex items-center gap-2 pt-2 text-sm">
                  <input type="checkbox" checked={qs.includes(q)} onChange={(e) => setQs(e.target.checked ? [...qs, q].sort() : qs.filter((x) => x !== q))} />
                  <span><strong>Q{q}</strong> {TITLES[paper][q - 1]}</span>
                </label>
                {qs.includes(q) && (
                  <textarea name={`q${q}`} rows={2} className="field" placeholder={`Paste the exact wording of Q${q} (recommended: includes line numbers and the statement for Q4)`} />
                )}
              </div>
            ))}
          </div>
        </fieldset>

        {paper === "P2" && qs.includes(1) && (
          <div>
            <label className="label" htmlFor="answer_key">Paper 2 Q1 answer key</label>
            <input id="answer_key" name="answer_key" className="field max-w-xs" placeholder="e.g. B, C, E, H" />
            <p className="hint">The four true statements. With a key, Q1 is marked exactly instead of by AI.</p>
          </div>
        )}

        {reading && (
          <fieldset className="grid gap-4">
            <div>
              <label className="label" htmlFor="source_pdf">Source insert (PDF)</label>
              <input id="source_pdf" name="source_pdf" type="file" accept="application/pdf" className="field" />
              <p className="hint">Needed for reading questions, so the marker can check quotes and line references.</p>
            </div>
            <div>
              <label className="label" htmlFor="source_text">Or paste the source text</label>
              <textarea id="source_text" name="source_text" rows={4} className="field" placeholder="Keep line numbers if you can." />
            </div>
          </fieldset>
        )}
        <div>
          <label className="label" htmlFor="mark_scheme_pdf">This paper&apos;s mark scheme (PDF, optional)</label>
          <input id="mark_scheme_pdf" name="mark_scheme_pdf" type="file" accept="application/pdf" className="field" />
          <p className="hint">Adds the paper&apos;s indicative content. The AQA level descriptors are built in already.</p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="is_calibration" className="mt-1" />
          <span><strong>Accuracy check.</strong> Use this for scripts teachers have already marked: every script goes to moderation so you can compare AI and teacher marks. It is left out of student data.</span>
        </label>
        {error && <p className="text-sm text-bad" role="alert">{error}</p>}
        <button className="btn-primary" disabled={busy || !qs.length}>{busy ? "Saving…" : "Create assessment"}</button>
      </form>
    </div>
  );
}
