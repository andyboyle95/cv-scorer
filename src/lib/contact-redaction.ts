// Finds candidate contact details (email, phone, LinkedIn / web links, home
// address) in a single line of CV text. Used by both client-CV exports, so the
// candidate's own wording is kept and only contact details are taken out.

export type Range = [number, number];

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi;

const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s|•·,;()<>]+|\b(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s|•·,;()<>]*|\bgithub\.com\/[^\s|•·,;()<>]*/gi;

// UK numbers (07700 900123, +44 (0)7700 900 123, 020 7946 0958) and
// international numbers that start with "+". A digit count check below stops
// dates and salaries from matching.
const PHONE = /(?<![\w£$€.,])(?:\+\d{1,3}[\s.-]?(?:\(0\)[\s.-]?)?|\(?0)\d[\d\s().-]{7,16}\d(?!\d)/g;

const UK_POSTCODE = /\b(?:GIR ?0AA|[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]? ?\d[ABD-HJLNP-UW-Z]{2})\b/g;

const STREET =
  /\b\d{1,4}[A-Za-z]?,?\s+(?:[A-Z][A-Za-z'-]+\s+){1,3}(?:Road|Rd|Street|St|Lane|Ln|Avenue|Ave|Close|Drive|Dr|Way|Crescent|Cres|Court|Ct|Place|Pl|Gardens|Gdns|Terrace|Grove|Square|Sq|Mews|Hill|Park|View|Row|Walk|Rise|Green|Parade|Boulevard)\b\.?/g;

// "Email: ...", "Mobile - ...", "Address: ..." style labels. Everything after
// the label to the next separator is contact data.
const LABELLED =
  /\b(?:home\s+address|address|e-?mail|tel(?:ephone)?|phone|mobile|mob|cell|linked\s?in|contact(?:\s+(?:number|details))?)(?:\s*:\s*|\s+[–-]\s+)/gi;

// Separators people use to put contact details on one line.
const SEPARATOR = /\s*(?:[|•·▪●◦⋅/]|\t| {3,})\s*/;
const SEPARATOR_GLOBAL = new RegExp(SEPARATOR.source, "g");

const LABEL_BEFORE =
  /(?:\b(?:e-?mail|tel(?:ephone)?|phone|mobile|mob|cell|linked\s?in|web(?:site)?|address|[TMEPW])\s*[:.]\s*|\b(?:e-?mail|tel(?:ephone)?|phone|mobile|mob|linkedin)\s+)$/i;

function digitCount(s: string) {
  return (s.match(/\d/g) ?? []).length;
}

// Start and end of the separator-delimited segment that contains index i.
function segmentAround(line: string, start: number, end: number): Range {
  let s = 0;
  let e = line.length;
  SEPARATOR_GLOBAL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SEPARATOR_GLOBAL.exec(line))) {
    const mEnd = m.index + m[0].length;
    if (mEnd <= start) s = mEnd;
    else if (m.index >= end) {
      e = m.index;
      break;
    }
    if (m[0].length === 0) SEPARATOR_GLOBAL.lastIndex++;
  }
  return [s, e];
}

function merge(ranges: Range[]): Range[] {
  const sorted = ranges.filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

// A line that is only a contact label or heading ("Mobile", "Email:", "CONTACT").
const LABEL_ONLY =
  /^\s*(?:contact(?:\s+(?:details|information|info|me))?|e-?mail(?:\s+address)?|tel(?:ephone)?|phone(?:\s+number)?|mobile(?:\s+number)?|mob|linked\s?in(?:\s+profile)?|(?:home\s+)?address)\s*[:.]?\s*$/i;

/** Character ranges in `line` that hold contact details. */
export function findContactRanges(line: string): Range[] {
  if (LABEL_ONLY.test(line)) return [[0, line.length]];
  const ranges: Range[] = [];
  const add = (re: RegExp, wholeSegment = false, check?: (m: string) => boolean) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      if (check && !check(m[0])) continue;
      const start = m.index;
      const end = start + m[0].length;
      ranges.push(wholeSegment ? segmentAround(line, start, end) : [start, end]);
    }
  };

  add(EMAIL);
  add(URL_PATTERN);
  add(PHONE, false, (m) => {
    const d = digitCount(m);
    return d >= 10 && d <= 15;
  });
  // Addresses are not one pattern, so take the full segment that holds a
  // postcode or a street name.
  add(UK_POSTCODE, true);
  add(STREET, true);

  // Labelled values ("Email: x", "Address: 1 High St, Leeds")
  LABELLED.lastIndex = 0;
  let lm: RegExpExecArray | null;
  while ((lm = LABELLED.exec(line))) {
    const [, segEnd] = segmentAround(line, lm.index, lm.index + lm[0].length);
    // For "Address:" the value often contains commas; take the rest of the segment.
    ranges.push([lm.index, Math.max(segEnd, lm.index + lm[0].length)]);
  }

  if (ranges.length === 0) return [];

  // Grow each range to take a label in front of it ("Email: ", "M: ") and one
  // separator next to it, so the line does not end up as " |  | ".
  const grown = merge(ranges).map(([s, e]): Range => {
    const before = line.slice(0, s);
    const label = before.match(LABEL_BEFORE);
    if (label) s -= label[0].length;
    const after = line.slice(e).match(new RegExp("^" + SEPARATOR.source));
    const prev = line.slice(0, s).match(new RegExp(SEPARATOR.source + "$"));
    if (after && after[0].length > 0) e += after[0].length;
    else if (prev && prev[0].length > 0) s -= prev[0].length;
    return [s, e];
  });

  // A range at the start or end of the line also takes the separator on its
  // open side ("London | 07700 900123" becomes "London").
  const merged = merge(grown).map(([s, e]): Range => {
    if (line.slice(e).trim() === "") {
      const prev = line.slice(0, s).match(new RegExp(SEPARATOR.source + "$"));
      if (prev) s -= prev[0].length;
    }
    if (line.slice(0, s).trim() === "") {
      const after = line.slice(e).match(new RegExp("^" + SEPARATOR.source));
      if (after) e += after[0].length;
    }
    return [s, e];
  });

  // If what is left is only punctuation, icons or labels, take the full line.
  let rest = "";
  let pos = 0;
  for (const [s, e] of merged) {
    rest += line.slice(pos, s);
    pos = e;
  }
  rest += line.slice(pos);
  const leftover = rest
    .replace(/\b(?:contact(?:\s+details)?|e-?mail|tel|phone|mobile|address|linkedin|[TMEPW])\s*[:.]?/gi, "")
    .replace(/[\s|•·▪●◦⋅/,;:()\-–\p{So}\p{Co}]/gu, "");
  if (leftover.length === 0) return [[0, line.length]];

  return merged;
}

