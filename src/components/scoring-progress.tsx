"use client";

import { Loader2 } from "lucide-react";
import { Progress } from "@/ui/progress";
import { Card, CardContent } from "@/ui/card";
import type { UploadedFile } from "@/lib/types";

interface ScoringProgressProps {
  files: UploadedFile[];
  currentIndex: number;
}

export function ScoringProgress({ files, currentIndex }: ScoringProgressProps) {
  const total = files.length;
  const done = files.filter(
    (f) => f.status === "done" || f.status === "error"
  ).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const currentFile = files[currentIndex];

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
                  {" "}
                  — {currentFile.name}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              This may take a few minutes. Each CV takes 3–8 seconds to score.
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
        <div className="max-h-40 overflow-y-auto space-y-1">
          {files.map((file, i) => (
            <div key={file.id} className="flex items-center gap-2 text-xs">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  file.status === "done"
                    ? "bg-green-500"
                    : file.status === "error"
                    ? "bg-red-500"
                    : i === currentIndex
                    ? "bg-[#E8006D] animate-pulse"
                    : "bg-gray-200"
                }`}
              />
              <span
                className={
                  file.status === "done"
                    ? "text-green-700"
                    : file.status === "error"
                    ? "text-red-600"
                    : i === currentIndex
                    ? "text-[#E8006D] font-medium"
                    : "text-gray-400"
                }
              >
                {file.name}
                {file.status === "error" && file.error && (
                  <span className="text-red-500"> — {file.error}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
