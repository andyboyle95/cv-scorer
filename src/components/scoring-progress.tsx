"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/ui/progress";
import { Card, CardContent } from "@/ui/card";
import { ScoreBadge } from "./score-badge";
import type { UploadedFile, ScoredCandidate } from "@/lib/types";

interface ScoringProgressProps {
  files: UploadedFile[];
  currentIndex: number;
  results: ScoredCandidate[];
}

export function ScoringProgress({ files, currentIndex, results }: ScoringProgressProps) {
  const total = files.length;
  const done = files.filter(
    (f) => f.status === "done" || f.status === "error"
  ).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const currentFile = files[currentIndex];

  const resultsByFileId = Object.fromEntries(
    results.map((r) => [r.fileId, r])
  );

  return (
    <Card className="border-[#E2E8F0]">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-[#E8006D] animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#2D2D2D]">
              Scoring CV {Math.min(currentIndex + 1, total)} of {total}
              {currentFile && (
                <span className="font-normal text-gray-600">
                  {" "}— {currentFile.name}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Prompt caching active — each CV after the first scores faster.
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <Progress value={percent} className="h-2.5" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{done} scored</span>
            <span>{percent}%</span>
          </div>
        </div>

        {/* File Status List */}
        <div className="max-h-96 overflow-y-auto space-y-1.5">
          {files.map((file, i) => {
            const result = resultsByFileId[file.id];
            const isDone = file.status === "done" && result;
            const isError = file.status === "error";
            const isActive = i === currentIndex && !isDone && !isError;

            return (
              <div
                key={file.id}
                className={`rounded-lg px-3 py-2 text-xs transition-colors ${
                  isDone
                    ? "bg-green-50 border border-green-100"
                    : isError
                    ? "bg-red-50 border border-red-100"
                    : isActive
                    ? "bg-pink-50 border border-pink-200"
                    : "bg-gray-50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  ) : isError ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="h-3.5 w-3.5 text-[#E8006D] animate-spin flex-shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-gray-300 flex-shrink-0" />
                  )}

                  <span className={`font-medium truncate flex-1 ${
                    isDone ? "text-green-800" :
                    isError ? "text-red-700" :
                    isActive ? "text-[#E8006D]" :
                    "text-gray-400"
                  }`}>
                    {isDone ? result.score.candidate_name : file.name.replace(/\.[^.]+$/, "")}
                  </span>

                  {isDone && (
                    <ScoreBadge score={result.score.overall_score} size="sm" />
                  )}
                  {isError && (
                    <span className="text-red-500 truncate max-w-[160px]">{file.error}</span>
                  )}
                </div>

                {isDone && result.score.summary && (
                  <p className="mt-1 text-gray-500 leading-snug line-clamp-2 pl-5">
                    {result.score.summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
