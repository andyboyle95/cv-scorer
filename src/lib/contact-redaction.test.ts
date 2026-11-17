import { describe, expect, it } from "vitest";
import { redactText } from "./contact-redaction";
import { contactBoxes, visualLines, type PlacedItem } from "./pdf-redaction";

// Two-column CVs: when a sidebar line and a main-column line sit at the same
// height they are joined into one line, with a wide gap between them. Taking
// out a contact detail must never reach across that gap.

describe("redactText — column gaps", () => {
  it("keeps a bullet in the next column (wide gap)", () => {
    expect(redactText("07700 900789   • Closed £2.1m in FY2022")).toBe("• Closed £2.1m in FY2022");
  });

  it("keeps a bullet in the next column (tab)", () => {
    expect(redactText("tom@example.co.uk\t• Built partner channel")).toBe("• Built partner channel");
  });

  it("keeps the bullet line when the contact detail is in the right-hand column", () => {
    expect(redactText("• Closed £2.1m   07700 900789")).toBe("• Closed £2.1m");
  });

  it("still removes inline separators between contact details", () => {
    expect(redactText("07700 900123 | jane@example.com | linkedin.com/in/jane | Leeds")).toBe("Leeds");
    expect(redactText("London, UK • +44 20 7946 0958 • www.janedoe.com")).toBe("London, UK");
  });

  it("removes a line that is only contact details and separators", () => {
    expect(redactText("07700 900789   •   jane@example.com")).toBe("");
  });
});

describe("PDF patches — column gaps", () => {
  const item = (str: string, x: number, width: number): PlacedItem => ({
    str, x, width, baseline: 100, size: 10, hasEOL: false,
  });

  it("does not paint over a bullet in the main column beside a sidebar phone number", () => {
    const sidebarPhone = item("07700 900789", 18, 60);
    const bullet = item("•", 249, 4);
    const text = item("Closed £2.1m in FY2022 across 6 new logos", 260, 190);
    const boxes = contactBoxes(visualLines([sidebarPhone, bullet, text]));

    expect(boxes.length).toBeGreaterThan(0);
    for (const b of boxes) {
      // Every patch stays inside the sidebar, well left of the bullet.
      expect(b.x + b.w).toBeLessThan(bullet.x);
    }
  });

  it("handles PDFs that fill the column gap with one wide space (Chrome / Word export)", () => {
    // Real item layout from a Chrome-printed two-column CV: the gap between
    // the sidebar and the main column is a single " " item 143pt wide.
    const items = [
      item("07700 900789", 18, 62.4),
      item(" ", 80.4, 142.9),
      item("• Closed £2.1m in FY2022 across 6 new logos", 187.5, 199.6),
    ];
    const lines = visualLines(items);
    const boxes = contactBoxes(lines);

    expect(lines[0].text).toMatch(/07700 900789 {3,}• Closed/);
    expect(boxes.length).toBeGreaterThan(0);
    for (const b of boxes) expect(b.x + b.w).toBeLessThan(150);
  });
});
