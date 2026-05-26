"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Lightbulb, Upload, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Label } from "@/ui/label";
import { Slider } from "@/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import type { JobBrief } from "@/lib/types";

const schema = z.object({
  jobTitle:        z.string().min(1, "Job title is required"),
  company:         z.string().min(1, "Company is required"),
  sector:          z.string().min(1, "Sector is required"),
  location:        z.string().min(1, "Location is required"),
  salaryRange:     z.string().min(1, "Salary range is required"),
  roleSummary:     z.string().min(10, "Role summary is required"),
  keyRequirements: z.string().min(10, "Key requirements are required"),
  niceToHaves:     z.string(),
  routeToMarket:   z.string().min(5, "Route to market is required"),
  targetClients:   z.string().min(5, "Target clients is required"),
  dealComplexity:  z.string().min(5, "Deal complexity is required"),
  weights: z.object({
    routeToMarket:    z.number().min(0).max(100),
    clientTypes:      z.number().min(0).max(100),
    dealComplexity:   z.number().min(0).max(100),
    sectorFit:        z.number().min(0).max(100),
    careerTrajectory: z.number().min(0).max(100),
    quotaAttainment:  z.number().min(0).max(100),
  }),
});

type FormData = z.infer<typeof schema>;

const EXAMPLE_DATA: FormData = {
  jobTitle:    "Enterprise Account Executive",
  company:     "Acme Software Ltd",
  sector:      "B2B SaaS / Financial Technology",
  location:    "London (Hybrid — 2 days office)",
  salaryRange: "£70,000–£85,000 base + £140k OTE",
  roleSummary:
    "Selling enterprise SaaS platform to mid-market and enterprise financial services firms. New business hunter role managing full sales cycle from prospecting to close.",
  keyRequirements:
    "3+ years enterprise SaaS sales experience. Track record of £500k+ annual quota. Experience selling to C-suite in financial services. Complex, multi-stakeholder deal management.",
  niceToHaves:
    "Experience with Salesforce. MEDDIC/MEDDPICC methodology. Existing network in UK financial services.",
  routeToMarket:
    "New business hunting via outbound prospecting, networking events, and partner referrals. No inbound leads — must self-generate pipeline.",
  targetClients:
    "Mid-market to enterprise (500–5,000 employees). Financial services — banks, insurance, asset managers. Selling to CFO, CTO, and Head of Operations.",
  dealComplexity:
    "Average deal value £80k–£200k ARR. 3–6 month sales cycles. Multi-stakeholder with procurement involved. Security reviews and legal sign-off required.",
  weights: {
    routeToMarket:    20,
    clientTypes:      20,
    dealComplexity:   15,
    sectorFit:        15,
    careerTrajectory: 15,
    quotaAttainment:  15,
  },
};

type ImportStatus = "idle" | "parsing" | "extracting" | "done" | "error";

interface JobBriefFormProps {
  onSubmit: (data: JobBrief) => void;
  disabled?: boolean;
}

