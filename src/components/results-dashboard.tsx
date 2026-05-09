"use client";

import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  Download,
  FileDown,
  FileText,
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
import type { ScoredCandidate, UploadedFile, JobBrief } from "@/lib/types";
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
  files: UploadedFile[];
  jobBrief: JobBrief;
}

type SortField = "rank" | "name" | "score" | "recommendation";
type SortDir = "asc" | "desc";

export function ResultsDashboard({
  candidates,
  processingTimeMs,
  files,
  jobBrief,
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

  const generateReport = () => {
    const date = new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
    const shortlisted = sorted.filter((c) => c.score.overall_score >= 50);
    const notSuitableReport = sorted.filter((c) => c.score.overall_score < 50);

    const recLabel = (r: string) => getRecommendationLabel(r);
    const scoreColour = (s: number) =>
      s >= 75 ? "#16a34a" : s >= 50 ? "#d97706" : "#dc2626";

    const candidateHtml = shortlisted.map((c, i) => {
      const s = c.score;
      return `
        <div class="candidate">
          <div class="candidate-header">
            <span class="rank">${i + 1}</span>
            <div class="candidate-name-block">
              <h3>${s.candidate_name}</h3>
              <span class="rec-badge" style="background:${scoreColour(s.overall_score)}20;color:${scoreColour(s.overall_score)};border:1px solid ${scoreColour(s.overall_score)}40">${recLabel(s.recommendation)}</span>
              ${s.overqualification_risk ? '<span class="flag overq">Overqualification Risk</span>' : ""}
              ${s.aspirational_flag ? '<span class="flag aspir">Aspirational</span>' : ""}
            </div>
            <div class="score-circle" style="border-color:${scoreColour(s.overall_score)};color:${scoreColour(s.overall_score)}">${s.overall_score}</div>
          </div>
          <p class="summary">${s.summary}</p>
          <div class="two-col">
            <div>
              <p class="col-label">Strengths</p>
              <ul>${s.strengths.map((x) => `<li>${x}</li>`).join("")}</ul>
            </div>
            <div>
              <p class="col-label">Areas to Probe</p>
              <ul class="concerns">${s.weaknesses.map((x) => `<li>${x}</li>`).join("")}</ul>
            </div>
          </div>
          ${s.red_flags && s.red_flags.length > 0 ? `<div class="red-flags"><strong>⚠ Red Flags:</strong> ${s.red_flags.join(" · ")}</div>` : ""}
        </div>`;
    }).join("");

    const catLabels: Record<string, string> = {
      route_to_market: "Route to Market",
      client_type_fit: "Client Type Fit",
      deal_complexity: "Deal Complexity",
      sector_fit: "Sector Fit",
      career_trajectory: "Career Trajectory",
      quota_attainment: "Quota Attainment",
    };

    const notSuitableRows = notSuitableReport.map((c) => {
      const s = c.score;
      const weakCats = Object.entries(s.category_scores)
        .sort((a, b) => a[1].score - b[1].score)
        .slice(0, 2)
        .map(([k, v]) => `${catLabels[k] ?? k}: ${v.score}/100`)
        .join(", ");
      const reason = s.summary
        || (s.weaknesses?.length ? s.weaknesses.slice(0, 2).join("; ") : null)
        || `Weakest areas: ${weakCats}`;
      return `<tr><td>${s.candidate_name}</td><td style="color:${scoreColour(s.overall_score)};font-weight:600">${s.overall_score}</td><td>${reason}</td></tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CV Shortlist — ${jobBrief.jobTitle} at ${jobBrief.company}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
  .header { background: #1a3668; color: white; padding: 20px 32px; display: flex; align-items: center; gap: 20px; }
  .header-logo { background: white; border-radius: 4px; padding: 6px 12px; }
  .header-logo img { height: 32px; display: block; }
  .header-title h1 { font-size: 18px; font-weight: 700; }
  .header-title p { font-size: 12px; opacity: 0.8; margin-top: 2px; }
  .meta { background: #f3f0f8; border-bottom: 1px solid #e2d9f3; padding: 14px 32px; display: flex; gap: 32px; flex-wrap: wrap; }
  .meta-item { }
  .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #7c3aed; }
  .meta-value { font-size: 13px; font-weight: 600; margin-top: 1px; }
  .section { padding: 24px 32px; }
  .section-title { font-size: 15px; font-weight: 700; color: #1a3668; border-bottom: 2px solid #e2d9f3; padding-bottom: 8px; margin-bottom: 16px; }
  .candidate { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 14px; page-break-inside: avoid; }
  .candidate-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
  .rank { background: #1a3668; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
  .candidate-name-block { flex: 1; }
  .candidate-name-block h3 { font-size: 15px; font-weight: 700; }
  .candidate-name-block .rec-badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 12px; margin-top: 4px; margin-right: 4px; }
  .flag { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-left: 4px; }
  .overq { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .aspir { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .score-circle { width: 48px; height: 48px; border-radius: 50%; border: 3px solid; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0; }
  .summary { font-size: 12px; color: #374151; margin-bottom: 12px; line-height: 1.5; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .col-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px; }
  ul { padding-left: 16px; }
  li { font-size: 12px; margin-bottom: 3px; line-height: 1.4; }
  ul.concerns li { color: #6b7280; }
  .red-flags { margin-top: 10px; font-size: 11px; color: #dc2626; background: #fee2e2; padding: 6px 10px; border-radius: 4px; }
  .not-suitable-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .not-suitable-table th { text-align: left; padding: 8px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
  .not-suitable-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  .footer { border-top: 1px solid #e5e7eb; padding: 12px 32px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  .print-bar { position: sticky; top: 0; z-index: 100; background: #f3f0f8; border-bottom: 1px solid #e2d9f3; padding: 8px 32px; display: flex; justify-content: flex-end; gap: 8px; }
  .print-btn { background: #1a3668; color: white; border: none; border-radius: 6px; padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .print-btn:hover { background: #122a52; }
  @media print {
    body { font-size: 11px; }
    .print-bar { display: none; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .meta { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .rank { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="print-bar">
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</div>
<div class="header">
  <div class="header-logo">
    <img src="/aaron-wallis-logo.png" alt="Aaron Wallis" />
  </div>
  <div class="header-title">
    <h1>Candidate Shortlist Report</h1>
    <p>Aaron Wallis Sales Recruitment · ${date}</p>
  </div>
</div>
<div class="meta">
  <div class="meta-item"><div class="meta-label">Role</div><div class="meta-value">${jobBrief.jobTitle}</div></div>
  <div class="meta-item"><div class="meta-label">Company</div><div class="meta-value">${jobBrief.company}</div></div>
  <div class="meta-item"><div class="meta-label">Location</div><div class="meta-value">${jobBrief.location}</div></div>
  <div class="meta-item"><div class="meta-label">Salary</div><div class="meta-value">${jobBrief.salaryRange}</div></div>
  <div class="meta-item"><div class="meta-label">CVs Reviewed</div><div class="meta-value">${sorted.length}</div></div>
  <div class="meta-item"><div class="meta-label">Shortlisted</div><div class="meta-value">${shortlisted.length}</div></div>
</div>

${shortlisted.length > 0 ? `
<div class="section">
  <div class="section-title">Shortlisted Candidates (Score ≥ 50)</div>
  ${candidateHtml}
</div>` : ""}

${notSuitableReport.length > 0 ? `
<div class="section">
  <div class="section-title">Not Progressed (Score &lt; 50)</div>
  <table class="not-suitable-table">
    <thead><tr><th>Candidate</th><th>Score</th><th>Reason</th></tr></thead>
    <tbody>${notSuitableRows}</tbody>
  </table>
</div>` : ""}

<div class="footer">
  <span>Aaron Wallis Sales Recruitment · aaronwallis.co.uk</span>
  <span>Confidential — for client use only</span>
</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const processingTimeSecs = (processingTimeMs / 1000).toFixed(0);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-[#1a3668]">
            Results — {candidates.length} CVs Scored
          </h2>
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={downloadCsv} variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Download </span>CSV
            </Button>
            <Button onClick={generateReport} size="sm" className="gap-1.5 text-xs sm:text-sm bg-[#1a3668] hover:bg-[#122a52]">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Generate </span>Report
            </Button>
          </div>
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
                <p className="text-xl font-bold text-[#1a3668] mt-1">
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="flex-shrink-0">Min score:</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-8 font-medium text-right">{minScore}</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="fast-track">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="w-max min-w-full justify-start gap-1 h-auto p-1 bg-gray-100">
              <TabsTrigger value="fast-track" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-green-50 data-[state=active]:text-green-800">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                Fast-track ({fastTrack.length})
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-amber-50 data-[state=active]:text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="hidden sm:inline">Review Carefully</span>
                <span className="sm:hidden">Review</span>
                ({reviewCarefully.length})
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
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
              <TabsTrigger value="not-suitable" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="hidden sm:inline">Not Suitable</span>
                <span className="sm:hidden">No</span>
                ({notSuitable.length})
              </TabsTrigger>
            </TabsList>
          </div>

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
                files={files}
              />
            </TabsContent>
          ))}
        </Tabs>

        <CandidateDetail
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          files={files}
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
  files: UploadedFile[];
}

function CandidateTable({
  candidates,
  allCandidates,
  onSort,
  onSelect,
  files,
}: CandidateTableProps) {
  const downloadCv = (candidate: ScoredCandidate) => {
    const file = files.find((f) => f.id === candidate.fileId);
    if (!file) return;
    const url = URL.createObjectURL(file.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };
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
              <th className="text-left px-4 py-3 font-medium text-[#1a3668] w-12">#</th>
              <th className="text-left px-4 py-3 font-medium text-[#1a3668]">
                <button
                  onClick={() => onSort("name")}
                  className="flex items-center gap-1 hover:text-[#df2681]"
                >
                  Candidate
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#1a3668]">
                <button
                  onClick={() => onSort("score")}
                  className="flex items-center gap-1 hover:text-[#df2681]"
                >
                  Score
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#1a3668] hidden md:table-cell">
                <button
                  onClick={() => onSort("recommendation")}
                  className="flex items-center gap-1 hover:text-[#df2681]"
                >
                  Recommendation
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#1a3668] hidden lg:table-cell">
                Top Strengths
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#1a3668] hidden lg:table-cell">
                Key Concerns
              </th>
              <th className="text-right px-4 py-3 font-medium text-[#1a3668]">
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
                          className="inline-block bg-blue-50 text-[#1a3668] border border-blue-100 rounded px-1.5 py-0.5 text-xs max-w-[120px] truncate"
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
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => downloadCv(candidate)}
                        title="Download CV"
                        className="hidden sm:block p-1.5 rounded text-gray-400 hover:text-[#1a3668] hover:bg-purple-50 transition-colors"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                      <Button
                        size="sm"
                        onClick={() => onSelect(candidate)}
                        className="text-xs px-2.5"
                      >
                        View
                      </Button>
                    </div>
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
