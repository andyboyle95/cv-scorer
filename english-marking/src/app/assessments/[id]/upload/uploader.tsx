"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { api, BASE } from "@/lib/client";

type Student = { id: string; code: string; name: string; classCode: string | null };
type Page = { blob: Blob; thumb: string; source: string };
type Group = { key: string; studentId: string | null; pages: Page[]; note?: string; state?: "uploading" | "done" | "error"; error?: string };

const MAX_WIDTH = 1700; // enough for handwriting, small enough to upload quickly

async function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.82));
}

function readQr(canvas: HTMLCanvasElement): string | null {
  // Scan a reduced copy; the cover-sheet QR is large.
  const scale = Math.min(1, 1000 / canvas.width);
  const c = document.createElement("canvas");
  c.width = Math.round(canvas.width * scale);
  c.height = Math.round(canvas.height * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  return jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

async function* pagesOf(file: File): AsyncGenerator<HTMLCanvasElement> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.mjs`;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(3, MAX_WIDTH / base.width) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      yield canvas;
    }
    return;
  }
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const scale = Math.min(1, MAX_WIDTH / bmp.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  yield canvas;
}

export function Uploader({ assessmentId, students }: { assessmentId: string; students: Student[] }) {
  const byCode = new Map(students.map((s) => [s.code, s]));
  const [groups, setGroups] = useState<Group[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [classFilter, setClassFilter] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function read(files: FileList | File[]) {
    setBusy(true);
    const out: Group[] = [...groups];
    let current: Group | null = null;
    let n = 0;
    let covers = 0;
    for (const file of Array.from(files)) {
      try {
        for await (const canvas of pagesOf(file)) {
          n++;
          setStatus(`Reading page ${n} of ${file.name}…`);
          const qr = readQr(canvas);
          const m = qr?.match(/^RL1\|([^|]+)\|([A-Z0-9]+)$/);
          if (m) {
            covers++;
            const s = byCode.get(m[2]);
            current = {
              key: `${m[2]}-${Date.now()}-${n}`,
              studentId: s?.id ?? null,
              pages: [],
              note: m[1] !== assessmentId ? "This cover sheet belongs to a different assessment." : s ? undefined : `Code ${m[2]} is not a current student.`,
            };
            out.push(current);
            continue; // the cover sheet itself is never uploaded
          }
          if (!current) {
            current = { key: `loose-${Date.now()}-${n}`, studentId: null, pages: [], note: "No cover sheet before these pages." };
            out.push(current);
          }
          const blob = await canvasToJpeg(canvas);
          current.pages.push({ blob, thumb: URL.createObjectURL(blob), source: file.name });
          setGroups([...out]);
        }
      } catch (e) {
        setStatus(`Could not read ${file.name}: ${(e as Error).message}`);
      }
      // Photos of single scripts without cover sheets: one file = one script.
      if (!covers && !file.name.toLowerCase().endsWith(".pdf")) current = null;
    }
    setGroups(out.filter((g) => g.pages.length || g.note));
    setStatus(`${n} pages read, ${covers} cover sheet${covers === 1 ? "" : "s"} found.`);
    setBusy(false);
  }

  async function upload() {
    setBusy(true);
    let ok = 0;
    const queue = groups.filter((g) => g.studentId && g.pages.length && g.state !== "done");
    const work = async () => {
      for (let g = queue.shift(); g; g = queue.shift()) {
        const group = g;
        setGroups((gs) => gs.map((x) => (x.key === group.key ? { ...x, state: "uploading" } : x)));
        const fd = new FormData();
        fd.append("student_id", group.studentId!);
        group.pages.forEach((p, i) => fd.append("pages", p.blob, `page-${i + 1}.jpg`));
        const res = await fetch(api(`/api/assessments/${assessmentId}/scripts`), { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        setGroups((gs) => gs.map((x) => (x.key === group.key ? { ...x, state: res.ok ? "done" : "error", error: data.error } : x)));
        if (res.ok) ok++;
      }
    };
    await Promise.all([work(), work()]);
    setDone((d) => d + ok);
    setBusy(false);
    setStatus(`${ok} script${ok === 1 ? "" : "s"} sent for marking.`);
  }

  const ready = groups.filter((g) => g.studentId && g.pages.length && g.state !== "done").length;
  const dupes = new Set(groups.map((g) => g.studentId).filter((id, i, all) => id && all.indexOf(id) !== i));
  const classes = [...new Set(students.map((s) => s.classCode).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg border-2 border-dashed border-line bg-surface px-6 py-12 text-center transition-colors duration-150 hover:border-ink"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) void read(e.dataTransfer.files);
        }}
      >
        <p className="font-semibold">Drop PDFs or photos here</p>
        <p className="mt-1 text-sm text-muted">Scan at 150-200 dpi, black and white or greyscale. One PDF per class is ideal.</p>
        <button className="btn-quiet mt-4" disabled={busy} onClick={() => input.current?.click()}>Choose files</button>
        <input ref={input} type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={(e) => e.target.files && read(e.target.files)} />
      </div>
      {status && <p className="text-sm text-muted" role="status">{status}</p>}

      {groups.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm"><strong>{groups.length}</strong> scripts found · <strong>{ready}</strong> ready to send</p>
            <div className="flex gap-2">
              <button className="btn-quiet" disabled={busy} onClick={() => setGroups([])}>Clear</button>
              <button className="btn-primary" disabled={busy || !ready} onClick={upload}>{busy ? "Working…" : `Send ${ready} for marking`}</button>
            </div>
          </div>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {groups.map((g) => {
              const s = students.find((x) => x.id === g.studentId);
              return (
                <li key={g.key} className="grid gap-3 px-4 py-3 sm:grid-cols-[18rem_1fr_auto] sm:items-center">
                  <div>
                    <select
                      className="field"
                      value={g.studentId ?? ""}
                      aria-label="Student"
                      onChange={(e) => setGroups((gs) => gs.map((x) => (x.key === g.key ? { ...x, studentId: e.target.value || null, note: undefined } : x)))}
                    >
                      <option value="">Choose student…</option>
                      <optgroup label="Filter in the box below">
                        {students.filter((st) => !classFilter || st.classCode === classFilter).map((st) => (
                          <option key={st.id} value={st.id}>{st.name} ({st.classCode ?? "-"})</option>
                        ))}
                      </optgroup>
                    </select>
                    {g.note && <p className="mt-1 text-xs text-warn">{g.note}</p>}
                    {g.studentId && dupes.has(g.studentId) && <p className="mt-1 text-xs text-bad">This student appears twice. Only the last upload is kept.</p>}
                    {!g.note && s && <p className="mt-1 text-xs text-muted">Matched by cover sheet</p>}
                  </div>
                  <div className="flex gap-1 overflow-x-auto">
                    {g.pages.map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={p.thumb} alt={`Page ${i + 1}`} className="h-20 w-auto rounded border border-line" />
                    ))}
                    {!g.pages.length && <span className="text-xs text-muted">No pages after this cover sheet</span>}
                  </div>
                  <div className="text-sm">
                    {g.state === "done" && <span className="text-good">Sent</span>}
                    {g.state === "uploading" && <span className="text-muted">Sending…</span>}
                    {g.state === "error" && <span className="text-bad">{g.error ?? "Failed"}</span>}
                    {!g.state && <button className="btn-text text-muted" onClick={() => setGroups((gs) => gs.filter((x) => x.key !== g.key))}>Remove</button>}
                  </div>
                </li>
              );
            })}
          </ul>
          {classes.length > 1 && (
            <div className="max-w-xs">
              <label className="label" htmlFor="cf">Show students from class</label>
              <select id="cf" className="field" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </>
      )}
      {done > 0 && (
        <p className="text-sm">Marking runs in the background. <Link className="font-semibold text-rubric-ink hover:underline" href={`/assessments/${assessmentId}`}>Watch progress</Link></p>
      )}
    </div>
  );
}
