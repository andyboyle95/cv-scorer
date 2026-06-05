"use client";

import { useState } from "react";
import { JobSpecForm, type JobSpecFormData } from "@/components/job-spec-form";
import { JobSpecResult } from "@/components/job-spec-result";
import type { GeneratedJobSpec } from "@/lib/job-spec-schema";

export default function JobSpecPage() {
  const [submitting, setSubmitting] = useState(false);
  const [spec, setSpec] = useState<GeneratedJobSpec | null>(null);
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
      setSpec(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setSpec(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-10 px-4">
      {!spec && (
        <div className="max-w-2xl mx-auto mb-8 text-center">
          <h1 className="text-3xl font-semibold text-[#1a3668]">
            Job Spec Creator
          </h1>
          <p className="text-gray-500 mt-2">
            Answer a few questions and we&apos;ll instantly draft a tailored job
            spec and person specification for your sales role.
          </p>
        </div>
      )}

      {error && (
        <div className="max-w-2xl mx-auto mb-4">
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        </div>
      )}

      {spec ? (
        <JobSpecResult spec={spec} onRestart={handleRestart} />
      ) : (
        <JobSpecForm onSubmit={handleSubmit} submitting={submitting} />
      )}
    </div>
  );
}
