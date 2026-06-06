"use client";

// Job Spec Editor — two-panel "edit + live A4 preview" experience.
//
//  - Edit INPUTS: "Edit answers" returns to the wizard pre-filled to regenerate.
//  - Edit OUTPUT: one clean textarea per section (one bullet per line), each
//    with a "Regenerate" AI button, a "new page" toggle and a delete button.
//  - Contents nav to jump between sections.
//  - White-label toggle (drops Aaron Wallis branding).
//  - DiSC bar chart in the person spec.
//  - Export to PDF (jsPDF + html2canvas), Word (.doc) and Print.

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  FileDown,
  FileText,
  List,
  Loader2,
  Pencil,
  Phone,
  RotateCcw,
  SeparatorHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import type { GeneratedJobSpec } from "@/lib/job-spec-schema";
import type { JobSpecFormData } from "@/components/job-spec-form";
import type { SpecSection } from "@/lib/job-spec-prompts";
import {
  deriveDiscProfile,
  type Disc,
  type JobSpecAnswers,
} from "@/lib/job-spec-config";
import { downloadDoc, type DocSection } from "@/lib/job-spec-docx";

const PHONE = "01908 061 400";

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

const SECTIONS: {
  key: SpecSection;
  title: string;
  type: "prose" | "list";
  group: "job" | "person";
  placeholder?: string;
}[] = [
  { key: "openingStatement", title: "Opening Statement", type: "prose", group: "job" },
  { key: "roleOverview", title: "The Role", type: "prose", group: "job" },
  { key: "keyResponsibilities", title: "Key Responsibilities", type: "list", group: "job", placeholder: "Manage the end-to-end sales cycle from prospect to close" },
  { key: "experienceAndSkills", title: "Experience & Skills", type: "list", group: "job", placeholder: "5+ years B2B field sales experience" },
  { key: "desirable", title: "Desirable", type: "list", group: "job", placeholder: "Optional nice-to-have" },
  { key: "behaviouralSummary", title: "Behavioural Summary", type: "prose", group: "person" },
  { key: "discProfile", title: "DiSC Profile", type: "prose", group: "person" },
  { key: "keyBehaviours", title: "Key Behaviours", type: "list", group: "person", placeholder: "Resilient under pressure" },
  { key: "motivationalDrivers", title: "What Motivates Them", type: "list", group: "person", placeholder: "Uncapped commission and clear progression" },
  { key: "watchOuts", title: "Watch-Outs", type: "list", group: "person", placeholder: "Personality types that would struggle" },
];

const SECTION_HEADING: Record<SpecSection, string> = {
  openingStatement: "",
  roleOverview: "The Role",
  keyResponsibilities: "Key Responsibilities",
  experienceAndSkills: "Experience & Skills",
  desirable: "Desirable",
  behaviouralSummary: "Behavioural Profile",
  discProfile: "DiSC Profile",
  keyBehaviours: "Key Behaviours",
  motivationalDrivers: "What Motivates Them",
  watchOuts: "Watch-Outs",
};

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

const isListValue = (v: string | string[]): v is string[] => Array.isArray(v);

