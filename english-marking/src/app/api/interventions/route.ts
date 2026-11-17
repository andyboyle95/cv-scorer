import { sql, audit } from "@/lib/db";
import { handle, bad } from "@/lib/http";

type Row = { group: string; tutor?: string; student: string; start_date?: string };

/**
 * Import groups from the SLT list. Students are matched by MIS id, student code,
 * or name ("First Last" or "Last, First").
 */
export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as
    | { mode: "import"; rows: Row[]; yearGroup?: number }
    | { mode: "create"; name: string; tutor?: string; startDate?: string; yearGroup?: number; studentIds: string[] };

  if (b.mode === "create") {
    if (!b.name?.trim() || !b.studentIds?.length) throw bad("Name the group and add students.");
    const [g] = await sql<{ id: string }[]>`INSERT INTO intervention_groups (name, tutor, year_group, start_date, origin)
      VALUES (${b.name.trim()}, ${b.tutor ?? null}, ${b.yearGroup ?? null}, ${b.startDate || null}, 'suggested') RETURNING id`;
    for (const s of b.studentIds) await sql`INSERT INTO intervention_members (group_id, student_id) VALUES (${g.id}, ${s}) ON CONFLICT DO NOTHING`;
    await audit("intervention_create", { id: g.id });
    return { id: g.id };
  }

  const students = await sql<{ id: string; code: string; mis_id: string | null; first_name: string | null; last_name: string | null; year_group: number }[]>`
    SELECT id, code, mis_id, first_name, last_name, year_group FROM students WHERE status = 'active'`;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const index = new Map<string, string[]>();
  const add = (k: string, id: string) => k && (index.get(k) ?? index.set(k, []).get(k)!).push(id);
  for (const s of students) {
    if (b.yearGroup && s.year_group !== b.yearGroup) continue;
    add(norm(s.code), s.id);
    if (s.mis_id) add(norm(s.mis_id), s.id);
    add(norm(`${s.first_name}${s.last_name}`), s.id);
    add(norm(`${s.last_name}${s.first_name}`), s.id);
  }
  const unmatched: string[] = [];
  const ambiguous: string[] = [];
  const groups = new Map<string, { tutor?: string; start?: string; ids: Set<string> }>();
  for (const r of b.rows) {
    if (!r.group?.trim() || !r.student?.trim()) continue;
    const hits = index.get(norm(r.student)) ?? [];
    if (!hits.length) { unmatched.push(r.student); continue; }
    if (new Set(hits).size > 1) { ambiguous.push(r.student); continue; }
    const g = groups.get(r.group.trim()) ?? { tutor: r.tutor, start: r.start_date, ids: new Set() };
    g.ids.add(hits[0]);
    groups.set(r.group.trim(), g);
  }
  let created = 0;
  for (const [name, g] of groups) {
    const [row] = await sql<{ id: string }[]>`INSERT INTO intervention_groups (name, tutor, year_group, start_date, origin)
      VALUES (${name}, ${g.tutor || null}, ${b.yearGroup ?? null}, ${g.start || null}, 'imported') RETURNING id`;
    for (const id of g.ids) await sql`INSERT INTO intervention_members (group_id, student_id) VALUES (${row.id}, ${id}) ON CONFLICT DO NOTHING`;
    created++;
  }
  await audit("intervention_import", { created, unmatched: unmatched.length });
  return { created, unmatched, ambiguous };
});
