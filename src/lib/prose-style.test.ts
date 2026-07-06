import { describe, expect, it } from "vitest";
import { sanitizeProse, sanitizeProseList, HUMAN_STYLE_RULES } from "./prose-style";

// Guards on the anti-AI-tell logic — this is a genuine differentiator for
// the product ("prose that doesn't read as AI-written"), and any silent
// regression here would let em dashes slip into a client-facing CV. That's
// a non-negotiable brand thing worth locking in with tests.

describe("sanitizeProse — em dashes", () => {
  it("replaces a single em dash between words with a comma", () => {
    expect(sanitizeProse("strong performer — closing £1M annually")).toBe(
      "strong performer, closing £1M annually",
    );
  });

  it("handles em dashes at the start/end of a phrase", () => {
    expect(sanitizeProse("cold — dark — lonely")).toBe("cold, dark, lonely");
  });

  it("removes multiple em dashes in a run", () => {
    expect(sanitizeProse("A—B—C—D")).toBe("A, B, C, D");
  });

  it("folds double comma resulting from adjacent comma+em dash", () => {
    // "cold, — dark" → naive replacement leaves ", , dark" which reads wrong
    expect(sanitizeProse("It was cold, — dark, and lonely.")).toBe(
      "It was cold, dark, and lonely.",
    );
  });

  it("doesn't touch text that has no em dashes", () => {
    const input = "A straightforward sentence without special punctuation.";
    expect(sanitizeProse(input)).toBe(input);
  });
});

describe("sanitizeProse — en dashes", () => {
  it("preserves numeric year ranges (essential — date ranges are legitimate)", () => {
    expect(sanitizeProse("2018–2022 was a strong stretch.")).toBe(
      "2018–2022 was a strong stretch.",
    );
  });

  it("preserves time ranges", () => {
    expect(sanitizeProse("9am–5pm shifts")).toBe("9am–5pm shifts");
  });

  it("strips stylistic en dashes between words (word–word)", () => {
    expect(sanitizeProse("closes deals – wins clients")).toBe("closes deals, wins clients");
  });

  it("does NOT alter en dashes surrounded by digits, even mixed with letters", () => {
    // "Jan 2018–Dec 2022" — en dash between digits should stay
    expect(sanitizeProse("Jan 2018–Dec 2022 stretch")).toBe("Jan 2018–Dec 2022 stretch");
  });
});

describe("sanitizeProse — edge cases", () => {
  it("returns empty string for null/undefined without throwing", () => {
    expect(sanitizeProse(null)).toBe("");
    expect(sanitizeProse(undefined)).toBe("");
    expect(sanitizeProse("")).toBe("");
  });

  it("trims leading/trailing whitespace", () => {
    expect(sanitizeProse("  A sentence.  ")).toBe("A sentence.");
  });

  it("preserves internal single spaces", () => {
    expect(sanitizeProse("word one word two")).toBe("word one word two");
  });

  it("collapses runs of internal whitespace to one space", () => {
    expect(sanitizeProse("word   one    word")).toBe("word one word");
  });

  it("removes leading space before common punctuation from em-dash replacement", () => {
    // "text — ." would become "text, ." → we tidy to "text."
    expect(sanitizeProse("text — .")).toBe("text.");
  });
});

describe("sanitizeProseList", () => {
  it("maps sanitize over each item", () => {
    expect(sanitizeProseList(["strong — closer", "buy-side deals"])).toEqual([
      "strong, closer",
      "buy-side deals",
    ]);
  });

  it("drops empty strings after sanitising", () => {
    expect(sanitizeProseList(["", "   ", "kept"])).toEqual(["kept"]);
  });

  it("returns [] for null/undefined", () => {
    expect(sanitizeProseList(null)).toEqual([]);
    expect(sanitizeProseList(undefined)).toEqual([]);
  });
});

describe("HUMAN_STYLE_RULES", () => {
  it("is a non-empty prompt block", () => {
    expect(HUMAN_STYLE_RULES.length).toBeGreaterThan(200);
  });

  it("mentions em dashes explicitly", () => {
    expect(HUMAN_STYLE_RULES.toLowerCase()).toContain("em dash");
  });

  it("mentions at least three common AI-tell phrases we want banned", () => {
    const lower = HUMAN_STYLE_RULES.toLowerCase();
    const bans = ["delve", "leverage", "utilise", "furthermore", "moreover", "seamlessly"];
    const hits = bans.filter((b) => lower.includes(b));
    expect(hits.length).toBeGreaterThanOrEqual(3);
  });
});
