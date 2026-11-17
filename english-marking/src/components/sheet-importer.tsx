"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export type FieldDef = { key: string; label: string; required?: boolean; synonyms: string[]; hint?: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function guess(headers: string[], f: FieldDef) {
  const hs = headers.map(norm);
  for (const syn of f.synonyms.map(norm)) {
    const exact = hs.indexOf(syn);
    if (exact >= 0) return headers[exact];
  }
  for (const syn of f.synonyms.map(norm)) {
    const i = hs.findIndex((h) => h.includes(syn));
    if (i >= 0) return headers[i];
  }
  return "";
}

/**
 * Upload a CSV/XLSX, match its columns to the fields we need, preview, submit.
 * Only the mapped columns are sent on: everything else in the file stays on this computer.
 */
export function SheetImporter({
  fields, onSubmit, submitLabel, extra,
}: {
  fields: FieldDef[];
  onSubmit: (rows: Record<string, string>[]) => Promise<string>;
  submitLabel: string;
  extra?: React.ReactNode;
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const mapped = rows.map((r) => Object.fromEntries(fields.map((f) => [f.key, map[f.key] ? r[headers.indexOf(map[f.key])] ?? "" : ""])));
  const missing = fields.filter((f) => f.required && !map[f.key]);

  return (
    <div className="space-y-6">
      <div>
        <label className="label" htmlFor="sheet">Spreadsheet (.csv or .xlsx)</label>
        <input
          id="sheet"
          type="file"
          accept=".csv,.xlsx,.txt"
          className="field"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setMsg(null);
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(api("/api/parse-sheet"), { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) return setMsg({ ok: false, text: data.error });
            setHeaders(data.headers);
            setRows(data.rows);
            setMap(Object.fromEntries(fields.map((f) => [f.key, guess(data.headers, f)])));
          }}
        />
      </div>

      {headers.length > 0 && (
        <>
          <div>
            <h3 className="mb-2 font-bold">Match the columns</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="label" htmlFor={`m-${f.key}`}>{f.label}{f.required && <span className="text-rubric"> *</span>}</label>
                  <select id={`m-${f.key}`} className="field" value={map[f.key] ?? ""} onChange={(e) => setMap({ ...map, [f.key]: e.target.value })}>
                    <option value="">Not in this file</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {f.hint && <p className="hint">{f.hint}</p>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-bold">Preview <span className="font-normal text-muted">({rows.length} rows)</span></h3>
            <div className="panel max-h-72 overflow-auto">
              <table className="table">
                <thead><tr>{fields.filter((f) => map[f.key]).map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
                <tbody>
                  {mapped.slice(0, 8).map((r, i) => (
                    <tr key={i}>{fields.filter((f) => map[f.key]).map((f) => <td key={f.key}>{r[f.key]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {extra}
          <button
            className="btn-primary"
            disabled={busy || missing.length > 0}
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                setMsg({ ok: true, text: await onSubmit(mapped) });
              } catch (e) {
                setMsg({ ok: false, text: (e as Error).message });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Importing…" : submitLabel}
          </button>
          {missing.length > 0 && <p className="text-sm text-muted">Match {missing.map((m) => m.label).join(", ")} to continue.</p>}
        </>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`} role="status">{msg.text}</p>}
    </div>
  );
}

export const yes = (v: string) => /^(y|yes|true|1|x|pp|sen|send|eal|k|e|ehcp|✓)/i.test(v.trim());
export const gradeNum = (v: string) => {
  const m = v.match(/[1-9]/);
  return m ? Number(m[0]) : null;
};
