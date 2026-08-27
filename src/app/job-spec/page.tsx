"use client";

import { useState } from "react";
import { JobSpecForm, type JobSpecFormData } from "@/components/job-spec-form";
import { JobSpecEditor } from "@/components/job-spec-editor";
import type { GeneratedJobSpec } from "@/lib/job-spec-schema";

export default function JobSpecPage() {
  const [submitting, setSubmitting] = useState(false);
  const [spec, setSpec] = useState<GeneratedJobSpec | null>(null);
  const [answers, setAnswers] = useState<JobSpecFormData | null>(null);
  const [emailedToYou, setEmailedToYou] = useState(false);
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
      // The API appends a `_delivery` block describing what actually got
      // emailed; the spec itself is everything else.
      const result: GeneratedJobSpec & {
        _delivery?: { emailedToYou?: boolean };
      } = await res.json();
      setAnswers(data);
      setEmailedToYou(Boolean(result._delivery?.emailedToYou));
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
    setEmailedToYou(false);
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
        emailedToYou={emailedToYou}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-10 px-4">
      {error && (
        <div className="max-w-5xl mx-auto mb-4">
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
