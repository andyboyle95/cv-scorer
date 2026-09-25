import { describe, expect, it } from "vitest";
import { toTitleCaseFileName } from "./utils";

// CV downloads are named after the candidate, and recruiters send these
// files straight to clients, so the name must read like a name.

describe("toTitleCaseFileName", () => {
  it("title-cases a typed name", () => {
    expect(toTitleCaseFileName("Jack Dowman")).toBe("Jack-Dowman");
    expect(toTitleCaseFileName("jack dowman")).toBe("Jack-Dowman");
  });

  it("title-cases an all-caps name (common on imported CVs)", () => {
    expect(toTitleCaseFileName("JACK DOWMAN")).toBe("Jack-Dowman");
    expect(toTitleCaseFileName("JACK LI")).toBe("Jack-Li");
    expect(toTitleCaseFileName("Jean DUPONT")).toBe("Jean-Dupont");
  });

  it("keeps inner capitals of mixed-case names", () => {
    expect(toTitleCaseFileName("Sarah McDonald")).toBe("Sarah-McDonald");
    expect(toTitleCaseFileName("danny DeVito")).toBe("Danny-DeVito");
  });

  it("keeps initials in capitals", () => {
    expect(toTitleCaseFileName("AJ Smith")).toBe("AJ-Smith");
  });

  it("joins every word with a single hyphen, trimming stray punctuation", () => {
    expect(toTitleCaseFileName("Lavinia - Cristina Goran")).toBe("Lavinia-Cristina-Goran");
    expect(toTitleCaseFileName("  Mary-Jane  O'Neil. ")).toBe("Mary-Jane-O-Neil");
  });

  it("folds accents instead of dropping the letter", () => {
    expect(toTitleCaseFileName("José García")).toBe("Jose-Garcia");
    expect(toTitleCaseFileName("ZOË MÜLLER")).toBe("Zoe-Muller");
  });

  it("falls back when there is no usable name", () => {
    expect(toTitleCaseFileName("")).toBe("CV");
    expect(toTitleCaseFileName(undefined)).toBe("CV");
    expect(toTitleCaseFileName(" - ")).toBe("CV");
  });
});