function slug(s: string): string {
  return (
    (s || "job-spec").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "job-spec"
  );
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
  const [branded, setBranded] = useState(true);
  const [hidden, setHidden] = useState<Set<SpecSection>>(new Set());
  const [breaks, setBreaks] = useState<Set<SpecSection>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [regenSection, setRegenSection] = useState<SpecSection | null>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const disc = useMemo(
    () => deriveDiscProfile(answers as unknown as JobSpecAnswers),
    [answers]
  );

  const update = <K extends keyof EditableSpec>(
    key: K,
    value: EditableSpec[K]
  ) => setData((d) => ({ ...d, [key]: value }));

  const toggleIn = (
    setFn: React.Dispatch<React.SetStateAction<Set<SpecSection>>>,
    key: SpecSection
  ) =>
    setFn((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  // ── PDF download ───────────────────────────────────────────────────────
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
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = a4HeightPx;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, yOffset, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
          const img = sliceCanvas.toDataURL("image/jpeg", 0.95);
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

  const handleWord = () => {
    const sections: DocSection[] = SECTIONS.filter(
      (s) => !hidden.has(s.key)
    ).map((s) => {
      const value = data[s.key];
      return {
        heading: SECTION_HEADING[s.key] || s.title,
        type: s.type,
        prose: isListValue(value) ? undefined : value,
        items: isListValue(value) ? value : undefined,
      };
    });
    downloadDoc({
      jobTitle: data.jobTitle,
      companyName: data.companyName,
      preparedBy: data.preparedBy,
      preparedDate: data.preparedDate,
      openingStatement: hidden.has("openingStatement") ? "" : data.openingStatement,
      sections: sections.filter((s) => s.heading !== ""),
      branded,
      phone: PHONE,
    });
  };

  const handlePrint = () => {
    const prev = document.title;
    document.title = `${slug(data.jobTitle)}-job-spec`;
    window.print();
    setTimeout(() => {
      document.title = prev;
    }, 1500);
  };

  const visibleSections = SECTIONS.filter((s) => !hidden.has(s.key));
  const removedSections = SECTIONS.filter((s) => hidden.has(s.key));

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col print:hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1a3668]">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <span className="hidden sm:inline text-base font-semibold text-[#1a3668]">
              Job Spec Editor
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={onEditAnswers} className="text-xs gap-1.5" title="Change your inputs and regenerate">
              <Pencil className="h-3.5 w-3.5" /> Edit answers
            </Button>
            <Button variant="outline" size="sm" onClick={onRestart} className="text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Start over
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBranded((b) => !b)}
              className={`text-xs gap-1.5 ${branded ? "" : "border-[#df2681]/40 text-[#df2681]"}`}
              title="Toggle Aaron Wallis branding on the document"
            >
              <Tag className="h-3.5 w-3.5" />
              {branded ? "White-label" : "AW branding"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleWord} className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Word
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> Print
            </Button>
            <Button onClick={handleDownload} disabled={downloading} className="bg-[#df2681] hover:bg-[#c01f6e] text-white gap-2" size="sm">
              {downloading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><FileDown className="h-4 w-4" /> Download PDF</>
              )}
            </Button>
          </div>
        </div>

        {/* Consultant CTA */}
        <a
          href={`tel:${PHONE.replace(/\s/g, "")}`}
          className="flex items-center justify-center gap-2 bg-[#1a3668] text-white text-xs sm:text-sm py-2 px-4 hover:bg-[#15294f] transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          <span>
            Need help hiring? Speak to an Aaron Wallis consultant —{" "}
            <strong>{PHONE}</strong>
          </span>
        </a>

        {/* Two-panel layout */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* LEFT: editable form */}
          <div ref={panelRef} className="w-full lg:w-[470px] shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            {/* Contents nav */}
            <div className="px-5 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                <List className="h-3.5 w-3.5" /> Contents
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => scrollTo("edit-heading")} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                  Heading
                </button>
                {visibleSections.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => scrollTo(`edit-${s.key}`)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs hint */}
            <div className="px-5 py-3 bg-pink-50/60 border-b border-pink-100 text-[11px] text-gray-600 leading-relaxed">
              Want to change the role itself?{" "}
              <button onClick={onEditAnswers} className="font-semibold text-[#df2681] underline underline-offset-2">
                Edit your answers
              </button>{" "}
              to regenerate from your brief. Or fine-tune any section below.
            </div>

            {/* Heading fields */}
            <div id="edit-heading" className="px-5 py-4 border-b border-gray-100 space-y-3 scroll-mt-16">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1a3668]">Heading</h3>
              <Field label="Job Title">
                <Input value={data.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} className="h-9" />
              </Field>
              <Field label="Company Name">
                <Input value={data.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="e.g. Aaron Wallis" className="h-9" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date">
                  <Input value={data.preparedDate} onChange={(e) => update("preparedDate", e.target.value)} className="h-9" />
                </Field>
                <Field label="Prepared by">
                  <Input value={data.preparedBy} onChange={(e) => update("preparedBy", e.target.value)} className="h-9" />
                </Field>
              </div>
            </div>

            {/* Output sections */}
            {visibleSections.map((s) => (
              <SectionEditor
                key={s.key}
                id={`edit-${s.key}`}
                title={s.title}
                type={s.type}
                placeholder={s.placeholder}
                value={data[s.key]}
                onChange={(v) => update(s.key, v as EditableSpec[typeof s.key])}
                onRegenerate={() => regenerate(s.key)}
                regenerating={regenSection === s.key}
                disabled={regenSection !== null}
                pageBreak={breaks.has(s.key)}
                onTogglePageBreak={() => toggleIn(setBreaks, s.key)}
                onDelete={() => toggleIn(setHidden, s.key)}
              />
            ))}

            {/* Removed sections */}
            {removedSections.length > 0 && (
              <div className="px-5 py-4 space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Removed sections
                </h3>
                {removedSections.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => toggleIn(setHidden, s.key)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#df2681]"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Restore “{s.title}”
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: live A4 preview */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 bg-gray-100">
            <div ref={previewWrapperRef}>
              <SpecPreview
                data={data}
                branded={branded}
                hidden={hidden}
                breaks={breaks}
                disc={disc}
                phone={PHONE}
              />
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              Live preview — click &ldquo;Download PDF&rdquo; to export
            </p>
          </div>
        </div>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block">
        <SpecPreview data={data} branded={branded} hidden={hidden} breaks={breaks} disc={disc} phone={PHONE} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Section editor
// ---------------------------------------------------------------------------
function SectionEditor({
  id,
  title,
  type,
  value,
  placeholder,
  onChange,
  onRegenerate,
  regenerating,
  disabled,
  pageBreak,
  onTogglePageBreak,
  onDelete,
}: {
  id: string;
  title: string;
  type: "prose" | "list";
  value: string | string[];
  placeholder?: string;
  onChange: (value: string | string[]) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  disabled: boolean;
  pageBreak: boolean;
  onTogglePageBreak: () => void;
  onDelete: () => void;
}) {
  const isList = type === "list";
  const text = isList ? (value as string[]).join("\n") : (value as string);

  return (
    <div id={id} className="px-5 py-4 border-b border-gray-100 space-y-2 scroll-mt-16">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1a3668]">{title}</h3>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onTogglePageBreak}
            title="Start this section on a new page"
            className={`flex items-center ${pageBreak ? "text-[#df2681]" : "text-gray-300 hover:text-gray-500"}`}
          >
            <SeparatorHorizontal className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={disabled}
            title="Regenerate this section with AI"
            className="flex items-center gap-1 text-[11px] font-semibold text-[#df2681] hover:text-[#c01f6e] disabled:opacity-40"
          >
            {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {regenerating ? "Writing…" : "Regenerate"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Remove this section"
            className="text-gray-300 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {pageBreak && (
        <p className="text-[10px] text-[#df2681] font-medium">↧ Starts on a new page</p>
      )}
      {isList && <p className="text-[10px] text-gray-400">One item per line</p>}
      <Textarea
        value={text}
        onChange={(e) => onChange(isList ? e.target.value.split("\n") : e.target.value)}
        placeholder={placeholder}
        rows={isList ? Math.max(4, (value as string[]).length + 1) : 4}
        className="text-sm"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Live A4 preview — paginated, branded/white-label, with DiSC chart
// ---------------------------------------------------------------------------
function SpecPreview({
  data,
  branded,
  hidden,
  breaks,
  disc,
  phone,
}: {
  data: EditableSpec;
  branded: boolean;
  hidden: Set<SpecSection>;
  breaks: Set<SpecSection>;
  disc: ReturnType<typeof deriveDiscProfile>;
  phone: string;
}) {
  const nonEmpty = (arr: string[]) => arr.filter((s) => s.trim().length > 0);

  // Build the ordered, visible content units.
  type Unit = { key: SpecSection; group: "job" | "person"; node: React.ReactNode };
  const units: Unit[] = [];

  const pushIf = (key: SpecSection, group: "job" | "person", node: React.ReactNode | null) => {
    if (hidden.has(key) || node === null) return;
    units.push({ key, group, node });
  };

  pushIf(
    "openingStatement",
    "job",
    data.openingStatement.trim() ? <Paragraph key="op">{data.openingStatement}</Paragraph> : null
  );
  pushIf("roleOverview", "job", data.roleOverview.trim() ? (
    <div key="ro"><SectionHeading>The Role</SectionHeading><Paragraph>{data.roleOverview}</Paragraph></div>
  ) : null);
  pushIf("keyResponsibilities", "job", nonEmpty(data.keyResponsibilities).length ? (
    <div key="kr"><SectionHeading>Key Responsibilities</SectionHeading><Bullets items={nonEmpty(data.keyResponsibilities)} /></div>
  ) : null);
  pushIf("experienceAndSkills", "job", nonEmpty(data.experienceAndSkills).length ? (
    <div key="es"><SectionHeading>Experience &amp; Skills</SectionHeading><Bullets items={nonEmpty(data.experienceAndSkills)} /></div>
  ) : null);
  pushIf("desirable", "job", nonEmpty(data.desirable).length ? (
    <div key="de"><SectionHeading>Desirable</SectionHeading><Bullets items={nonEmpty(data.desirable)} /></div>
  ) : null);
  pushIf("behaviouralSummary", "person", (
    <div key="bs">
      <SectionHeading>Behavioural Profile</SectionHeading>
      <Paragraph>{data.behaviouralSummary}</Paragraph>
      <DiscChart disc={disc} />
    </div>
  ));
  pushIf("discProfile", "person", data.discProfile.trim() ? (
    <div key="dp" style={{ background: "#fdf2f8", border: "1px solid #fce7f3", borderRadius: "3mm", padding: "3mm 4mm", margin: "2mm 0 5mm 0" }}>
      <p style={{ margin: 0, fontSize: "10px", lineHeight: 1.5 }}>
        <strong style={{ color: "#1a3668" }}>DiSC fit: </strong>{data.discProfile}
      </p>
    </div>
  ) : null);
  pushIf("keyBehaviours", "person", nonEmpty(data.keyBehaviours).length ? (
    <div key="kb"><SectionHeading>Key Behaviours</SectionHeading><Bullets items={nonEmpty(data.keyBehaviours)} /></div>
  ) : null);
  pushIf("motivationalDrivers", "person", nonEmpty(data.motivationalDrivers).length ? (
    <div key="md"><SectionHeading>What Motivates Them</SectionHeading><Bullets items={nonEmpty(data.motivationalDrivers)} /></div>
  ) : null);
  pushIf("watchOuts", "person", nonEmpty(data.watchOuts).length ? (
    <div key="wo"><SectionHeading>Watch-Outs</SectionHeading><Bullets items={nonEmpty(data.watchOuts)} /></div>
  ) : null);

  // First visible person-spec unit gets the "Person Specification" divider.
  const firstPersonKey = units.find((u) => u.group === "person")?.key;

  // Paginate by page-break markers.
  const pages: Unit[][] = [];
  let current: Unit[] = [];
  for (const unit of units) {
    if (breaks.has(unit.key) && current.length > 0) {
      pages.push(current);
      current = [];
    }
    current.push(unit);
  }
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);

  return (
    <>
      {pages.map((pageUnits, pIdx) => (
        <div
          key={pIdx}
          className="spec-page bg-white shadow-md mx-auto mb-6 print:shadow-none print:mb-0"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "0 14mm 12mm",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#2D2D2D",
            position: "relative",
          }}
        >
          {/* Header (repeated each page) */}
          {branded ? (
            <>
              <div style={{ margin: "0 -14mm" }}>
                <div style={{ background: "#1a3668", height: "7mm" }} />
                <div style={{ background: "#df2681", height: "2.5px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "4mm", marginBottom: "4mm", paddingBottom: "2mm", borderBottom: "2px solid #1a3668" }}>
                <Image src="/aaron-wallis-logo.png" alt="Aaron Wallis" width={130} height={42} style={{ height: "10mm", width: "auto", objectFit: "contain" }} unoptimized />
                <span style={{ color: "#df2681", fontSize: "9px", fontWeight: "bold", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Job Specification
                </span>
              </div>
            </>
          ) : (
            <div style={{ margin: "0 -14mm 4mm", borderBottom: "2px solid #1a3668" }}>
              <div style={{ background: "#1a3668", height: "4mm" }} />
            </div>
          )}

          {/* Title block — first page only */}
          {pIdx === 0 && (
            <>
              <h1 style={{ color: "#1a3668", fontSize: "20px", fontWeight: 700, margin: "0 0 1mm 0", lineHeight: 1.2 }}>
                {data.jobTitle || "Job Title"}
              </h1>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "4mm", flexWrap: "wrap", marginBottom: "5mm" }}>
                <span style={{ fontSize: "11px", color: "#555" }}>{data.companyName || "—"}</span>
                <span style={{ fontSize: "9px", color: "#9ca3af" }}>
                  {data.preparedBy ? `Prepared by ${data.preparedBy}` : ""}
                  {data.preparedBy && data.preparedDate ? " · " : ""}
                  {data.preparedDate}
                </span>
              </div>
            </>
          )}

          {/* Content units */}
          {pageUnits.map((unit) => (
            <div key={unit.key}>
              {unit.key === firstPersonKey && <PersonSpecDivider />}
              {unit.node}
            </div>
          ))}

          {/* Footer — last page only */}
          {pIdx === pages.length - 1 && (
            <div style={{ marginTop: "8mm", paddingTop: "3mm", borderTop: "1px solid #e5e7eb" }}>
              {branded && (
                <p style={{ fontSize: "9px", color: "#1a3668", fontWeight: 700, margin: "0 0 2mm 0" }}>
                  Need help hiring? Speak to an Aaron Wallis consultant on {phone}.
                </p>
              )}
              {branded && (
                <p style={{ fontSize: "8px", color: "#9ca3af", lineHeight: 1.4, margin: 0 }}>
                  Aaron Wallis and Aaron Wallis Sales Recruitment are trading names of Aaron Wallis Recruitment and Training Limited (Registered in the UK, No. 6356563). This specification is generated as a starting point — please review for accuracy before publishing.
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function PersonSpecDivider() {
  return (
    <div style={{ marginTop: "8mm", marginBottom: "4mm", paddingTop: "4mm", borderTop: "1px solid #e5e7eb" }}>
      <span style={{ display: "inline-block", fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#df2681" }}>
        Person Specification
      </span>
    </div>
  );
}

// DiSC bar chart — normalised so the strongest trait fills the bar.
function DiscChart({ disc }: { disc: ReturnType<typeof deriveDiscProfile> }) {
  const meta: { key: Disc; label: string; color: string }[] = [
    { key: "D", label: "Dominance", color: "#1a3668" },
    { key: "i", label: "Influence", color: "#df2681" },
    { key: "S", label: "Steadiness", color: "#0d9488" },
    { key: "C", label: "Conscientiousness", color: "#d97706" },
  ];
  const vals = meta.map((m) => disc.scores[m.key]);
  const min = Math.min(...vals, 0);
  const shifted = vals.map((v) => v - min);
  const max = Math.max(...shifted, 1);

  return (
    <div style={{ margin: "1mm 0 5mm 0" }}>
      <p style={{ fontSize: "8px", fontWeight: 700, color: "#1a3668", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2mm 0" }}>
        Ideal DiSC profile · {disc.type}
      </p>
      {meta.map((m, i) => {
        const pct = Math.max(6, Math.round((shifted[i] / max) * 100));
        return (
          <div key={m.key} style={{ display: "flex", alignItems: "center", gap: "2mm", marginBottom: "1.5mm" }}>
            <span style={{ width: "32mm", fontSize: "9px", color: "#374151", flexShrink: 0 }}>
              <strong style={{ color: m.color }}>{m.key}</strong> · {m.label}
            </span>
            <span style={{ flex: 1, background: "#eef1f5", borderRadius: "2px", height: "3.5mm", overflow: "hidden" }}>
              <span style={{ display: "block", width: `${pct}%`, height: "100%", background: m.color, borderRadius: "2px" }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ color: "#1a3668", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "5mm 0 2mm 0", paddingBottom: "1mm", borderBottom: "1px solid #1a3668" }}>
      {children}
    </h2>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  const text = String(children ?? "").trim();
  if (!text) return null;
  return (
    <p style={{ fontSize: "10.5px", lineHeight: 1.55, margin: "0 0 3mm 0", color: "#2D2D2D" }}>{text}</p>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 3mm 0" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: "3mm", fontSize: "10.5px", lineHeight: 1.5, marginBottom: "1.5mm" }}>
          <span style={{ flexShrink: 0, marginTop: "1.6mm", width: "1.6mm", height: "1.6mm", borderRadius: "50%", background: "#df2681" }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
