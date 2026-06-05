"use client";

// Job Spec Editor — two-panel "edit + live A4 preview" experience.
//
// Two ways to edit:
//  1. Edit the INPUTS — "Edit answers" returns to the wizard pre-filled so you
//     can change the brief and regenerate the whole spec.
//  2. Edit the OUTPUT — each section is a single clean textarea (one bullet per
//     line for lists), with a per-section "Regenerate" AI button.
//
// The right-hand .spec-page is captured by jsPDF + html2canvas on download, and
// the same template drives window.print() for the "Print to PDF" path.

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  FileDown,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import type { GeneratedJobSpec } from "@/lib/job-spec-schema";
import type { JobSpecFormData } from "@/components/job-spec-form";
import type { SpecSection } from "@/lib/job-spec-prompts";

// ---------------------------------------------------------------------------
// Editable model
// ---------------------------------------------------------------------------
interface EditableSpec {
  jobTitle: string;
  companyName: string;
  preparedDate: string;
  preparedBy: string;
  openingStatement: string;
  roleOverview: string;
  keyResponsibilities: string[];
  experienceAndSkills: string[];
  desirable: string[];
  behaviouralSummary: string;
  discProfile: string;
  keyBehaviours: string[];
  motivationalDrivers: string[];
  watchOuts: string[];
}

interface JobSpecEditorProps {
  spec: GeneratedJobSpec;
  answers: JobSpecFormData;
  onRestart: () => void;
  onEditAnswers: () => void;
}

// Render order + metadata for the editable output sections. Keys map 1:1 to
// both EditableSpec and the server's SpecSection union.
const SECTIONS: {
  key: SpecSection;
  title: string;
  type: "prose" | "list";
  placeholder?: string;
}[] = [
  { key: "openingStatement", title: "Opening Statement", type: "prose" },
  { key: "roleOverview", title: "The Role", type: "prose" },
  {
    key: "keyResponsibilities",
    title: "Key Responsibilities",
    type: "list",
    placeholder: "Manage the end-to-end sales cycle from prospect to close",
  },
  {
    key: "experienceAndSkills",
    title: "Experience & Skills",
    type: "list",
    placeholder: "5+ years B2B field sales experience",
  },
  { key: "desirable", title: "Desirable", type: "list", placeholder: "Optional nice-to-have" },
  { key: "behaviouralSummary", title: "Behavioural Summary", type: "prose" },
  { key: "discProfile", title: "DiSC Profile", type: "prose" },
  { key: "keyBehaviours", title: "Key Behaviours", type: "list", placeholder: "Resilient under pressure" },
  {
    key: "motivationalDrivers",
    title: "What Motivates Them",
    type: "list",
    placeholder: "Uncapped commission and clear progression",
  },
  { key: "watchOuts", title: "Watch-Outs", type: "list", placeholder: "Personality types that would struggle" },
];

