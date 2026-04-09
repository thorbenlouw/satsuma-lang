/**
 * screenshots.spec.ts — deterministic screenshot review workflow.
 *
 * This file is intentionally NOT a pass/fail regression suite. It produces
 * named PNG artifacts plus a manifest entry per shot, so a human reviewer (or
 * a VLM fed the manifest as visual context) can mark up rendering issues and
 * file follow-ups against specific fixtures and UI states.
 *
 * Each test step:
 *   1. loads a real fixture through the harness API,
 *   2. drives the UI into a documented state (overview, detail, filter, …),
 *   3. captures a full-page PNG into ./screenshots/, and
 *   4. appends an entry to ./screenshots/manifest.json describing the fixture,
 *      view mode, UI state, viewport, timestamp, and step name.
 *
 * Output is *intentionally* gitignored (see .gitignore in this package). The
 * screenshots are review artifacts, not golden baselines — semantic pass/fail
 * lives in harness.test.ts. See features/30-viz-test-suite-expansion/PRD.md
 * §"Screenshot artifacts for human and VLM review" and ticket sl-mm7v.
 *
 * Run via the screenshots Playwright project:
 *   npx playwright test --project=screenshots
 * In the agent workflow this runs automatically when you trigger the sentinel
 * watcher (watch-and-test.sh runs all projects).
 */

import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------- Output paths ----------

// Screenshots and the manifest are written to a sibling directory of the
// Playwright config so the watcher and contributors can find them in one
// well-known location. The directory is gitignored.
const SCREENSHOT_DIR = join(__dirname, "..", "screenshots");
const MANIFEST_PATH = join(SCREENSHOT_DIR, "manifest.json");

// Single canonical viewport for all review shots. A single size keeps the
// manifest readable and makes side-by-side comparison meaningful. If you need
// a different size for a specific shot, set it on the page in that step and
// record the actual viewport in the manifest entry.
const REVIEW_VIEWPORT = { width: 1440, height: 900 };

// ---------- Manifest ----------

interface ManifestEntry {
  /** Output PNG file name, relative to the screenshots/ directory. */
  file: string;
  /** Fixture path under examples/, as displayed by the harness fixture API. */
  fixture: string;
  /** View mode the harness was in when the shot was taken. */
  viewMode: "single" | "lineage";
  /** Free-form description of the UI state captured (overview, detail, filter, …). */
  uiState: string;
  /** Viewport the shot was rendered at. */
  viewport: { width: number; height: number };
  /** ISO-8601 capture time. */
  timestamp: string;
  /** Playwright test step name (used to correlate shots back to this file). */
  step: string;
}

// In-memory manifest accumulated across all steps in this file. Written to
// disk in afterAll so a partial run still leaves whatever it managed to
// capture, but the file always reflects a single coherent run.
const manifest: ManifestEntry[] = [];

test.beforeAll(() => {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.afterAll(() => {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
});

// ---------- Helpers (mirrors harness.test.ts) ----------

let sfdcUri: string;
let nsPlatformUri: string;
let metricsUri: string;
let reportsUri: string;
let ffgUri: string;
let sapUri: string;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/fixtures");
  const fixtures = (await res.json()) as Array<{ name: string; uri: string }>;
  const find = (name: string) => {
    const f = fixtures.find((entry) => entry.name === name);
    if (!f) throw new Error(`Required fixture not found: ${name}`);
    return f;
  };
  sfdcUri = find("sfdc-to-snowflake/pipeline.stm").uri;
  nsPlatformUri = find("namespaces/ns-platform.stm").uri;
  metricsUri = find("metrics-platform/metrics.stm").uri;
  reportsUri = find("reports-and-models/pipeline.stm").uri;
  ffgUri = find("filter-flatten-governance/filter-flatten-governance.stm").uri;
  sapUri = find("sap-po-to-mfcs/pipeline.stm").uri;
});

async function loadFixture(page: Page, fixtureUri: string): Promise<void> {
  await page.locator("#fixture-picker-btn").click();
  await page.locator(`.fixture-item[data-uri="${fixtureUri}"]`).click();
  await page.locator("[data-testid='viz-root']").waitFor({ state: "visible" });
  await page
    .locator("[data-testid='viz-root']")
    .waitFor({ state: "visible", timeout: 20_000 });
  // Wait for the layout pipeline to finish before screenshotting — otherwise
  // we capture the loading state instead of the rendered viz.
  await page.waitForFunction(
    () => document.querySelector("[data-testid='viz-root']")?.getAttribute("data-ready-state") === "ready",
    null,
    { timeout: 20_000 },
  );
}

async function setSingleFileMode(page: Page): Promise<void> {
  await page.locator(".toggle-btn[data-mode='single']").click();
}

async function openMapping(page: Page, mappingId: string): Promise<void> {
  await page.locator(`[data-testid='overview-mapping-card-${mappingId}']`).click();
  await page
    .locator(`[data-testid='mapping-detail-${mappingId}']`)
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });
}

async function waitForReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.querySelector("[data-testid='viz-root']")?.getAttribute("data-ready-state") === "ready",
    null,
    { timeout: 15_000 },
  );
}

/**
 * Capture the current page as a named PNG and append a manifest entry.
 * The caller is responsible for driving the UI into the state being captured.
 */
async function capture(
  page: Page,
  args: {
    file: string;
    fixture: string;
    viewMode: "single" | "lineage";
    uiState: string;
    step: string;
  },
): Promise<void> {
  const path = join(SCREENSHOT_DIR, args.file);
  await page.screenshot({ path, fullPage: true });
  manifest.push({
    file: args.file,
    fixture: args.fixture,
    viewMode: args.viewMode,
    uiState: args.uiState,
    viewport: REVIEW_VIEWPORT,
    timestamp: new Date().toISOString(),
    step: args.step,
  });
}

