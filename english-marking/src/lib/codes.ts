import { randomInt, createHash } from "node:crypto";

// No 0/O, 1/I/L, 5/S, 2/Z so codes survive bad handwriting and bad scans.
const ALPHABET = "34679ACDEFGHJKMNPQRTUVWXY";

export function newStudentCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** One-way hash for historical candidates, salted per deployment. */
export function anonId(raw: string): string {
  const salt = process.env.ANON_SALT ?? "change-me";
  return createHash("sha256").update(`${salt}:${raw.trim().toLowerCase()}`).digest("hex").slice(0, 20);
}
