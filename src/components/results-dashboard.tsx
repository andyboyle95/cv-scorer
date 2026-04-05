"use client";

import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  Download,
  Search,
  Info,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { ScoreBadge } from "./score-badge";
import { CandidateDetail } from "./candidate-detail";
import {
  getRecommendationLabel,
  getRecommendationStyle,
} from "@/lib/utils";
import type { ScoredCandidate } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";
import { Card, CardContent } from "@/ui/card";

interface ResultsDashboardProps {
  candidates: ScoredCandidate[];
  processingTimeMs: number;
}

type SortField = "rank" | "name" | "score" | "recommendation";
type SortDir = "asc" | "desc";

export function ResultsDashboard({
  candidates,
  processingTimeMs,
}: ResultsDashboardProps) {
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedCandidate, setSelectedCandidate] =
    useState<ScoredCandidate | null>(null);

  const sorted = useMemo(() => {
    const arr = [...candidates].sort((a, b) => {
      let cmp = 0;
      if (sortField === "score" || sortField === "rank") {
        cmp = a.score.overall_score - b.score.overall_score;
      } else if (sortField === "name") {
        cmp = a.score.candidate_name.localeCompare(b.score.candidate_name);
      } else if (sortField === "recommendation") {
        const order = ["strong_yes", "yes", "maybe", "no", "strong_no"];
        cmp =
          order.indexOf(a.score.recommendation) -
          order.indexOf(b.score.recommendation);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [candidates, sortField, sortDir]);

  const filtered = useMemo(() => {
    return sorted.filter(
      (c) =>
        c.score.overall_score >= minScore &&
        c.score.candidate_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [sorted, minScore, search]);

  const fastTrack = filtered.filter((c) => c.score.overall_score >= 75);
  const reviewCarefully = filtered.filter(
    (c) => c.score.overall_score >= 50 && c.score.overall_score < 75
  );
  const notSuitable = filtered.filter((c) => c.score.overall_score < 50);

  const avgScore =
    candidates.length > 0
      ? Math.round(
          candidates.reduce((s, c) => s + c.score.overall_score, 0) /
            candidates.length
        )
      : 0;
  const topCandidate =
    candidates.length > 0
      ? candidates.reduce((top, c) =>
          c.score.overall_score > top.score.overall_score ? c : top
        )
      : null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const downloadCsv = () => {
    const headers = [
      "Rank",
      "Candidate Name",
      "Overall Score",
      "Recommendation",
      "Route to Market",
      "Client Type Fit",
      "Deal Complexity",
      "Sector Fit",
      "Career Trajectory",
      "Quota Attainment",
      "Strengths",
      "Weaknesses",
      "Summary",
      "Overqualification Risk",
      "Aspirational Flag",
    ];

    const rows = sorted.map((c, i) => {
      const s = c.score;
      return [
        i + 1,
        `"${s.candidate_name}"`,
        s.overall_score,
        getRecommendationLabel(s.recommendation),
        s.category_scores.route_to_market.score,
        s.category_scores.client_type_fit.score,
        s.category_scores.deal_complexity.score,
        s.category_scores.sector_fit.score,
        s.category_scores.career_trajectory.score,
        s.category_scores.quota_attainment.score,
        `"${s.strengths.join("; ")}"`,
        `"${s.weaknesses.join("; ")}"`,
        `"${s.summary.replace(/"/g, "'")}"`,
        s.overqualification_risk ? "Yes" : "No",
        s.aspirational_flag ? "Yes" : "No",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cv-shortlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const processingTimeSecs = (processingTimeMs / 1000).toFixed(0);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0E4DA4]">
            Results — {candidates.length} CVs Scored
          </h2>
          <Button onClick={downloadCsv} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Scored", value: candidates.length.toString() },
            { label: "Average Score", value: avgScore.toString() },
            {
              label: "Top Candidate",
              value: topCandidate
                ? `${topCandidate.score.candidate_name.split(" ")[0]} (${topCandidate.score.overall_score})`
                : "—",
            },
            { label: "Processing Time", value: `${processingTimeSecs}s` },
          ].map(({ label, value }) => (
            <Card key={label} className="border-[#E2E8F0]">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-xl font-bold text-[#0E4DA4] mt-1">
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Min score:</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-28"
            />
            <span className="w-8 font-medium">{minScore}</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="fast-track">
          <TabsList className="w-full justify-start gap-1 h-auto p-1 bg-gray-100">
            <TabsTrigger value="fast-track" className="gap-1.5 data-[state=active]:bg-green-50 data-[state=active]:text-green-800">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Fast-track ({fastTrack.length})
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-1.5 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Review Carefully ({reviewCarefully.length})
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    This is where most hiring mistakes happen. These candidates
                    score 50–74 and need focused screening calls to determine
                    fit. Don&apos;t dismiss them without speaking to them first.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="not-suitable" className="gap-1.5 data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Not Suitable ({notSuitable.length})
            </TabsTrigger>
          </TabsList>

          {[
            { value: "fast-track", data: fastTrack },
            { value: "review", data: reviewCarefully },
            { value: "not-suitable", data: notSuitable },
          ].map(({ value, data }) => (
            <TabsContent key={value} value={value}>
              <CandidateTable
                candidates={data}
                allCandidates={sorted}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                onSelect={setSelectedCandidate}
              />
            </TabsContent>
          ))}
        </Tabs>

        <CandidateDetail
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      </div>
    </TooltipProvider>
  );
}

interface CandidateTableProps {
  candidates: ScoredCandidate[];
  allCandidates: ScoredCandidate[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onSelect: (candidate: ScoredCandidate) => void;
}

function CandidateTable({
  candidates,
  allCandidates,
  onSort,
  onSelect,
}: CandidateTableProps) {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        No candidates in this category.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F7F7] border-b border-[#E2E8F0]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[#0E4DA4] w-12">#</th>
              <th className="text-left px-4 py-3 font-medium text-[#0E4DA4]">
                <button
                  onClick={() => onSort("name")}
                  className="flex items-center gap-1 hover:text-[#E8006D]"
                >
                  Candidate
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#0E4DA4]">
                <button
                  onClick={() => onSort("score")}
                  className="flex items-center gap-1 hover:text-[#E8006D]"
                >
                  Score
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#0E4DA4] hidden md:table-cell">
                <button
                  onClick={() => onSort("recommendation")}
                  className="flex items-center gap-1 hover:text-[#E8006D]"
                >
                  Recommendation
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#0E4DA4] hidden lg:table-cell">
                Top Strengths
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#0E4DA4] hidden lg:table-cell">
                Key Concerns
              </th>
              <th className="text-right px-4 py-3 font-medium text-[#0E4DA4]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {candidates.map((candidate) => {
              const rank =
                allCandidates.findIndex((c) => c.fileId === candidate.fileId) +
                1;
              const s = candidate.score;
              return (
                <tr
                  key={candidate.fileId}
                  className="bg-white hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-500 font-mono">{rank}</td>
                  <td className="px-4 py-3 font-medium text-[#2D2D2D]">
                    {s.candidate_name}
                    <div className="flex gap-1 mt-0.5">
                      {s.overqualification_risk && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">
                          Overqualified
                        </span>
                      )}
                      {s.aspirational_flag && (
                        <span className="text-xs bg-red-100 text-red-700 px-1 rounded">
                          Aspirational
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={s.overall_score} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getRecommendationStyle(
                        s.recommendation
                      )}`}
                    >
                      {getRecommendationLabel(s.recommendation)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {s.strengths.slice(0, 2).map((str, i) => (
                        <span
                          key={i}
                          className="inline-block bg-blue-50 text-[#0E4DA4] border border-blue-100 rounded px-1.5 py-0.5 text-xs max-w-[120px] truncate"
                          title={str}
                        >
                          {str}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {s.weaknesses.slice(0, 1).map((w, i) => (
                        <span
                          key={i}
                          className="inline-block bg-gray-100 text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 text-xs max-w-[120px] truncate"
                          title={w}
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      onClick={() => onSelect(candidate)}
                      className="text-xs"
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