/** Remove contact details from multi-line text, keeping everything else exactly as written. */
export function redactText(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const ranges = findContactRanges(line);
      if (ranges.length === 0) return line;
      let out = "";
      let pos = 0;
      for (const [s, e] of ranges) {
        out += line.slice(pos, s);
        pos = e;
      }
      out += line.slice(pos);
      return out.replace(/\s+$/, "");
    })
    .join("\n");
}

/** Safe filename for a candidate's client CV. */
export function clientCvFileName(candidateName: string, ext: string) {
  const safe = candidateName.replace(/[\\/:*?"<>|]+/g, "").trim() || "Candidate";
  return `${safe} - CV.${ext}`;
}

/**
 * A piece of a paragraph. Pieces with `set` hold editable text; pieces without
 * it (tabs, line breaks) only give context to the pattern matching.
 */
export interface TextPiece {
  text: string;
  set?: (text: string) => void;
}

/**
 * Remove contact details from a paragraph that is split over several text
 * nodes (Word runs, HTML text nodes). Formatting of each node is kept; only the
 * characters that hold contact details are taken out. Returns true if
 * something changed.
 */
export function redactPieces(pieces: TextPiece[]): boolean {
  const full = pieces.map((p) => p.text).join("");
  if (!full.trim()) return false;

  const ranges: Range[] = [];
  let offset = 0;
  for (const line of full.split("\n")) {
    for (const [s, e] of findContactRanges(line)) ranges.push([s + offset, e + offset]);
    offset += line.length + 1;
  }
  if (ranges.length === 0) return false;

  let pos = 0;
  for (const piece of pieces) {
    const start = pos;
    const end = pos + piece.text.length;
    pos = end;
    if (!piece.set) continue;
    let out = "";
    let changed = false;
    for (let i = start; i < end; i++) {
      if (ranges.some(([s, e]) => i >= s && i < e)) changed = true;
      else out += full[i];
    }
    if (changed) piece.set(out);
  }
  return true;
}

/** True for links that point at the candidate (email, phone, LinkedIn, GitHub). */
export function isContactLink(href: string): boolean {
  return /^(?:mailto:|tel:|sms:)|linkedin\.com|github\.com/i.test(href.trim());
}
