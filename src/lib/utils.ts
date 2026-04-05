import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function getScoreBg(score: number): string {
  if (score >= 75) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function getRecommendationLabel(rec: string): string {
  switch (rec) {
    case "strong_yes":
      return "Strong Yes";
    case "yes":
      return "Yes";
    case "maybe":
      return "Maybe";
    case "no":
      return "No";
    case "strong_no":
      return "Strong No";
    default:
      return rec;
  }
}

export function getRecommendationStyle(rec: string): string {
  switch (rec) {
    case "strong_yes":
      return "bg-pink-100 text-pink-800 border-pink-200";
    case "yes":
      return "bg-green-100 text-green-800 border-green-200";
    case "maybe":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "no":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "strong_no":
      return "bg-gray-200 text-gray-600 border-gray-300";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
