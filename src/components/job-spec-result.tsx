"use client";

import { useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/ui/button";
import type { GeneratedJobSpec } from "@/lib/job-spec-schema";

interface JobSpecResultProps {
  spec: GeneratedJobSpec;
  onRestart: () => void;
}

export function JobSpecResult({ spec, onRestart }: JobSpecResultProps) {
  const [copied, setCopied] = useState(false);
  const { job_spec, person_spec } = spec;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(spec));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-[#1a3668]">
          {job_spec.job_title || "Your Job Spec"}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" /> Start again
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-[#E2E8F0] p-6 sm:p-10 space-y-8">
        {spec.opening_statement && (
          <p className="text-base leading-relaxed text-[#2D2D2D]">
            {spec.opening_statement}
          </p>
        )}

        <Section title="The Role">
          <p className="text-[#2D2D2D] leading-relaxed">
            {job_spec.role_overview}
          </p>
        </Section>

        <Section title="Key Responsibilities">
          <BulletList items={job_spec.key_responsibilities} />
        </Section>

        <Section title="Experience & Skills">
          <BulletList items={job_spec.experience_and_skills} />
        </Section>

        {job_spec.desirable.length > 0 && (
          <Section title="Desirable">
            <BulletList items={job_spec.desirable} />
          </Section>
        )}

        <div className="border-t border-gray-100 pt-8">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#df2681] mb-4">
            Person Specification
          </span>

          <Section title="Behavioural Profile">
            <p className="text-[#2D2D2D] leading-relaxed">
              {person_spec.behavioural_summary}
            </p>
            {person_spec.disc_profile && (
              <p className="text-sm text-gray-600 leading-relaxed mt-3 bg-pink-50 border border-pink-100 rounded-lg p-3">
                <strong className="text-[#1a3668]">DiSC fit: </strong>
                {person_spec.disc_profile}
              </p>
            )}
          </Section>

          <Section title="Key Behaviours">
            <BulletList items={person_spec.key_behaviours} />
          </Section>

          <Section title="What Motivates Them">
            <BulletList items={person_spec.motivational_drivers} />
          </Section>

          {person_spec.watch_outs.length > 0 && (
            <Section title="Watch-Outs">
              <BulletList items={person_spec.watch_outs} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 [&:not(:first-child)]:mt-6">
      <h2 className="text-lg font-semibold text-[#1a3668]">{title}</h2>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[#2D2D2D] leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#df2681] shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function toPlainText(spec: GeneratedJobSpec): string {
  const { job_spec, person_spec } = spec;
  const lines: string[] = [];
  lines.push(job_spec.job_title.toUpperCase());
  lines.push("");
  if (spec.opening_statement) {
    lines.push(spec.opening_statement, "");
  }
  lines.push("THE ROLE", job_spec.role_overview, "");
  lines.push("KEY RESPONSIBILITIES");
  job_spec.key_responsibilities.forEach((r) => lines.push(`• ${r}`));
  lines.push("", "EXPERIENCE & SKILLS");
  job_spec.experience_and_skills.forEach((r) => lines.push(`• ${r}`));
  if (job_spec.desirable.length) {
    lines.push("", "DESIRABLE");
    job_spec.desirable.forEach((r) => lines.push(`• ${r}`));
  }
  lines.push("", "PERSON SPECIFICATION", person_spec.behavioural_summary, "");
  if (person_spec.disc_profile) {
    lines.push(`DiSC fit: ${person_spec.disc_profile}`, "");
  }
  lines.push("KEY BEHAVIOURS");
  person_spec.key_behaviours.forEach((r) => lines.push(`• ${r}`));
  lines.push("", "WHAT MOTIVATES THEM");
  person_spec.motivational_drivers.forEach((r) => lines.push(`• ${r}`));
  if (person_spec.watch_outs.length) {
    lines.push("", "WATCH-OUTS");
    person_spec.watch_outs.forEach((r) => lines.push(`• ${r}`));
  }
  return lines.join("\n");
}
