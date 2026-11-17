import type { GradeBoundaries } from "./settings";

/**
 * Fine grade, e.g. 4.6 = a grade 4, 60% of the way to a 5.
 * Boundaries are for the full qualification (both papers). For one paper or a
 * subset of questions they are scaled to the marks available, so the result
 * is an estimate and is always labelled as one.
 */
export function gradeFor(total: number, max: number, b: GradeBoundaries): number {
  if (!max) return 0;
  const scale = max / b.total;
  const points = Object.entries(b.grades)
    .map(([g, m]) => ({ g: Number(g), m: m * scale }))
    .sort((x, y) => x.g - y.g);
  let grade = 0;
  for (let i = 0; i < points.length; i++) {
    if (total >= points[i].m) {
      const next = points[i + 1];
      const frac = next ? Math.min(0.99, (total - points[i].m) / (next.m - points[i].m)) : 0;
      grade = points[i].g + Math.max(0, frac);
    }
  }
  if (grade === 0 && points.length) grade = Math.max(0, Math.min(0.99, total / points[0].m));
  return Math.round(grade * 10) / 10;
}

export const wholeGrade = (fine: number | null | undefined) =>
  fine == null ? null : Math.floor(Number(fine));

/** Marks needed (on this assessment) to reach a grade. */
export function marksForGrade(grade: number, max: number, b: GradeBoundaries): number | null {
  const m = b.grades[String(grade)];
  return m == null ? null : Math.ceil(m * (max / b.total));
}
