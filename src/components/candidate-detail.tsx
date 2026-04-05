"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/ui/sheet";
import { Progress } from "@/ui/progress";
import { ScoreBadge } from "./score-badge";
import {
  getRecommendationLabel,
  getRecommendationStyle,
} from "@/lib/utils";
import type { ScoredCandidate } from "@/lib/types";

interface CandidateDetailProps {
  candidate: ScoredCandidate | null;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  route_to_market: "Route to Market",
  client_type_fit: "Client Type Fit",
  deal_complexity: "Deal Complexity",
  sector_fit: "Sector Fit",
  career_trajectory: "Career Trajectory",
  quota_attainment: "Quota Attainment",
};

export function CandidateDetail({ candidate, onClose }: CandidateDetailProps) {
  const [showRawText, setShowRawText] = useState(false);

  if (!candidate) return null;

  const { score } = candidate;

  return (
    <Sheet open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0"
      >
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-6 py-4 z-10">
          <SheetHeader>
            <SheetTitle className="text-[#0E4DA4] text-xl">
              {score.candidate_name}
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-3 mt-2">
            <ScoreBadge score={score.overall_score} size="lg" />
            <span
              className={`inline-flex items-center rounded-md border px-3 py-1 text-sm font-semibold ${getRecommendationStyle(
                score.recommendation
              )}`}
            >
              {getRecommendationLabel(score.recommendation)}
            </span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Warning Banners */}
          {score.overqualification_risk && (
            <div className="flex gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Overqualification Risk
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Salary expectations may exceed budget — probe motivation and
                  compensation early.
                </p>
              </div>
            </div>
          )}
          {score.aspirational_flag && (
            <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Aspirational Application
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  Candidate lacks direct experience for this level of role.
                </p>
              </div>
            </div>
          )}

          {/* Summary */}
          <div>
            <h3 className="text-sm font-semibold text-[#0E4DA4] mb-2">
              Summary
            </h3>
            <p className="text-sm text-[#2D2D2D] leading-relaxed">
              {score.summary}
            </p>
          </div>

          {/* Category Scores */}
          <div>
            <h3 className="text-sm font-semibold text-[#0E4DA4] mb-3">
              Category Scores
            </h3>
            <div className="space-y-5">
              {Object.entries(score.category_scores).map(([key, cat]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#2D2D2D]">
                      {CATEGORY_LABELS[key] ?? key}
                    </span>
                    <ScoreBadge score={cat.score} size="sm" />
                  </div>
                  <Progress
                    value={cat.score}
                    className="h-2"
                  />
                  <p className="text-xs text-gray-600">{cat.rationale}</p>
                  {/* Evidence Quotes */}
                  {cat.evidence && cat.evidence.length > 0 && (
                    <div className="space-y-1 ml-2">
                      {cat.evidence.map((ev, i) => (
                        <blockquote
                          key={i}
                          className="border-l-2 border-gray-300 pl-3 text-xs text-gray-500 italic"
                        >
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
          <div>
            <h3 className="text-sm font-semibold text-[#0E4DA4] mb-2">
              Strengths
            </h3>
            <ul className="space-y-1.5">
              {score.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#2D2D2D]">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div>
            <h3 className="text-sm font-semibold text-[#0E4DA4] mb-2">
              Weaknesses
            </h3>
            <ul className="space-y-1.5">
              {score.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#2D2D2D]">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Red Flags */}
          {score.red_flags && score.red_flags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0E4DA4] mb-2">
                Red Flags
              </h3>
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
              <h3 className="text-sm font-semibold text-[#0E4DA4] mb-2">
                Data Gaps
              </h3>
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
