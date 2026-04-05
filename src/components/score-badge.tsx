import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const colorClass =
    score >= 75
      ? "bg-green-100 text-green-800 border-green-200"
      : score >= 50
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-red-100 text-red-800 border-red-200";

  const sizeClass =
    size === "sm"
      ? "text-xs px-2 py-0.5"
      : size === "lg"
      ? "text-2xl px-4 py-2 font-bold"
      : "text-sm px-2.5 py-1 font-semibold";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        colorClass,
        sizeClass
      )}
    >
      {score}
    </span>
  );
}
