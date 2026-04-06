import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  FileDown,
  ArrowLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/ui/sheet";
import { Progress } from "@/ui/progress";
import { ScoreBadge } from "./score-badge";
import {
  getRecommendationLabel,
  getRecommendationStyle,
} from "@/lib/utils";
import type { ScoredCandidate, UploadedFile } from "@/lib/types";

interface CandidateDetailProps {
  candidate: ScoredCandidate | null;
  onClose: () => void;
  files: UploadedFile[];
}

const CATEGORY_LABELS: Record<string, string> = {
  route_to_market: "Route to Market",
  client_type_fit: "Client Type Fit",
  deal_complexity: "Deal Complexity",
  sector_fit: "Sector Fit",
  career_trajectory: "Career Trajectory",
  quota_attainment: "Quota Attainment",
};

export function CandidateDetail({ candidate, onClose, files }: CandidateDetailProps) {
  const [showRawText, setShowRawText] = useState(false);

  if (!candidate) return null;

  const { score } = candidate;

  const handleDownload = () => {
    const file = files.find((f) => f.id === candidate.fileId);
    if (!file) return;
    const url = URL.createObjectURL(file.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col"
      >
        {/* Sticky header with explicit back button — always visible */}
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-4 py-3 z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4B0082] transition-colors flex-shrink-0 py-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <SheetTitle className="text-[#4B0082] text-base sm:text-lg font-semibold flex-1 min-w-0 truncate">
              {score.candidate_name}
            </SheetTitle>
            <button
              onClick={handleDownload}
              title="Download CV"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#4B0082] border border-gray-200 hover:border-purple-300 rounded-md px-2 py-1.5 transition-colors flex-shrink-0"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CV</span>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ScoreBadge score={score.overall_score} size="lg" />
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getRecommendationStyle(score.recommendation)}`}
            >
              {getRecommendationLabel(score.recommendation)}
            </span>
          </div>
        </div>

        <div className="px-5 py-5 space-y-6 flex-1 overflow-y-auto">
          {/* Warning Banners */}
          {score.overqualification_risk && (
            <div className="flex gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Overqualification Risk</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Salary expectations may exceed budget — probe motivation and compensation early.
                </p>
              </div>
            </div>
          )}
          {score.aspirational_flag && (
            <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Aspirational Application</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Candidate lacks direct experience for this level of role.
                </p>
              </div>
            </div>
          )}

          {/* Summary */}
          {score.summary && (
            <div>
              <h3 className="text-sm font-semibold text-[#4B0082] mb-2">Summary</h3>
              <p className="text-sm text-[#2D2D2D] leading-relaxed">{score.summary}</p>
            </div>
          )}

          {/* Category Scores */}
          <div>
            <h3 className="text-sm font-semibold text-[#4B0082] mb-3">Category Scores</h3>
            <div className="space-y-5">
              {Object.entries(score.category_scores).map(([key, cat]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#2D2D2D]">
                      {CATEGORY_LABELS[key] ?? key}
                    </span>
                    <ScoreBadge score={cat.score} size="sm" />
                  </div>
                  <Progress value={cat.score} className="h-2" />
                  <p className="text-xs text-gray-600">{cat.rationale}</p>
                  {cat.evidence && cat.evidence.length > 0 && (
                    <div className="space-y-1 ml-2">
                      {cat.evidence.map((ev, i) => (
                        <blockquote key={i} className="border-l-2 border-gray-300 pl-3 text-xs text-gray-500 italic">
                          {ev}
                        </blockquote>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          {score.strengths.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#4B0082] mb-2">Strengths</h3>
              <ul className="space-y-1.5">
                {score.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#2D2D2D]">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {score.weaknesses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#4B0082] mb-2">Weaknesses</h3>
              <ul className="space-y-1.5">
                {score.weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#2D2D2D]">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Red Flags */}
          {score.red_flags && score.red_flags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#4B0082] mb-2">Red Flags</h3>
              <ul className="space-y-1.5">
                {score.red_flags.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#2D2D2D]">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Data Gaps */}
          {score.data_gaps && score.data_gaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#4B0082] mb-2">Data Gaps</h3>
              <ul className="space-y-1.5">
                {score.data_gaps.map((g, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#2D2D2D]">
                    <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

