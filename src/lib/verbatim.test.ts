import { describe, expect, it } from "vitest";
import { finaliseVerbatim, isVerbatim } from "./verbatim";
import { redactText } from "./contact-redaction";

const SOURCE = `Jane Smith
07700 900123 | jane.smith@example.com | linkedin.com/in/janesmith | Leeds
PROFILE
Results-driven SaaS seller with 8 years' experience selling into
mid-market finance teams.
EXPERIENCE
Account Executive – FinCloud Ltd, Jan 2019 – Present
• Closed £1.4m new ARR in FY2023 (142% of quota)
• Average deal size £85k, 4–6 month cycles`;

describe("isVerbatim", () => {
  it("accepts text copied across a line break, with different quotes and dashes", () => {
    expect(isVerbatim("Results-driven SaaS seller with 8 years’ experience selling into mid-market finance teams.", SOURCE)).toBe(true);
    expect(isVerbatim("Average deal size £85k, 4-6 month cycles", SOURCE)).toBe(true);
  });

  it("rejects reworded or added text", () => {
    expect(isVerbatim("Results-driven SaaS seller with 8 years of experience", SOURCE)).toBe(false);
    expect(isVerbatim("Closed £1.4m new ARR in FY2023 (142% of quota), a team record", SOURCE)).toBe(false);
  });
});

describe("finaliseVerbatim", () => {
  it("drops any executive summary and flags lines that are not in the CV", () => {
    const { cv, unverified } = finaliseVerbatim(
      {
        candidateName: "Jane Smith",
        executiveSummary: "Jane is an exceptional seller.",
        profile: "Results-driven SaaS seller with 8 years' experience selling into mid-market finance teams.",
        skills: [],
        experience: [
          {
            company: "FinCloud Ltd",
            role: "Account Executive",
            dateFrom: "Jan 2019",
            dateTo: "Present",
            description: "",
            bullets: ["Closed £1.4m new ARR in FY2023 (142% of quota)", "Consistently exceeded targets"],
          },
        ],
        qualifications: [],
        languages: [],
      },
      SOURCE,
    );
    expect(cv.executiveSummary).toBe("");
    expect(cv.experience[0].bullets).toHaveLength(2);
    expect(unverified).toEqual(["Consistently exceeded targets"]);
  });

  it("removes contact details that slip into a field", () => {
    const { cv } = finaliseVerbatim(
      { candidateName: "Jane Smith", profile: "Call me on 07700 900123 | jane.smith@example.com", experience: [] },
      SOURCE,
    );
    expect(cv.profile).toBe("Call me on");
  });
});

describe("redactText", () => {
  it("removes email, phone and LinkedIn but keeps the town", () => {
    expect(redactText("07700 900123 | jane.smith@example.com | linkedin.com/in/janesmith | Leeds")).toBe("Leeds");
  });

  it("does not touch dates, money or ordinary words", () => {
    const line = "Achieved 134% of £1,200,000 quota in FY2022 (2021 - 2022). Telephone-based sales.";
    expect(redactText(line)).toBe(line);
  });

  it("removes a UK address line", () => {
    expect(redactText("Address: Flat 3, 22 King Street, Manchester M2 4LQ")).toBe("");
  });
});
