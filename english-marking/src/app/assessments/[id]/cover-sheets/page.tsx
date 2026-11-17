import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { PrintButton } from "@/components/print-button";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CoverSheets({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ class?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [a] = await sql<{ id: string; title: string; year_group: number }[]>`SELECT id, title, year_group FROM assessments WHERE id = ${id}`;
  if (!a) notFound();
  const classes = await sql<{ class_code: string | null }[]>`
    SELECT DISTINCT class_code FROM students WHERE status = 'active' AND year_group = ${a.year_group} ORDER BY class_code`;
  const students = await sql<{ code: string; first_name: string | null; last_name: string | null; class_code: string | null }[]>`
    SELECT code, first_name, last_name, class_code FROM students
    WHERE status = 'active' AND year_group = ${a.year_group}
      ${sp.class ? sql`AND class_code = ${sp.class}` : sql``}
    ORDER BY class_code, last_name, first_name`;
  const sheets = await Promise.all(
    students.map(async (s) => ({ ...s, qr: await QRCode.toDataURL(`RL1|${a.id}|${s.code}`, { margin: 1, width: 360, errorCorrectionLevel: "M" }) })),
  );

  return (
    <div>
      <div className="no-print mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/assessments/${id}`} className="text-sm text-muted hover:text-ink">← {a.title}</Link>
          <h1 className="mt-1 text-2xl font-extrabold">Cover sheets</h1>
          <p className="text-muted">One per student. Students put it on top of their answer pages before scanning. Print single-sided.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form className="flex items-end gap-2">
            <select name="class" defaultValue={sp.class ?? ""} className="field" aria-label="Class">
              <option value="">All Year {a.year_group} ({students.length})</option>
              {classes.map((c) => c.class_code && <option key={c.class_code} value={c.class_code}>{c.class_code}</option>)}
            </select>
            <button className="btn-quiet">Show</button>
          </form>
          <PrintButton />
        </div>
      </div>
      {sheets.map((s) => (
        <article key={s.code} className="mx-auto mb-8 flex min-h-[26cm] max-w-[19cm] flex-col border border-line bg-white p-10 text-black print:mb-0 print:min-h-[27.7cm] print:border-0 print:p-0" style={{ breakAfter: "page" }}>
          <header className="flex items-baseline justify-between border-b-2 border-black pb-3">
            <span className="text-lg font-extrabold"><span className="font-initial text-3xl font-normal text-[#B3261E]">R</span>ed Letter</span>
            <span className="text-sm">{BRAND.school}</span>
          </header>
          <div className="mt-10">
            <p className="text-sm uppercase tracking-wider">Assessment</p>
            <p className="text-2xl font-bold">{a.title}</p>
          </div>
          <div className="mt-8">
            <p className="text-sm uppercase tracking-wider">Student</p>
            <p className="text-4xl font-extrabold">{[s.first_name, s.last_name].filter(Boolean).join(" ")}</p>
            <p className="text-xl">{s.class_code}</p>
          </div>
          <div className="mt-12 flex items-center gap-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.qr} alt={`QR code for ${s.code}`} className="h-56 w-56" />
            <div>
              <p className="text-sm uppercase tracking-wider">Your code</p>
              <p className="font-mono text-5xl font-bold tracking-[0.2em]">{s.code}</p>
              <p className="mt-4 max-w-xs text-sm">Write this code at the top of every answer page, in case pages get separated.</p>
            </div>
          </div>
          <ul className="mt-auto space-y-1 border-t border-black pt-4 text-sm">
            <li>Put this sheet on top of your answer pages. Do not write on it.</li>
            <li>Write the question number next to each answer.</li>
            <li>Write in black or blue pen so your work scans clearly.</li>
          </ul>
        </article>
      ))}
    </div>
  );
}