// Strip protocol/"www."/TLD, then title-case → a sensible default company name.
function companyFromUrl(url: string): string {
  if (!url) return "";
  const host = url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[\/?#]/)[0];
  const label = host.split(".")[0];
  return label.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function initFromSpec(
  spec: GeneratedJobSpec,
  answers: JobSpecFormData
): EditableSpec {
  return {
    jobTitle: spec.job_spec.job_title || answers.jobTitle,
    companyName: companyFromUrl(answers.companyUrl),
    preparedDate: new Date().toLocaleDateString("en-GB"),
    preparedBy: answers.name,
    openingStatement: spec.opening_statement ?? "",
    roleOverview: spec.job_spec.role_overview ?? "",
    keyResponsibilities: [...(spec.job_spec.key_responsibilities ?? [])],
    experienceAndSkills: [...(spec.job_spec.experience_and_skills ?? [])],
    desirable: [...(spec.job_spec.desirable ?? [])],
    behaviouralSummary: spec.person_spec.behavioural_summary ?? "",
    discProfile: spec.person_spec.disc_profile ?? "",
    keyBehaviours: [...(spec.person_spec.key_behaviours ?? [])],
    motivationalDrivers: [...(spec.person_spec.motivational_drivers ?? [])],
    watchOuts: [...(spec.person_spec.watch_outs ?? [])],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function JobSpecEditor({
  spec,
  answers,
  onRestart,
  onEditAnswers,
}: JobSpecEditorProps) {
  const [data, setData] = useState<EditableSpec>(() =>
    initFromSpec(spec, answers)
  );
  const [downloading, setDownloading] = useState(false);
  const [regenSection, setRegenSection] = useState<SpecSection | null>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);

  const update = <K extends keyof EditableSpec>(
    key: K,
    value: EditableSpec[K]
  ) => setData((d) => ({ ...d, [key]: value }));

  // ── Per-section AI regeneration ────────────────────────────────────────
  const regenerate = async (section: SpecSection) => {
    setRegenSection(section);
    try {
      const res = await fetch("/api/regenerate-job-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, section }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error ?? "Regeneration failed");
      }
      const json: { content?: string; items?: string[] } = await res.json();
      setData((d) => ({
        ...d,
        [section]: json.items ?? json.content ?? d[section],
      }));
    } catch (err) {
      console.error("[job-spec] regenerate failed:", err);
      alert("Sorry — couldn't regenerate that section. Please try again.");
    } finally {
      setRegenSection(null);
    }
  };

  // ── PDF download (mirrors the CV generator's pipeline) ─────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const wrapper = previewWrapperRef.current;
      if (!wrapper) return;

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const pages = wrapper.querySelectorAll<HTMLElement>(".spec-page");
      const pdfWidthMm = 210;
      const pdfHeightMm = 297;
      let pdf: InstanceType<typeof jsPDF> | null = null;
      let firstPage = true;

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          allowTaint: true,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const a4HeightPx = Math.round(canvas.width * (pdfHeightMm / pdfWidthMm));
        let yOffset = 0;

        while (yOffset < canvas.height) {
          const slicePx = Math.min(a4HeightPx, canvas.height - yOffset);
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = a4HeightPx;
          const ctx = slice.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(
            canvas,
            0,
            yOffset,
            canvas.width,
            slicePx,
            0,
            0,
            canvas.width,
            slicePx
          );

          const img = slice.toDataURL("image/jpeg", 0.95);
          if (firstPage) {
            pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
            firstPage = false;
          } else {
            pdf!.addPage("a4", "p");
          }
          pdf!.addImage(img, "JPEG", 0, 0, pdfWidthMm, pdfHeightMm);
          yOffset += a4HeightPx;
        }
      }

      pdf!.save(`${slug(data.jobTitle)}-job-spec.pdf`);
    } catch (err) {
      console.error("[job-spec] PDF download failed:", err);
      alert("Sorry — PDF download failed. Please try again or use Print to PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const prev = document.title;
    document.title = `${slug(data.jobTitle)}-job-spec`;
    window.print();
    setTimeout(() => {
      document.title = prev;
    }, 1500);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col print:hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1a3668]"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <span className="hidden sm:inline text-base font-semibold text-[#1a3668]">
              Job Spec Editor
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEditAnswers}
              className="text-xs gap-1.5"
              title="Go back to the questionnaire to change your inputs and regenerate"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit answers
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRestart}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Start over
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5"
            >
              <FileDown className="h-3.5 w-3.5" />
              Print to PDF
            </Button>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="bg-[#df2681] hover:bg-[#c01f6e] text-white gap-2"
              size="sm"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" /> Download PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* LEFT: editable form */}
          <div className="w-full lg:w-[460px] shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            {/* Inputs hint */}
            <div className="px-5 py-3 bg-pink-50/60 border-b border-pink-100 text-[11px] text-gray-600 leading-relaxed">
              Want to change the role itself?{" "}
              <button
                onClick={onEditAnswers}
                className="font-semibold text-[#df2681] underline underline-offset-2"
              >
                Edit your answers
              </button>{" "}
              to regenerate from your brief. Or fine-tune the wording of any
              section below.
            </div>

            {/* Heading fields */}
            <div className="px-5 py-4 border-b border-gray-100 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1a3668]">
                Heading
              </h3>
              <Field label="Job Title">
                <Input
                  value={data.jobTitle}
                  onChange={(e) => update("jobTitle", e.target.value)}
                  className="h-9"
                />
              </Field>
              <Field label="Company Name">
                <Input
                  value={data.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                  placeholder="e.g. Aaron Wallis"
                  className="h-9"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date">
                  <Input
                    value={data.preparedDate}
                    onChange={(e) => update("preparedDate", e.target.value)}
                    className="h-9"
                  />
                </Field>
                <Field label="Prepared by">
                  <Input
                    value={data.preparedBy}
                    onChange={(e) => update("preparedBy", e.target.value)}
                    className="h-9"
                  />
                </Field>
              </div>
            </div>

            {/* Output sections */}
            {SECTIONS.map((s) => (
              <SectionEditor
                key={s.key}
                title={s.title}
                type={s.type}
                placeholder={s.placeholder}
                value={data[s.key]}
                onChange={(v) => update(s.key, v as EditableSpec[typeof s.key])}
                onRegenerate={() => regenerate(s.key)}
                regenerating={regenSection === s.key}
                disabled={regenSection !== null}
              />
            ))}
          </div>

          {/* RIGHT: live A4 preview */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 bg-gray-100">
            <div ref={previewWrapperRef}>
              <SpecPreview data={data} />
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              Live preview — click &ldquo;Download PDF&rdquo; to export
            </p>
          </div>
        </div>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block">
        <SpecPreview data={data} />
      </div>
    </>
  );
}

function slug(s: string): string {
  return (
    (s || "job-spec").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "job-spec"
  );
}

// ---------------------------------------------------------------------------
// Section editor — one textarea per section (one bullet per line for lists)
// ---------------------------------------------------------------------------
function SectionEditor({
  title,
  type,
  value,
  placeholder,
  onChange,
  onRegenerate,
  regenerating,
  disabled,
}: {
  title: string;
  type: "prose" | "list";
  value: string | string[];
  placeholder?: string;
  onChange: (value: string | string[]) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  disabled: boolean;
}) {
  const isList = type === "list";
  const text = isList ? (value as string[]).join("\n") : (value as string);

  return (
    <div className="px-5 py-4 border-b border-gray-100 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1a3668]">
          {title}
        </h3>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={disabled}
          title="Regenerate this section with AI"
          className="flex items-center gap-1 text-[11px] font-semibold text-[#df2681] hover:text-[#c01f6e] disabled:opacity-40"
        >
          {regenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {regenerating ? "Writing…" : "Regenerate"}
        </button>
      </div>
      {isList && (
        <p className="text-[10px] text-gray-400">One item per line</p>
      )}
      <Textarea
        value={text}
        onChange={(e) =>
          onChange(isList ? e.target.value.split("\n") : e.target.value)
        }
        placeholder={placeholder}
        rows={isList ? Math.max(4, (value as string[]).length + 1) : 4}
        className="text-sm"
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Live A4 preview — inline styles for consistent html2canvas + print output
// ---------------------------------------------------------------------------
function SpecPreview({ data }: { data: EditableSpec }) {
  const nonEmpty = (arr: string[]) => arr.filter((s) => s.trim().length > 0);
  return (
    <div
      className="spec-page bg-white shadow-md mx-auto print:shadow-none"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "0 14mm 12mm",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#2D2D2D",
        position: "relative",
      }}
    >
      {/* Brand strip */}
      <div style={{ margin: "0 -14mm" }}>
        <div style={{ background: "#1a3668", height: "7mm" }} />
        <div style={{ background: "#df2681", height: "2.5px" }} />
      </div>

      {/* Logo row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: "4mm",
          marginBottom: "4mm",
          paddingBottom: "2mm",
          borderBottom: "2px solid #1a3668",
        }}
      >
        <Image
          src="/aaron-wallis-logo.png"
          alt="Aaron Wallis"
          width={130}
          height={42}
          style={{ height: "10mm", width: "auto", objectFit: "contain" }}
          unoptimized
        />
        <span
          style={{
            color: "#df2681",
            fontSize: "9px",
            fontWeight: "bold",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Job Specification
        </span>
      </div>

      {/* Title block */}
      <h1
        style={{
          color: "#1a3668",
          fontSize: "20px",
          fontWeight: 700,
          margin: "0 0 1mm 0",
          lineHeight: 1.2,
        }}
      >
        {data.jobTitle || "Job Title"}
      </h1>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "4mm",
          flexWrap: "wrap",
          marginBottom: "5mm",
        }}
      >
        <span style={{ fontSize: "11px", color: "#555" }}>
          {data.companyName || "—"}
        </span>
        <span style={{ fontSize: "9px", color: "#9ca3af" }}>
          {data.preparedBy ? `Prepared by ${data.preparedBy}` : ""}
          {data.preparedBy && data.preparedDate ? " · " : ""}
          {data.preparedDate}
        </span>
      </div>

      {/* Opening statement */}
      {data.openingStatement.trim() && (
        <p
          style={{
            fontSize: "10.5px",
            lineHeight: 1.55,
            margin: "0 0 5mm 0",
            color: "#2D2D2D",
          }}
        >
          {data.openingStatement}
        </p>
      )}

      <SectionHeading>The Role</SectionHeading>
      <Paragraph>{data.roleOverview}</Paragraph>

      <SectionHeading>Key Responsibilities</SectionHeading>
      <Bullets items={nonEmpty(data.keyResponsibilities)} />

      <SectionHeading>Experience &amp; Skills</SectionHeading>
      <Bullets items={nonEmpty(data.experienceAndSkills)} />

      {nonEmpty(data.desirable).length > 0 && (
        <>
          <SectionHeading>Desirable</SectionHeading>
          <Bullets items={nonEmpty(data.desirable)} />
        </>
      )}

      {/* Person spec divider */}
      <div
        style={{
          marginTop: "8mm",
          marginBottom: "4mm",
          paddingTop: "4mm",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "8px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#df2681",
          }}
        >
          Person Specification
        </span>
      </div>

      <SectionHeading>Behavioural Profile</SectionHeading>
      <Paragraph>{data.behaviouralSummary}</Paragraph>

      {data.discProfile.trim() && (
        <div
          style={{
            background: "#fdf2f8",
            border: "1px solid #fce7f3",
            borderRadius: "3mm",
            padding: "3mm 4mm",
            margin: "2mm 0 5mm 0",
          }}
        >
          <p style={{ margin: 0, fontSize: "10px", lineHeight: 1.5 }}>
            <strong style={{ color: "#1a3668" }}>DiSC fit: </strong>
            {data.discProfile}
          </p>
        </div>
      )}

      <SectionHeading>Key Behaviours</SectionHeading>
      <Bullets items={nonEmpty(data.keyBehaviours)} />

      <SectionHeading>What Motivates Them</SectionHeading>
      <Bullets items={nonEmpty(data.motivationalDrivers)} />

      {nonEmpty(data.watchOuts).length > 0 && (
        <>
          <SectionHeading>Watch-Outs</SectionHeading>
          <Bullets items={nonEmpty(data.watchOuts)} />
        </>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "8mm",
          paddingTop: "3mm",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <p
          style={{
            fontSize: "8px",
            color: "#9ca3af",
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          Aaron Wallis and Aaron Wallis Sales Recruitment are trading names of
          Aaron Wallis Recruitment and Training Limited (Registered in the UK,
          No. 6356563). This specification is generated as a starting point —
          please review for accuracy before publishing.
        </p>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        color: "#1a3668",
        fontSize: "12px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "5mm 0 2mm 0",
        paddingBottom: "1mm",
        borderBottom: "1px solid #1a3668",
      }}
    >
      {children}
    </h2>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  const text = String(children ?? "").trim();
  if (!text) return null;
  return (
    <p
      style={{
        fontSize: "10.5px",
        lineHeight: 1.55,
        margin: "0 0 3mm 0",
        color: "#2D2D2D",
      }}
    >
      {text}
    </p>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p
        style={{
          fontSize: "10px",
          color: "#9ca3af",
          fontStyle: "italic",
          margin: "0 0 3mm 0",
        }}
      >
        (none)
      </p>
    );
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 3mm 0" }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            gap: "3mm",
            fontSize: "10.5px",
            lineHeight: 1.5,
            marginBottom: "1.5mm",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              marginTop: "1.6mm",
              width: "1.6mm",
              height: "1.6mm",
              borderRadius: "50%",
              background: "#df2681",
            }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
