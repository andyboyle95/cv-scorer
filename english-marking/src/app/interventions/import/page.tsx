"use client";
import { useState } from "react";
import { SheetImporter, type FieldDef } from "@/components/sheet-importer";
import { PageHeader } from "@/components/ui";
import { postJson } from "@/lib/client";

const FIELDS: FieldDef[] = [
  { key: "group", label: "Group name", required: true, synonyms: ["group", "intervention", "group name", "session"] },
  { key: "student", label: "Student (name, Bromcom ID or code)", required: true, synonyms: ["student", "name", "pupil", "student name", "admission no", "id"], hint: "“First Last”, “Last, First”, Bromcom ID or the student code all work." },
  { key: "tutor", label: "Tutor", synonyms: ["tutor", "teacher", "staff", "lead"] },
  { key: "start_date", label: "Start date", synonyms: ["start", "start date", "date"], hint: "YYYY-MM-DD. Used to measure impact." },
];

export default function ImportGroups() {
  const [year, setYear] = useState("11");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Import intervention groups" back={{ href: "/interventions", label: "Interventions" }} lead="One row per student. Students in several groups can appear on several rows." />
      <div className="mb-6 max-w-xs">
        <label className="label" htmlFor="yg">Year group</label>
        <select id="yg" className="field" value={year} onChange={(e) => setYear(e.target.value)}><option value="10">Year 10</option><option value="11">Year 11</option></select>
        <p className="hint">Helps match students with the same name in different years.</p>
      </div>
      <SheetImporter
        fields={FIELDS}
        submitLabel="Import groups"
        onSubmit={async (rows) => {
          const r = await postJson<{ created: number; unmatched: string[]; ambiguous: string[] }>("/api/interventions", {
            mode: "import",
            yearGroup: Number(year),
            rows: rows.map((x) => ({ group: x.group, student: x.student, tutor: x.tutor || undefined, start_date: /^\d{4}-\d{2}-\d{2}$/.test(x.start_date) ? x.start_date : undefined })),
          });
          const notes = [
            r.unmatched.length ? `Not found: ${r.unmatched.join(", ")}.` : "",
            r.ambiguous.length ? `More than one match: ${r.ambiguous.join(", ")}. Use Bromcom IDs for these.` : "",
          ].filter(Boolean).join(" ");
          return `${r.created} group${r.created === 1 ? "" : "s"} created. ${notes}`;
        }}
      />
    </div>
  );
}
