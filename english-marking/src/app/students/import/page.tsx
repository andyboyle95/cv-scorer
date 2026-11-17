"use client";
import { useState } from "react";
import Link from "next/link";
import { SheetImporter, yes, gradeNum, type FieldDef } from "@/components/sheet-importer";
import { PageHeader } from "@/components/ui";
import { postJson } from "@/lib/client";

const FIELDS: FieldDef[] = [
  { key: "mis_id", label: "Bromcom student ID / admission no.", required: true, synonyms: ["student id", "admission no", "admission number", "adno", "mis id", "id", "upn"] },
  { key: "first_name", label: "First name", required: true, synonyms: ["preferred forename", "forename", "first name", "legal forename", "firstname"] },
  { key: "last_name", label: "Surname", required: true, synonyms: ["preferred surname", "surname", "last name", "legal surname", "lastname"] },
  { key: "year_group", label: "Year group", required: true, synonyms: ["year group", "nc year", "year", "yr"] },
  { key: "class_code", label: "English class", synonyms: ["english group", "english class", "teaching group", "class", "set", "group"] },
  { key: "teacher", label: "English teacher", synonyms: ["english teacher", "teacher", "staff"] },
  { key: "target_grade", label: "English Language target grade", synonyms: ["english language target", "eng lang target", "target grade", "target", "fft"], hint: "Numbers 1-9. '6+' or '5/6' read as the first number." },
  { key: "pp", label: "Pupil Premium", synonyms: ["pupil premium", "pp", "disadvantaged"], hint: "Optional. Y / Yes / True count as yes." },
  { key: "send", label: "SEND", synonyms: ["sen status", "send", "sen"], hint: "Optional. K or E count as yes." },
  { key: "eal", label: "EAL", synonyms: ["eal", "english as an additional language", "first language"], hint: "Optional." },
];

export default function ImportStudents() {
  const [leavers, setLeavers] = useState(false);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Import students"
        back={{ href: "/students", label: "Students" }}
        lead="Export a report from Bromcom with the columns below. Only the columns you match are sent to the app; anything else in the file never leaves this computer. Re-import any time to update classes and targets."
      />
      <SheetImporter
        fields={FIELDS}
        submitLabel="Import students"
        extra={
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={leavers} onChange={(e) => setLeavers(e.target.checked)} />
            <span>Mark students in these year groups who are <strong>not</strong> in this file as leavers. You can anonymise leavers later in Settings.</span>
          </label>
        }
        onSubmit={async (rows) => {
          const students = rows
            .map((r) => ({
              mis_id: r.mis_id,
              first_name: r.first_name,
              last_name: r.last_name,
              year_group: Number((r.year_group.match(/\d+/) ?? [""])[0]),
              class_code: r.class_code || undefined,
              teacher: r.teacher || undefined,
              target_grade: r.target_grade ? gradeNum(r.target_grade) : null,
              pp: r.pp ? yes(r.pp) : false,
              send: r.send ? yes(r.send) && !/^n/i.test(r.send) : false,
              eal: r.eal ? (/english/i.test(r.eal) ? false : yes(r.eal) || /other|not english/i.test(r.eal)) : false,
            }))
            .filter((s) => s.mis_id && [10, 11].includes(s.year_group));
          if (!students.length) throw new Error("No Year 10 or Year 11 students found. Check the year group column.");
          const res = await postJson<{ created: number; updated: number }>("/api/students/import", { students, markLeavers: leavers });
          return `Done: ${res.created} added, ${res.updated} updated.`;
        }}
      />
      <p className="mt-10 text-sm text-muted">Next: <Link className="text-rubric-ink hover:underline" href="/assessments/new">set up an assessment</Link>.</p>
    </div>
  );
}
