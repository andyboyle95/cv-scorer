export interface ScoringWeights {
  routeToMarket: number;
  clientTypes: number;
  dealComplexity: number;
  sectorFit: number;
  careerTrajectory: number;
  quotaAttainment: number;
}

export interface JobBrief {
  jobTitle: string;
  company: string;
  sector: string;
  location: string;
  salaryRange: string;
  roleSummary: string;
  keyRequirements: string;
  niceToHaves: string;
  routeToMarket: string;
  targetClients: string;
  dealComplexity: string;
  weights: ScoringWeights;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  status: "pending" | "uploading" | "parsed" | "scoring" | "done" | "error";
  extractedText?: string;
  error?: string;
}

export interface ScoredCandidate {
  fileId: string;
  fileName: string;
  score: import("@/lib/schemas").CVScore;
}
