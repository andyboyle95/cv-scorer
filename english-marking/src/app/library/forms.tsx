"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, postJson } from "@/lib/client";

const MARKS: Record<string, number[]> = { P1: [4, 8, 8, 20, 40], P2: [4, 8, 12, 16, 40] };

export function ExemplarForm() {
  const router = useRouter();
  const [paper, setPaper] = useState("P1");
  const [q, setQ] = useState(4);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const max = MARKS[paper][q - 1];
  return (
    <form
      className="panel grid gap-4 p-4 sm:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const form = e.currentTarget;
        const fd = new FormData(form);
        fd.set("paper", paper);
        fd.set("question", String(q));
        const res = await fetch(api("/api/library/exemplars"), { method: "POST", body: fd });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) return setMsg({ ok: false, text: data.error });
        form.reset();
        setMsg({ ok: true, text: "Added. Scans are transcribed in the background." });
        router.refresh();
      }}
    >
      <div>
        <label className="label" htmlFor="ex-paper">Paper</label>
        <select id="ex-paper" className="field" value={paper} onChange={(e) => setPaper(e.target.value)}><option value="P1">Paper 1</option><option value="P2">Paper 2</option></select>
      </div>
      <div>
        <label className="label" htmlFor="ex-q">Question</label>
        <select id="ex-q" className="field" value={q} onChange={(e) => setQ(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Q{n}</option>)}</select>
      </div>
      <div>
        <label className="label" htmlFor="ex-mark">Agreed mark (/{max})</label>
        <input id="ex-mark" name="mark" type="number" min={0} max={max} className="field" required />
      </div>
      <div>
        <label className="label" htmlFor="ex-src">Source</label>
        <select id="ex-src" name="source" className="field"><option value="moderated">Department moderated</option><option value="exam_return">AQA script return</option></select>
      </div>
      {q === 5 && (
        <>
          <div><label className="label" htmlFor="ao5">AO5 (/24)</label><input id="ao5" name="ao5" type="number" min={0} max={24} className="field" /></div>
          <div><label className="label" htmlFor="ao6">AO6 (/16)</label><input id="ao6" name="ao6" type="number" min={0} max={16} className="field" /></div>
        </>
      )}
      <div className="sm:col-span-4">
        <label className="label" htmlFor="ex-com">Moderator commentary</label>
        <textarea id="ex-com" name="commentary" rows={2} className="field" placeholder="Why this mark: which descriptors it meets, what keeps it from the next level." />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="ex-pages">Scans of the answer</label>
        <input id="ex-pages" name="pages" type="file" multiple accept="image/*" className="field" />
        <p className="hint">Photos or scanned images (JPG/PNG). Transcribed, then the images are deleted.</p>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="ex-text">Or paste the answer text</label>
        <textarea id="ex-text" name="answer_text" rows={3} className="field" />
      </div>
      <div className="sm:col-span-4 flex items-center gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add exemplar"}</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

export function ReferenceForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const form = e.currentTarget;
        const res = await fetch(api("/api/library/references"), { method: "POST", body: new FormData(form) });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) return setMsg({ ok: false, text: data.error });
        form.reset();
        setMsg({ ok: true, text: "Uploaded. Notes are being written." });
        router.refresh();
      }}
    >
      <h3 className="font-bold">Upload a document</h3>
      <div>
        <label className="label" htmlFor="ref-kind">Type</label>
        <select id="ref-kind" name="kind" className="field">
          <option value="department_structure">Department structures (used straight away)</option>
          <option value="examiner_report">Examiner report</option>
          <option value="mark_scheme">Mark scheme</option>
          <option value="other">Other guidance</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="ref-paper">Applies to</label>
        <select id="ref-paper" name="paper" className="field"><option value="">Both papers</option><option value="P1">Paper 1</option><option value="P2">Paper 2</option></select>
      </div>
      <div><label className="label" htmlFor="ref-file">File (.pptx, .docx, .pdf)</label><input id="ref-file" name="file" type="file" accept=".pptx,.docx,.pdf,.txt" className="field" /></div>
      <div><label className="label" htmlFor="ref-title">Title (optional)</label><input id="ref-title" name="title" className="field" /></div>
      <button className="btn-primary" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      {msg && <p className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>}
    </form>
  );
}

export function FindOnline() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [paper, setPaper] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await postJson("/api/library/references", { query, paper });
          setQuery("");
          setMsg({ ok: true, text: "Searching aqa.org.uk. This takes a few minutes." });
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        }
      }}
    >
      <h3 className="font-bold">Find online</h3>
      <p className="text-sm text-muted">Searches the AQA website only, reads the mark scheme and examiner report, and writes notes for each question for you to approve.</p>
      <div><label className="label" htmlFor="fo-q">What to find</label><input id="fo-q" className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="June 2025 Paper 1 mark scheme and examiner report" /></div>
      <div>
        <label className="label" htmlFor="fo-p">Paper</label>
        <select id="fo-p" className="field" value={paper} onChange={(e) => setPaper(e.target.value)}><option value="">Both</option><option value="P1">Paper 1</option><option value="P2">Paper 2</option></select>
      </div>
      <button className="btn-quiet" disabled={!query.trim()}>Search AQA</button>
      {msg && <p className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>}
    </form>
  );
}
