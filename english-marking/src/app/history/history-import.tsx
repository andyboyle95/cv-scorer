"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SheetImporter, yes, gradeNum, type FieldDef } from "@/components/sheet-importer";
import { postJson } from "@/lib/client";

const Q = ["P1Q1", "P1Q2", "P1Q3", "P1Q4", "P1Q5", "P2Q1", "P2Q2", "P2Q3", "P2Q4", "P2Q5"];
const FIELDS: FieldDef[] = [
  { key: "candidate", label: "Candidate number", required: true, synonyms: ["candidate number", "candidate no", "cand no", "candidate", "uci"], hint: "Turned into a one-way code. Names are never stored." },
  { key: "grade", label: "Final grade", synonyms: ["grade", "overall grade", "subject grade", "8700"] },
  ...Q.map((k) => ({
    key: k,
    label: `${k.slice(0, 2) === "P1" ? "Paper 1" : "Paper 2"} Q${k.slice(3)}`,
    synonyms: [`${k}`, `8700/${k[1]} q0${k[3]}`, `${k[1]}q0${k[3]}`, `paper ${k[1]} q${k[3]}`, `0${k[1]} 0${k[3]}`],
  })),
  { key: "pp", label: "Pupil Premium", synonyms: ["pp", "pupil premium", "disadvantaged"] },
  { key: "send", label: "SEND", synonyms: ["send", "sen"] },
  { key: "eal", label: "EAL", synonyms: ["eal"] },
];

export function HistoryImport() {
  const router = useRouter();
  const [year, setYear] = useState(String(new Date().getFullYear() - (new Date().getMonth() < 8 ? 1 : 0)));
  return (
    <div className="max-w-3xl">
      <div className="mb-6 max-w-xs">
        <label className="label" htmlFor="cy">Exam year (summer series)</label>
        <input id="cy" type="number" className="field" value={year} onChange={(e) => setYear(e.target.value)} />
      </div>
      <SheetImporter
        fields={FIELDS}
        submitLabel="Import results"
        onSubmit={async (rows) => {
          const r = await postJson<{ imported: number }>("/api/history/import", {
            cohortYear: Number(year),
            rows: rows.map((x) => ({
              candidate: x.candidate,
              grade: x.grade ? gradeNum(x.grade) : null,
              marks: Object.fromEntries(Q.map((k) => [k, x[k] === "" ? null : Number(x[k])])),
              pp: x.pp ? yes(x.pp) : undefined,
              send: x.send ? yes(x.send) : undefined,
              eal: x.eal ? yes(x.eal) : undefined,
            })),
          });
          router.refresh();
          return `${r.imported} results imported for ${year}.`;
        }}
      />
    </div>
  );
}
