import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, lead, actions, back }: { title: string; lead?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm text-muted hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-muted">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, children, actions, id }: { title: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section className="mb-10" id={id}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function GapChip({ gap }: { gap: number | null | undefined }) {
  if (gap == null) return <span className="text-muted">-</span>;
  const cls = gap >= 2 ? "bg-bad-wash text-bad" : gap >= 1 ? "bg-warn-wash text-warn" : "bg-good-wash text-good";
  const text = gap <= 0 ? (gap === 0 ? "On target" : `+${Math.abs(gap).toFixed(1)}`) : `−${gap.toFixed(1)}`;
  return <span className={`chip tabular ${cls}`} title="Grades above (+) or below (−) target">{text}</span>;
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "bg-sunk text-muted",
    processing: "bg-warn-wash text-warn",
    marked: "bg-good-wash text-good",
    error: "bg-bad-wash text-bad",
    pending: "bg-sunk text-muted",
    ready: "bg-good-wash text-good",
  };
  const label: Record<string, string> = { queued: "Waiting", processing: "Marking", marked: "Marked", error: "Problem", pending: "Working", ready: "Ready" };
  return <span className={`chip ${map[status] ?? "bg-sunk text-muted"}`}>{label[status] ?? status}</span>;
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div>
      <div className="text-sm text-muted">{label}</div>
      <div className="tabular text-2xl font-extrabold">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="mb-6 rounded border border-warn bg-warn-wash px-4 py-3 text-sm text-ink">
      <strong>Demo mode.</strong> No AI key is set, so marks are placeholders. Add <code>ANTHROPIC_API_KEY</code> on Render to mark real scripts.
    </div>
  );
}

/** Horizontal bar used in tables (no chart library needed). */
export function Bar({ value, max = 100, tone = "ink" }: { value: number; max?: number; tone?: "ink" | "rubric" | "good" | "warn" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = { ink: "bg-ink", rubric: "bg-rubric", good: "bg-good", warn: "bg-warn" }[tone];
  return (
    <div className="h-2 w-full min-w-16 rounded-sm bg-sunk" aria-hidden>
      <div className={`h-2 rounded-sm ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
