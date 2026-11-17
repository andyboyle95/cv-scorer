import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { Uploader } from "./uploader";

export const dynamic = "force-dynamic";

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a] = await sql<{ id: string; title: string; year_group: number }[]>`SELECT id, title, year_group FROM assessments WHERE id = ${id}`;
  if (!a) notFound();
  const students = await sql<{ id: string; code: string; first_name: string | null; last_name: string | null; class_code: string | null }[]>`
    SELECT id, code, first_name, last_name, class_code FROM students WHERE status = 'active' AND year_group = ${a.year_group}
    ORDER BY class_code, last_name, first_name`;
  return (
    <div>
      <PageHeader
        title="Upload scans"
        back={{ href: `/assessments/${id}`, label: a.title }}
        lead="Drop in one PDF per class from the photocopier, or photos of single scripts. Cover sheets are read here in your browser to split the pile by student; they are not uploaded."
      />
      <Uploader assessmentId={id} students={students.map((s) => ({ id: s.id, code: s.code, name: [s.first_name, s.last_name].filter(Boolean).join(" ") || s.code, classCode: s.class_code }))} />
    </div>
  );
}
