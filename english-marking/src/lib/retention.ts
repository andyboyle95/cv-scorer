import { sql, audit } from "./db";
import { getSettings } from "./settings";

/** Deletes scan images older than the retention period. Marks and transcriptions stay. */
export async function sweep() {
  const { retentionMonths } = await getSettings();
  const old = await sql<{ id: string }[]>`
    SELECT id FROM scripts
    WHERE images_deleted_at IS NULL AND created_at < now() - make_interval(months => ${retentionMonths})`;
  if (!old.length) return;
  const ids = old.map((r) => r.id);
  await sql`DELETE FROM script_pages WHERE script_id = ANY(${ids})`;
  await sql`UPDATE scripts SET images_deleted_at = now() WHERE id = ANY(${ids})`;
  await audit("retention_sweep", { scripts: ids.length, retentionMonths });
}

/**
 * Students who have left: remove names, MIS id and flags; keep marks under the
 * pseudonymous code so year-on-year trends still work.
 */
export async function anonymiseStudents(ids: string[]) {
  if (!ids.length) return 0;
  const res = await sql`
    UPDATE students SET first_name = NULL, last_name = NULL, mis_id = NULL, teacher = NULL,
      pp = false, send = false, eal = false, status = 'anonymised', anonymised_at = now(), updated_at = now()
    WHERE id = ANY(${ids})`;
  await sql`DELETE FROM script_pages WHERE script_id IN (SELECT id FROM scripts WHERE student_id = ANY(${ids}))`;
  await sql`DELETE FROM intervention_members WHERE student_id = ANY(${ids})`;
  await audit("anonymise_students", { count: res.count });
  return res.count;
}

/** Right to erasure: delete a student and everything about them. */
export async function eraseStudent(id: string) {
  await sql`DELETE FROM scripts WHERE student_id = ${id}`;
  await sql`DELETE FROM students WHERE id = ${id}`;
  await audit("erase_student", { id });
}
