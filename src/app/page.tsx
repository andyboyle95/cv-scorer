"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/header";
import { JobBriefForm } from "@/components/job-brief-form";
import { CvUploadZone } from "@/components/cv-upload-zone";
import { ScoringProgress } from "@/components/scoring-progress";
import { ResultsDashboard } from "@/components/results-dashboard";
import type { JobBrief, UploadedFile, ScoredCandidate } from "@/lib/types";
import type { CVScore } from "@/lib/schemas";

type Step = "brief" | "upload" | "scoring" | "results";

export default function Home() {
  const [step, setStep] = useState<Step>("brief");
  const [jobBrief, setJobBrief] = useState<JobBrief | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ScoredCandidate[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [processingTimeMs, setProcessingTimeMs] = useState(0);

  const handleBriefSubmit = (brief: JobBrief) => {
    setJobBrief(brief);
    setStep("upload");
  };

  const handleFilesAdded = useCallback((newFiles: UploadedFile[]) => {
    setFiles((prev) => {
      // Deduplicate by name+size
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const unique = newFiles.filter(
        (f) => !existing.has(`${f.name}-${f.size}`)
      );
      return [...prev, ...unique];
    });
  }, []);

  const handleFileRemoved = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const processFiles = async () => {
    if (!jobBrief || files.length === 0) return;

    setStep("scoring");
    setCurrentIndex(0);
    setResults([]);
    const t0 = Date.now();
    setStartTime(t0);

    const scored: ScoredCandidate[] = [];

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i);

      // Update file status to uploading
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" } : f
        )
      );

      try {
        // Step 1: Parse CV (skip if text is pre-loaded, e.g. from example CVs)
        let text: string;
        if (files[i].extractedText) {
          text = files[i].extractedText!;
        } else {
          const formData = new FormData();
          formData.append("file", files[i].file);

          const parseRes = await fetch("/api/parse-cv", {
            method: "POST",
            body: formData,
          });

          if (!parseRes.ok) {
            const { error } = await parseRes.json();
            throw new Error(error ?? "Failed to parse CV");
          }

          const json = await parseRes.json();
          text = json.text;
        }

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "scoring", extractedText: text } : f
          )
        );


        // Step 2: Score CV
        const scoreRes = await fetch("/api/score-cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobBrief, cvText: text }),
        });

        if (!scoreRes.ok) {
          const { error } = await scoreRes.json();
          throw new Error(error ?? "Scoring failed");
        }

        const scoreData: CVScore = await scoreRes.json();

        scored.push({
          fileId: files[i].id,
          fileName: files[i].name,
          score: scoreData,
        });

        setResults([...scored]);
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: message } : f
          )
        );
      }
    }

    setProcessingTimeMs(Date.now() - t0);
    setCurrentIndex(files.length);
    setStep("results");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7]">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {(["brief", "upload", "scoring", "results"] as Step[]).map(
            (s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-6 h-px bg-gray-300" />}
                <div
                  className={`flex items-center gap-1.5 ${
                    step === s
                      ? "text-[#E8006D] font-semibold"
                      : step === "results" ||
                        (step === "scoring" && i < 2) ||
                        (step === "upload" && i < 1)
                      ? "text-gray-400"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                      step === s
                        ? "bg-[#E8006D] text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="capitalize hidden sm:inline">
                    {s === "brief"
                      ? "Job Brief"
                      : s === "upload"
                      ? "Upload CVs"
                      : s === "scoring"
                      ? "Scoring"
                      : "Results"}
                  </span>
                </div>
              </div>
            )
          )}
        </div>

        {step === "brief" && (
          <JobBriefForm onSubmit={handleBriefSubmit} />
        )}

        {step === "upload" && (
          <CvUploadZone
            files={files}
            onFilesAdded={handleFilesAdded}
            onFileRemoved={handleFileRemoved}
            onStartScoring={processFiles}
          />
        )}

        {step === "scoring" && (
          <ScoringProgress files={files} currentIndex={currentIndex} />
        )}

        {step === "results" && (
          <ResultsDashboard
            candidates={results}
            processingTimeMs={processingTimeMs}
          />
        )}
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white py-4 px-6 text-center text-xs text-gray-400">
        Aaron Wallis CV Scoring Tool — AI-assisted shortlisting. For review by
        a qualified recruiter. Not a substitute for human judgement.
      </footer>
    </div>
  );
}
