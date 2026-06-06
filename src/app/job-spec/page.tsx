"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { JobSpecForm, type JobSpecFormData } from "@/components/job-spec-form";
import { JobSpecEditor } from "@/components/job-spec-editor";
import type { GeneratedJobSpec } from "@/lib/job-spec-schema";

export default function JobSpecPage() {
  const [submitting, setSubmitting] = useState(false);
  const [spec, setSpec] = useState<GeneratedJobSpec | null>(null);
  const [answers, setAnswers] = useState<JobSpecFormData | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (data: JobSpecFormData) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/generate-job-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        throw new Error(msg ?? "Something went wrong. Please try again.");
      }
      const result: GeneratedJobSpec = await res.json();
      setAnswers(data);
      setSpec(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setSpec(null);
    setAnswers(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Back to the wizard, keeping the answers so they can be tweaked & re-run.
  const handleEditAnswers = () => {
    setSpec(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Editor mode — full-screen layout.
  if (spec && answers) {
    return (
      <JobSpecEditor
        spec={spec}
        answers={answers}
        onRestart={handleRestart}
        onEditAnswers={handleEditAnswers}
      />
    );
  }

  // Loading state while the AI generates.
  if (submitting) {
    return <GeneratingStatus />;
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-10 px-4">
      <div className="max-w-2xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-semibold text-[#1a3668]">
          Job Spec Creator
        </h1>
        <p className="text-gray-500 mt-2">
          Answer a few questions and we&apos;ll instantly draft a tailored job
          spec and person specification for your sales role.
        </p>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto mb-4">
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        </div>
      )}

      <JobSpecForm
        onSubmit={handleSubmit}
        submitting={submitting}
        initialValues={answers ?? undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generating status — cycles through estimated steps so the wait feels alive.
// ---------------------------------------------------------------------------
const STEPS = [
  "Reading your brief",
  "Researching the company website",
  "Writing the job specification",
  "Shaping the person specification",
  "Adding the finishing touches",
];

function GeneratingStatus() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => Math.min(i + 1, STEPS.length - 1));
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-[#E2E8F0] p-8">
        <div className="flex items-center gap-3 mb-1">
          <Loader2 className="h-5 w-5 animate-spin text-[#df2681]" />
          <h2 className="text-lg font-semibold text-[#1a3668]">
            Building your job spec
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          This usually takes around 30 seconds — hang tight.
        </p>

        <ul className="space-y-3">
          {STEPS.map((step, i) => {
            const done = i < active;
            const current = i === active;
            return (
              <li key={step} className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs shrink-0 ${
                    done
                      ? "bg-[#df2681] text-white"
                      : current
                      ? "bg-pink-100 text-[#df2681]"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : current ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-sm ${
                    done || current
                      ? "text-[#1a3668] font-medium"
                      : "text-gray-400"
                  }`}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
