import { test, expect } from "@playwright/test";

// CV Generator smoke test. Walks the class of flow that has silently
// regressed on us: form → preview reactivity, page break UI, downloads.
// Auth is bypassed via TEST_AUTH_BYPASS=1 (see playwright.config.ts +
// src/middleware.ts). Bypass is guarded against production in the
// middleware itself so this env var is safe to leave on a dev box.

const START_BLANK = "Or start from scratch (type it in yourself)";

test.describe("CV Generator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/generate");
    // The page title should render even if auth ends up doing weird things.
    await expect(page).toHaveTitle(/Aaron Wallis/i);
  });

  test("form edits reflect in the live preview (the frozen-viewData bug)", async ({ page }) => {
    // Start blank so we don't need a real CV import.
    await page.getByRole("button", { name: START_BLANK }).click();

    // The Cover tab shows first — put a candidate name in.
    const nameField = page.getByRole("textbox", { name: /Full Name/i });
    await nameField.fill("Joe Bloggs");

    // Preview should show that name in the CV cover.
    // Give it a beat — preview re-renders on every keystroke.
    await expect(page.locator(".cv-page").first()).toContainText("Joe Bloggs");

    // Also verify a role edit reflects. Switch to the Roles tab.
    await page.getByRole("tab", { name: /^Roles$/i }).click();
    await page.getByRole("button", { name: /Add Role/i }).click();

    // Fill Company field on the newly-created role.
    const companyField = page.getByRole("textbox", { name: /^Company$/i }).first();
    await companyField.fill("Acme Corp");

    // Preview main CV page should now show Acme Corp as an employer.
    await expect(page.locator(".cv-page").nth(1)).toContainText("Acme Corp");
  });

  test("insert page break control appears between roles + preview marker shows", async ({ page }) => {
    await page.getByRole("button", { name: START_BLANK }).click();
    await page.getByRole("tab", { name: /^Roles$/i }).click();

    // Need at least two roles for the break-between control to appear.
    // We seed via Add Role twice; one already exists in BLANK_DATA (empty).
    await page.getByRole("button", { name: /Add Role/i }).click();
    await page.getByRole("button", { name: /Add Role/i }).click();

    // Fill company on both so they render into the preview.
    const companies = page.getByRole("textbox", { name: /^Company$/i });
    await companies.nth(0).fill("Employer One");
    await companies.nth(1).fill("Employer Two");

    // Click the first "Insert page break" between roles.
    await page.getByRole("button", { name: /Insert page break/i }).first().click();

    // The break label should flip to "Page break · click to remove"
    await expect(page.getByRole("button", { name: /Page break · click to remove/i })).toBeVisible();

    // And the preview should show at least one PAGE BREAK marker.
    await expect(page.locator("[data-page-break='true']").first()).toBeVisible();
  });

  test("Download PDF triggers a file download", async ({ page }) => {
    await page.getByRole("button", { name: START_BLANK }).click();
    await page.getByRole("textbox", { name: /Full Name/i }).fill("Test Candidate");

    // Click Download PDF, catch the download event.
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download PDF/i }).click();
    const download = await downloadPromise;

    // Filename slug should come from the candidate name.
    expect(download.suggestedFilename()).toMatch(/test-candidate\.pdf/i);
  });

  test("Download DOCX triggers a file download and doesn't error", async ({ page }) => {
    // The DOCX path has silently failed for us before (file-saver interop,
    // docx heading+border collision). This is the specific test that catches
    // both.
    await page.getByRole("button", { name: START_BLANK }).click();
    await page.getByRole("textbox", { name: /Full Name/i }).fill("DOCX Test");

    // Capture any browser console error so we surface it in the test failure.
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await page.getByRole("button", { name: /^DOCX$/ }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/docx-test\.docx/i);
    expect(consoleErrors, `Console errors during DOCX build: ${consoleErrors.join("; ")}`).toEqual([]);
  });
});
