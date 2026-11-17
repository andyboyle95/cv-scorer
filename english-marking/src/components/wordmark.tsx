import { BRAND } from "@/lib/brand";

/** The "R" is a rubricated initial: the red letter medieval scribes used to open a passage. */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <span className={`inline-flex items-baseline font-extrabold tracking-tight text-ink ${big ? "text-3xl" : "text-lg"}`} aria-label={BRAND.name}>
      <span aria-hidden className={`font-initial font-normal text-rubric ${big ? "text-[3.1rem] leading-none" : "text-[1.7rem] leading-none"}`}>R</span>
      <span aria-hidden>ed&nbsp;Letter</span>
    </span>
  );
}
