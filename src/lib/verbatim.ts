// Helpers for the "exact wording" CV import. The AI only sorts the CV text
// into the template fields; it must not write or reword anything. These
// checks confirm each line is in the original CV, and take out contact
// details so the client cannot go direct.

import { redactText } from "./contact-redaction";

// Compare on letters and digits only, so line breaks, bullet symbols,
// quote styles and dash styles do not count as changes — but any changed,
// added or dropped word does.
export function normaliseForCompare(s: string): string {
  return s
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** True if `text` appears word for word in `source`. */
export function isVerbatim(text: string, source: string | { normalised: string }): boolean {
  const needle = normaliseForCompare(text);
  if (!needle) return true;
  const hay = typeof source === "string" ? normaliseForCompare(source) : source.normalised;
  return hay.includes(needle);
}

export interface VerbatimExperience {
  company: string;
  role: string;
  dateFrom: string;
  dateTo: string;
  description: string;
  bullets: string[];
}

export interface VerbatimCv {
  candidateName: string;
  executiveSummary: string;
  profile: string;
  skills: string[];
  experience: VerbatimExperience[];
  qualifications: string[];
  languages: string[];
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/**
 * Tidy the AI's field sorting: remove contact details, never keep an
 * executive summary (that would be AI-written), and list every line that is
 * not in the original CV word for word, so the recruiter can check it.
 */
export function finaliseVerbatim(raw: Record<string, unknown>, source: string): {
  cv: VerbatimCv;
  unverified: string[];
} {
  const hay = { normalised: normaliseForCompare(source) };
  const unverified: string[] = [];
  const clean = (s: string) => redactText(s).trim();
  const check = (s: string) => {
    if (s && !isVerbatim(s, hay)) unverified.push(s);
    return s;
  };
  const cleanList = (items: string[]) => items.map(clean).filter(Boolean).map(check);

  const experience = (Array.isArray(raw.experience) ? raw.experience : []).map((e) => {
    const x = (e ?? {}) as Record<string, unknown>;
    return {
      company: check(clean(str(x.company))),
      role: check(clean(str(x.role))),
      dateFrom: clean(str(x.dateFrom)),
      dateTo: clean(str(x.dateTo)),
      description: check(clean(str(x.description))),
      bullets: cleanList(list(x.bullets)),
    };
  });

  return {
    cv: {
      candidateName: clean(str(raw.candidateName)),
      executiveSummary: "",
      profile: check(clean(str(raw.profile))),
      skills: cleanList(list(raw.skills)),
      experience,
      qualifications: cleanList(list(raw.qualifications)),
      languages: cleanList(list(raw.languages)),
    },
    unverified,
  };
}
