"use client";

import { useState, useCallback, useRef } from "react";
import { Header } from "@/components/header";
import { JobBriefForm } from "@/components/job-brief-form";
import { CvUploadZone } from "@/components/cv-upload-zone";
import { ScoringProgress } from "@/components/scoring-progress";
import { ResultsDashboard } from "@/components/results-dashboard";
import type { JobBrief, UploadedFile, ScoredCandidate } from "@/lib/types";
import type { CVScore } from "@/lib/schemas";

type Step = "brief" | "upload" | "scoring" | "results";

// Strip formatting noise from CV text to reduce input tokens sent to Claude
function cleanCvText(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(l)) return false; // page numbers
      if (/^[-=_*•]{3,}$/.test(l)) return false;                // horizontal rules
      if (/^(tel|phone|mobile|email|address|linkedin|www\.)\s*:/i.test(l)) return false; // boilerplate contact
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // collapse 3+ blank lines to 2
    .trim()
    .slice(0, 7000);
}

export default function Home() {
  const [step, setStep] = useState<Step>("brief");
  const [jobBrief, setJobBrief] = useState<JobBrief | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<ScoredCandidate[]>([]);
  const [processingTimeMs, setProcessingTimeMs] = useState(0);
  const stopRef = useRef(false);
  const startTimeRef = useRef(0);

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

  const handleStopScoring = () => {
    stopRef.current = true;
    setProcessingTimeMs(Date.now() - startTimeRef.current);
    setStep("results");
  };

  const processFiles = async () => {
    if (!jobBrief || files.length === 0) return;

    stopRef.current = false;
    setStep("scoring");
    setResults([]);
    const t0 = Date.now();
    startTimeRef.current = t0;

    const fileSnapshot = [...files];
    let nextIndex = 0;

    const processOne = async (file: UploadedFile, i: number) => {
      if (stopRef.current) return;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
      );

      try {
        // Step 1: Parse CV (skip if text is pre-loaded)
        let text: string;
        if (file.extractedText) {
          text = file.extractedText;
        } else {
          const formData = new FormData();
          formData.append("file", file.file);
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

        if (stopRef.current) return;

        // Clean and truncate CV text to reduce input tokens
        const truncatedText = cleanCvText(text);

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "scoring", extractedText: text } : f
          )
        );

        // Step 2: Score CV
        const scoreRes = await fetch("/api/score-cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobBrief, cvText: truncatedText }),
        });

        if (!scoreRes.ok) {
          const { error } = await scoreRes.json();
          throw new Error(error ?? "Scoring failed");
        }

        const scoreData: CVScore = await scoreRes.json();

        setResults((prev) => [
          ...prev,
          { fileId: file.id, fileName: file.name, score: scoreData },
        ]);
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: message } : f
          )
        );
      }
    };

    // Run up to 3 CVs in parallel
    const CONCURRENCY = 3;
    const worker = async () => {
      while (true) {
        if (stopRef.current) break;
        const i = nextIndex++;
        if (i >= fileSnapshot.length) break;
        await processOne(fileSnapshot[i], i);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, fileSnapshot.length) }, () =>
        worker()
      )
    );

    if (!stopRef.current) {
      setProcessingTimeMs(Date.now() - t0);
      setStep("results");
    }
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
                      ? "text-[#df2681] font-semibold"
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
                        ? "bg-[#df2681] text-white"
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
          <ScoringProgress files={files} results={results} onStop={handleStopScoring} />
        )}

        {step === "results" && jobBrief && (
          <ResultsDashboard
            candidates={results}
            processingTimeMs={processingTimeMs}
            files={files}
            jobBrief={jobBrief}
          />
        )}
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white py-4 px-6 text-center text-xs text-gray-400">
        Aaron Wallis CV Scoring Tool — AI-assisted shortlisting. Built by Andy Boyle.
      </footer>
    </div>
  );
}
