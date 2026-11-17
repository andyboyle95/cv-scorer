import { getSettings, BOUNDARY_PRESETS } from "@/lib/settings";
import { sql } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui";
import { SettingsForm } from "./settings-form";
import { ActionButton } from "@/components/action-button";
import { aiMode, MODEL } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const settings = await getSettings();
  const [c] = await sql<{ leavers: number; images: number }[]>`
    SELECT (SELECT count(*)::int FROM students WHERE status = 'left') AS leavers,
           (SELECT count(*)::int FROM script_pages) AS images`;
  const log = await sql<{ at: Date; action: string }[]>`SELECT at, action FROM audit_log ORDER BY at DESC LIMIT 25`;
  return (
    <div className="max-w-4xl">
      <PageHeader title="Settings" lead={`Marking with ${aiMode() === "live" ? MODEL : "demo marks (no API key)"}.`} />
      <SettingsForm settings={settings} presets={BOUNDARY_PRESETS} />
      <Section title="Data protection">
        <div className="space-y-4 text-sm">
          <p>Scan images are deleted after {settings.retentionMonths} months; transcriptions and marks are kept. {c.images} page images are stored now.</p>
          <p>The AI never receives student names: only scans (without cover sheets) and pseudonymous codes. Each student page has a subject-access download and an erase button.</p>
          <div className="flex flex-wrap gap-3">
            <ActionButton path="/api/gdpr" body={{ action: "anonymise_leavers" }} confirm={`Anonymise ${c.leavers} leavers? Names, Bromcom IDs and flags are removed; marks stay for trends.`} done="Done">
              Anonymise {c.leavers} leaver{c.leavers === 1 ? "" : "s"}
            </ActionButton>
            <ActionButton path="/api/gdpr" body={{ action: "sweep" }} done="Done">Delete old scans now</ActionButton>
          </div>
        </div>
      </Section>
      <Section title="Recent activity">
        <ul className="text-sm text-muted">
          {log.map((l, i) => <li key={i} className="tabular">{new Date(l.at).toLocaleString("en-GB")} · {l.action.replace(/_/g, " ")}</li>)}
        </ul>
      </Section>
    </div>
  );
}
