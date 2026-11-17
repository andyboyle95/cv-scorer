import { sql, audit } from "@/lib/db";
import { handle, bad } from "@/lib/http";
import { newStudentCode } from "@/lib/codes";

type Incoming = {
  mis_id: string; first_name: string; last_name: string; year_group: number; class_code?: string;
  teacher?: string; target_grade?: number | null; pp?: boolean; send?: boolean; eal?: boolean;
};

export const POST = handle(async (req: Request) => {
  const { students, markLeavers } = (await req.json()) as { students: Incoming[]; markLeavers?: boolean };
  if (!Array.isArray(students) || !students.length) throw bad("No students to import.");
  let created = 0;
  let updated = 0;
  await sql.begin(async (tx) => {
    for (const s of students) {
      if (!s.mis_id || !s.year_group) continue;
      const [existing] = await tx<{ id: string }[]>`SELECT id FROM students WHERE mis_id = ${s.mis_id}`;
      if (existing) {
        await tx`UPDATE students SET first_name = ${s.first_name}, last_name = ${s.last_name}, year_group = ${s.year_group},
          class_code = ${s.class_code ?? null}, teacher = ${s.teacher ?? null}, target_grade = ${s.target_grade ?? null},
          pp = ${!!s.pp}, send = ${!!s.send}, eal = ${!!s.eal}, status = 'active', updated_at = now() WHERE id = ${existing.id}`;
        updated++;
      } else {
        for (let i = 0; i < 5; i++) {
          const code = newStudentCode();
          const res = await tx`INSERT INTO students (code, mis_id, first_name, last_name, year_group, class_code, teacher, target_grade, pp, send, eal)
            VALUES (${code}, ${s.mis_id}, ${s.first_name}, ${s.last_name}, ${s.year_group}, ${s.class_code ?? null}, ${s.teacher ?? null},
                    ${s.target_grade ?? null}, ${!!s.pp}, ${!!s.send}, ${!!s.eal})
            ON CONFLICT (code) DO NOTHING`;
          if (res.count) break;
        }
        created++;
      }
    }
    if (markLeavers) {
      const years = [...new Set(students.map((s) => s.year_group))];
      const ids = students.map((s) => s.mis_id);
      await tx`UPDATE students SET status = 'left', updated_at = now()
               WHERE status = 'active' AND year_group = ANY(${years}) AND mis_id IS NOT NULL AND NOT (mis_id = ANY(${ids}))`;
    }
  });
  await audit("students_import", { created, updated });
  return { created, updated };
});