export function JobBriefForm({ onSubmit, disabled }: JobBriefFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Import state
  const [importText, setImportText]     = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importError, setImportError]   = useState("");
  const [dragOver, setDragOver]         = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: EXAMPLE_DATA,
  });

  const weights     = watch("weights");
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  // ── Import helpers ────────────────────────────────────────────────

  const applyExtracted = (extracted: Record<string, unknown>) => {
    const textFields = [
      "jobTitle", "company", "sector", "location", "salaryRange",
      "roleSummary", "keyRequirements", "niceToHaves",
      "routeToMarket", "targetClients", "dealComplexity",
    ] as const;
    for (const field of textFields) {
      const val = extracted[field];
      if (typeof val === "string" && val.trim()) setValue(field, val.trim());
    }
  };

  const runExtraction = async (text: string) => {
    setImportStatus("extracting");
    setImportError("");
    try {
      const res = await fetch("/api/extract-job-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Extraction failed");
      applyExtracted(json);
      setImportStatus("done");
      setImportText("");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Extraction failed");
      setImportStatus("error");
    }
  };

  const handleExtract = () => {
    if (importText.trim().length < 30) return;
    runExtraction(importText);
  };

  const handleImportFile = async (file: File) => {
    setImportStatus("parsing");
    setImportError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res  = await fetch("/api/parse-cv", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "File parsing failed");
      await runExtraction(json.text);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "File parsing failed");
      setImportStatus("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
  };

  const handleLoadExample = () => {
    Object.entries(EXAMPLE_DATA).forEach(([key, value]) => {
      setValue(key as keyof FormData, value as never);
    });
    setImportStatus("idle");
  };

  const weightFields: Array<{ key: keyof typeof weights; label: string }> = [
    { key: "routeToMarket",    label: "Route to Market" },
    { key: "clientTypes",      label: "Client Type Fit" },
    { key: "dealComplexity",   label: "Deal Complexity" },
    { key: "sectorFit",        label: "Sector Fit" },
    { key: "careerTrajectory", label: "Career Trajectory" },
    { key: "quotaAttainment",  label: "Quota Attainment" },
  ];

  const busy = importStatus === "parsing" || importStatus === "extracting";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1a3668]">Job Brief</h2>
        <Button type="button" onClick={handleLoadExample} disabled={disabled || busy} variant="outline" className="gap-2 text-sm">
          <Lightbulb className="h-4 w-4" />
          Load Example
        </Button>
      </div>

      {/* ── Import Panel ─────────────────────────────────────────── */}
      <Card className="border-[#1a3668]/20 bg-[#f8f9fc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1a3668] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#df2681]" />
            Import from Job Spec
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Paste a job advert or upload a file — AI fills in all the fields below automatically
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => importFileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors select-none ${
              dragOver
                ? "border-[#1a3668] bg-[#1a3668]/5"
                : "border-gray-200 hover:border-[#1a3668]/40 hover:bg-white"
            }`}
          >
            <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
            <p className="text-sm text-gray-500">
              Drop a <span className="font-medium">PDF</span> or <span className="font-medium">Word</span> file, or{" "}
              <span className="text-[#1a3668] font-semibold">click to browse</span>
            </p>
            <input
              ref={importFileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f);
                if (importFileRef.current) importFileRef.current.value = "";
              }}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or paste text</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Paste area */}
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste job advert or specification here…"
            rows={5}
            disabled={busy}
            className="resize-none text-sm"
          />

          {/* Actions + status */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              onClick={handleExtract}
              disabled={importText.trim().length < 30 || busy}
              className="gap-1.5 bg-[#df2681] hover:bg-[#c01f70] text-white"
            >
              {importStatus === "extracting" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting…</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" /> Extract with AI</>
              )}
            </Button>

            {importStatus === "parsing" && (
              <span className="text-sm text-gray-500 flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing file…
              </span>
            )}
            {importStatus === "done" && (
              <span className="text-sm text-green-600 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Fields extracted — review and edit below
              </span>
            )}
            {importStatus === "error" && (
              <span className="text-sm text-red-500">{importError}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Role Basics ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1a3668]">Role Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Job Title *</Label>
            <Input {...register("jobTitle")} disabled={disabled} />
            {errors.jobTitle && <p className="text-xs text-red-500">{errors.jobTitle.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Company *</Label>
            <Input {...register("company")} disabled={disabled} />
            {errors.company && <p className="text-xs text-red-500">{errors.company.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Sector / Industry *</Label>
            <Input {...register("sector")} disabled={disabled} />
            {errors.sector && <p className="text-xs text-red-500">{errors.sector.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Location *</Label>
            <Input {...register("location")} disabled={disabled} />
            {errors.location && <p className="text-xs text-red-500">{errors.location.message}</p>}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[#1a3668]">Salary Range *</Label>
            <Input {...register("salaryRange")} disabled={disabled} />
            {errors.salaryRange && <p className="text-xs text-red-500">{errors.salaryRange.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ── Role Description ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1a3668]">Role Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Role Summary *</Label>
            <Textarea {...register("roleSummary")} rows={4} disabled={disabled} />
            {errors.roleSummary && <p className="text-xs text-red-500">{errors.roleSummary.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Key Requirements *</Label>
            <Textarea {...register("keyRequirements")} rows={4} disabled={disabled} />
            {errors.keyRequirements && <p className="text-xs text-red-500">{errors.keyRequirements.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Nice-to-Haves</Label>
            <Textarea {...register("niceToHaves")} rows={3} disabled={disabled} />
          </div>
        </CardContent>
      </Card>

      {/* ── Sales-Specific Criteria ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1a3668]">Sales-Specific Criteria</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            These drive the AI scoring — edit if the extracted values need adjusting
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Route to Market *</Label>
            <Textarea {...register("routeToMarket")} rows={3} disabled={disabled} />
            {errors.routeToMarket && <p className="text-xs text-red-500">{errors.routeToMarket.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Target Clients *</Label>
            <Textarea {...register("targetClients")} rows={3} disabled={disabled} />
            {errors.targetClients && <p className="text-xs text-red-500">{errors.targetClients.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#1a3668]">Typical Deal Complexity *</Label>
            <Textarea {...register("dealComplexity")} rows={3} disabled={disabled} />
            {errors.dealComplexity && <p className="text-xs text-red-500">{errors.dealComplexity.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ── Advanced: Scoring Weights ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="text-base text-[#1a3668]">Advanced: Scoring Weights</CardTitle>
            {showAdvanced ? <ChevronUp className="h-4 w-4 text-[#1a3668]" /> : <ChevronDown className="h-4 w-4 text-[#1a3668]" />}
          </button>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-5">
            <div className={`text-sm font-medium mb-2 ${totalWeight === 100 ? "text-green-600" : "text-red-500"}`}>
              Total: {totalWeight} / 100{totalWeight !== 100 && " (weights must sum to 100)"}
            </div>
            {weightFields.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[#1a3668] text-sm">{label}</Label>
                  <span className="text-sm font-semibold text-[#1a3668]">{weights[key]}%</span>
                </div>
                <Slider
                  min={0}
                  max={40}
                  step={5}
                  value={[weights[key]]}
                  onValueChange={([val]) => setValue(`weights.${key}`, val, { shouldValidate: true })}
                  disabled={disabled}
                />
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      <Button
        type="submit"
        disabled={disabled || totalWeight !== 100}
        size="lg"
        className="w-full text-base font-semibold"
      >
        Continue to CV Upload
      </Button>
    </form>
  );
}
