import { defineConfig } from "@playwright/test";

// Playwright config — targets Chromium only (that's where our users are).
// The smoke test starts the Next.js dev server locally with auth
// bypassed via TEST_AUTH_BYPASS=1 (belt-and-braces guarded against
// production in the middleware itself).

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    // Start the dev server on the port Playwright expects. `next dev`
    // recompiles the middleware, so the TEST_AUTH_BYPASS env var is picked
    // up on startup. No need to build first.
    command: "TEST_AUTH_BYPASS=1 NEXT_PUBLIC_TEST_MODE=1 next dev -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
