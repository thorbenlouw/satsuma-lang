/**
 * playwright.config.ts — Playwright configuration for the Satsuma viz harness.
 *
 * Runs browser-based end-to-end tests against the harness server.  The server
 * is started automatically via webServer and torn down at the end of the run.
 *
 * Playwright execution is a required local developer-machine workflow for
 * Feature 29.  It is intentionally kept out of CI for this feature (see
 * features/29-viz-harness-and-shared-backend/PRD.md).
 *
 * To run:  npx playwright install --with-deps chromium  (first time)
 *          npm test  (subsequent runs)
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  /* Maximum time one test can run */
  timeout: 30_000,
  /* Retry on CI, not locally */
  retries: 0,
  /* Reporter: show each test name with status */
  reporter: "list",
  use: {
    baseURL: "http://localhost:3333",
    /* Capture trace on failure for debugging */
    trace: "on-first-retry",
  },
  projects: [
    {
      // Firefox is used because Chromium headless-shell and WebKit both segfault
      // in SwiftShader on some macOS ARM configurations.  Firefox's headless mode
      // does not depend on SwiftShader and runs reliably in this environment.
      // Both browsers exercise the same satsuma-viz web component code paths;
      // the choice of browser does not affect what the tests validate.
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
  /* Start the harness server before tests, shut it down after */
  webServer: {
    command: "node dist/server.js",
    url: "http://localhost:3333",
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