// ---------- Steps ----------
//
// Each test produces exactly one named review artifact from the PRD list.
// Tests are kept independent so a single failure does not block the rest of
// the gallery from being captured.

test.describe("Screenshot review artifacts", () => {
  test.use({ viewport: REVIEW_VIEWPORT });

  test("sfdc-overview-single", async ({ page }) => {
    await page.goto("/");
    await setSingleFileMode(page);
    await loadFixture(page, sfdcUri);
    await capture(page, {
      file: "sfdc-overview-single.png",
      fixture: "sfdc-to-snowflake/pipeline.stm",
      viewMode: "single",
      uiState: "overview",
      step: "sfdc-overview-single",
    });
  });

  test("sfdc-detail-opportunity-ingestion", async ({ page }) => {
    await page.goto("/");
    await setSingleFileMode(page);
    await loadFixture(page, sfdcUri);
    await openMapping(page, "opportunity-ingestion");
    await capture(page, {
      file: "sfdc-detail-opportunity-ingestion.png",
      fixture: "sfdc-to-snowflake/pipeline.stm",
      viewMode: "single",
      uiState: "detail:opportunity-ingestion",
      step: "sfdc-detail-opportunity-ingestion",
    });
  });

  test("namespaces-overview-lineage", async ({ page }) => {
    await page.goto("/");
    // Default mode is lineage; ns-platform shows all namespaces in lineage mode.
    await loadFixture(page, nsPlatformUri);
    await capture(page, {
      file: "namespaces-overview-lineage.png",
      fixture: "namespaces/ns-platform.stm",
      viewMode: "lineage",
      uiState: "overview:all-namespaces",
      step: "namespaces-overview-lineage",
    });
  });

  test("namespaces-detail-namespaced-mapping", async ({ page }) => {
    await page.goto("/");
    await loadFixture(page, nsPlatformUri);
    await openMapping(page, "load-hub-contact");
    await capture(page, {
      file: "namespaces-detail-namespaced-mapping.png",
      fixture: "namespaces/ns-platform.stm",
      viewMode: "lineage",
      uiState: "detail:vault::load-hub-contact",
      step: "namespaces-detail-namespaced-mapping",
    });
  });

  test("metrics-overview-lineage-all-files", async ({ page }) => {
    await page.goto("/");
    await loadFixture(page, metricsUri);
    await capture(page, {
      file: "metrics-overview-lineage-all-files.png",
      fixture: "metrics-platform/metrics.stm",
      viewMode: "lineage",
      uiState: "overview:file-filter=all",
      step: "metrics-overview-lineage-all-files",
    });
  });

  test("metrics-overview-file-filter-sources", async ({ page }) => {
    await page.goto("/");
    await loadFixture(page, metricsUri);

    // Drive the file filter to the metric_sources.stm option, mirroring the
    // approach used in the toolbar file-filter test in harness.test.ts.
    const fileFilter = page.locator("[data-testid='toolbar-file-filter']");
    const options = await fileFilter
      .locator("option")
      .evaluateAll((opts) =>
        (opts as HTMLOptionElement[]).map((o) => ({
          value: o.value,
          label: o.textContent,
        })),
      );
    const sourcesOption = options.find((o) => o.label?.includes("metric_sources.stm"));
    if (!sourcesOption) {
      throw new Error(`metric_sources.stm option not found; got ${JSON.stringify(options)}`);
    }
    await fileFilter.selectOption(sourcesOption.value);
    await waitForReady(page);

    await capture(page, {
      file: "metrics-overview-file-filter-sources.png",
      fixture: "metrics-platform/metrics.stm",
      viewMode: "lineage",
      uiState: "overview:file-filter=metric_sources.stm",
      step: "metrics-overview-file-filter-sources",
    });
  });

  test("reports-overview", async ({ page }) => {
    await page.goto("/");
    await setSingleFileMode(page);
    await loadFixture(page, reportsUri);
    await capture(page, {
      file: "reports-overview.png",
      fixture: "reports-and-models/pipeline.stm",
      viewMode: "single",
      uiState: "overview",
      step: "reports-overview",
    });
  });

  test("filter-flatten-detail-completed-orders", async ({ page }) => {
    await page.goto("/");
    await setSingleFileMode(page);
    await loadFixture(page, ffgUri);
    await openMapping(page, "completed-orders");
    await capture(page, {
      file: "filter-flatten-detail-completed-orders.png",
      fixture: "filter-flatten-governance/filter-flatten-governance.stm",
      viewMode: "single",
      uiState: "detail:completed-orders",
      step: "filter-flatten-detail-completed-orders",
    });
  });

  test("filter-flatten-detail-order-line-facts", async ({ page }) => {
    await page.goto("/");
    await setSingleFileMode(page);
    await loadFixture(page, ffgUri);
    await openMapping(page, "order-line-facts");
    await capture(page, {
      file: "filter-flatten-detail-order-line-facts.png",
      fixture: "filter-flatten-governance/filter-flatten-governance.stm",
      viewMode: "single",
      uiState: "detail:order-line-facts",
      step: "filter-flatten-detail-order-line-facts",
    });
  });

  test("sap-po-layout-stability", async ({ page }) => {
    await page.goto("/");
    await setSingleFileMode(page);
    await loadFixture(page, sapUri);
    await capture(page, {
      file: "sap-po-layout-stability.png",
      fixture: "sap-po-to-mfcs/pipeline.stm",
      viewMode: "single",
      uiState: "overview",
      step: "sap-po-layout-stability",
    });
  });
});
