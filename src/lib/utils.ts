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

// Download file name from a person's name, in Title Case:
// "jack dowman" or "JACK DOWMAN" → "Jack-Dowman". Mixed-case words keep
// their capitals (McDonald), and so do initials such as "AJ" unless the
// whole name is in capitals. Accents are folded (José → Jose) to keep the
// name ASCII-safe for email attachments.
export function toTitleCaseFileName(name: string | null | undefined): string {
  const words = (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const allCaps = words.every((word) => word === word.toUpperCase());
  const titled = words.map((word) => {
    const isMixedCase = word !== word.toLowerCase() && word !== word.toUpperCase();
    const isInitials = !allCaps && word.length <= 2 && word === word.toUpperCase();
    const rest = isMixedCase || isInitials ? word.slice(1) : word.slice(1).toLowerCase();
    return word.charAt(0).toUpperCase() + rest;
  });
  return titled.join("-") || "CV";
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
