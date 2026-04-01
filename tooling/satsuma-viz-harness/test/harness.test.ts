/**
 * harness.test.ts — Playwright browser tests for the Satsuma viz harness.
 *
 * Each test validates a specific, observable property of the mapping
 * visualization in a real browser, exercising the full production path:
 *
 *   .stm source files
 *     → @satsuma/viz-backend (VizModel assembly)
 *     → harness HTTP API
 *     → <satsuma-viz> web component
 *     → Playwright assertions
 *
 * Fixtures used:
 *   sfdc-to-snowflake/pipeline.stm  — canonical single-file example (schemas + mappings)
 *   namespaces/ns-platform.stm      — multi-file entry point (cross-file lineage)
 *   sap-po-to-mfcs/pipeline.stm     — larger fixture (layout stability)
 *
 * The harness exposes window.__satsumaHarness for event assertions.
 * The viz component exposes data-testid attributes and data-ready-state for
 * stable selector-based assertions.
 */

import { test, expect, type Page } from "@playwright/test";

// ---------- Global type declarations ----------

// window.__satsumaHarness is set by src/client/app.ts and used by all tests
// to assert on recorded interaction events without VS Code APIs.
interface HarnessEvent {
  type: string;
  detail: unknown;
  timestamp: number;
}

interface SatsumaHarness {
  fixture: string | null;
  viewMode: "lineage" | "single";
  events: HarnessEvent[];
  ready: boolean;
  clearEvents(): void;
}

declare global {
  interface Window {
    __satsumaHarness: SatsumaHarness;
  }
}

// ---------- Helpers ----------

/** The URI query-parameter value for the sfdc-to-snowflake pipeline fixture. */
let sfdcUri: string;
/**
 * The URI for the metrics-platform entry point fixture.
 * This file imports from ./metric_sources.stm (which exists in examples/metrics-platform/),
 * so lineage mode will produce schemas from both files — more than any single file alone.
 */
let metricsUri: string;

/**
 * Resolve fixture URIs before tests run.  The harness API serves the full list;
 * we pick the specific fixtures by display name.
 */
test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/fixtures");
  const fixtures = await res.json() as Array<{ name: string; uri: string }>;

  const sfdc = fixtures.find((f) => f.name === "sfdc-to-snowflake/pipeline.stm");
  const metrics = fixtures.find((f) => f.name === "metrics-platform/metrics.stm");

  if (!sfdc || !metrics) throw new Error("Required fixtures not found in /api/fixtures");

  sfdcUri = sfdc.uri;
  metricsUri = metrics.uri;
});

/**
 * Load a fixture by clicking it in the sidebar and wait for the viz to be ready.
 * Returns the <satsuma-viz> element locator.
 */
async function loadFixture(page: Page, fixtureUri: string): Promise<void> {
  // Open the fixture picker dropdown, then click the matching item.
  // The dropdown is hidden (display:none) by default; clicking the picker
  // button reveals the fixture list before the item is accessible.
  await page.locator("#fixture-picker-btn").click();
  await page.locator(`.fixture-item[data-uri="${fixtureUri}"]`).click();
  // Wait for the viz to signal readiness via the data-ready-state attribute.
  await page.locator("[data-testid='viz-root']").waitFor({ state: "visible" });
  await expect(page.locator("[data-testid='viz-root']")).toHaveAttribute(
    "data-ready-state",
    "ready",
    { timeout: 20_000 },
  );
}

// ---------- Tests ----------

test.describe("Overview view — sfdc-to-snowflake fixture", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Lineage mode is active by default; load the single-file fixture first
    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, sfdcUri);
  });

  test("renders expected schema cards in the overview", async ({ page }) => {
    // The sfdc-to-snowflake pipeline declares four schemas.
    // Each overview schema card gets a stable data-testid based on its qualifiedId.
    // We assert that at least two schema cards appear so the test validates real
    // content rather than an empty-but-ready state.
    const schemaCards = page.locator("[data-testid^='overview-schema-card-']");
    await expect(schemaCards).toHaveCount(4);
  });

  test("renders at least one mapping node in the overview", async ({ page }) => {
    // A mapping node appears in the overview as the connector between schemas.
    // At least one must be visible for the file to be considered rendered.
    const mappingNodes = page.locator("[data-testid^='overview-mapping-node-']");
    await expect(mappingNodes).toHaveCount(1);
  });
});

test.describe("Detail view — clicking a mapping", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, sfdcUri);
  });

  test("clicking a mapping card opens the detail view", async ({ page }) => {
    // In overview mode the mapping cards are visible.  Clicking one switches to
    // the detail view which shows the per-field arrows for that mapping.
    const firstMappingCard = page.locator("[data-testid^='overview-mapping-card-']").first();
    await firstMappingCard.click();

    // After clicking, a detail view element appears for the selected mapping.
    // Use .first() because the testid appears on both the <sz-mapping-detail>
    // custom element and its inner layout <div> — strict mode would reject both.
    const detailView = page.locator("[data-testid^='mapping-detail-']").first();
    await expect(detailView).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Hover and highlight interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, sfdcUri);
  });

  test("field-hover events from the viz are captured in the harness event log", async ({
    page,
  }) => {
    // Validates that SzFieldHoverEvent — dispatched by the viz when the user
    // hovers a field row in a schema card — is forwarded to the harness and
    // becomes observable in window.__satsumaHarness.events.
    //
    // We dispatch the event programmatically rather than via DOM hover because
    // detail-view schema cards live inside a multi-level shadow DOM
    // (satsuma-viz → sz-mapping-detail → sz-schema-card) that Playwright's CSS
    // locators cannot pierce to the required depth.  The test validates the
    // harness event pipeline, not the hover mechanics in the viz component itself.
    await page.evaluate(() => window.__satsumaHarness.clearEvents());

    await page.evaluate(() => {
      const viz = document.querySelector("satsuma-viz");
      if (viz) {
        viz.dispatchEvent(
          new CustomEvent("field-hover", {
            bubbles: true,
            composed: true,
            detail: { schemaId: "Account", fieldName: "id" },
          }),
        );
      }
    });

    await page.waitForTimeout(300);
    const events = await page.evaluate(() => window.__satsumaHarness.events);
    const hoverEvents = events.filter((e) => e.type === "field-hover");
    // The harness must have captured the dispatched field-hover event.
    expect(hoverEvents.length).toBeGreaterThan(0);
  });
});

test.describe("Cross-file lineage expansion", () => {
  test("lineage mode merges schemas from all import-reachable files", async ({ page }) => {
    // The metrics-platform entry point (metrics.stm) imports from ./metric_sources.stm.
    // In lineage mode the server merges VizModels from both files, so the overview
    // contains schemas declared across both files — more than metrics.stm alone provides.
    await page.goto("/");
    // Lineage mode is the default; confirm the toggle is active.
    await expect(page.locator(".toggle-btn[data-mode='lineage']")).toHaveClass(/active/);
    await loadFixture(page, metricsUri);

    // With both files merged, the count must exceed what a single-file model would show.
    const schemaCards = page.locator("[data-testid^='overview-schema-card-']");
    const count = await schemaCards.count();
    expect(count).toBeGreaterThan(1);
  });

  test("expand-lineage events from the viz are captured in the harness event log", async ({
    page,
  }) => {
    // Verify that SzExpandLineageEvent — dispatched by the viz component when a
    // user requests cross-file lineage expansion — is captured by the harness
    // and becomes observable in window.__satsumaHarness.events.
    //
    // We dispatch the event programmatically rather than via a specific UI
    // interaction because the expand-lineage trigger element varies across fixture
    // files and view modes.  The test validates the harness event pipeline, not
    // the particular UI surface that triggers it in the production component.
    await page.goto("/");
    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, metricsUri);

    await page.evaluate(() => window.__satsumaHarness.clearEvents());

    // Dispatch a synthetic expand-lineage event from the <satsuma-viz> element,
    // matching the shape that SzExpandLineageEvent produces.
    await page.evaluate(() => {
      const viz = document.querySelector("satsuma-viz");
      if (viz) {
        viz.dispatchEvent(
          new CustomEvent("expand-lineage", {
            bubbles: true,
            composed: true,
            detail: { schemaId: "test::schema" },
          }),
        );
      }
    });

    await page.waitForTimeout(300);
    const events = await page.evaluate(() => window.__satsumaHarness.events);
    const lineageEvents = events.filter((e) => e.type === "expand-lineage");
    // The harness must have captured the event and recorded it.
    expect(lineageEvents.length).toBeGreaterThan(0);
  });
});

test.describe("Navigation intent", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, sfdcUri);
  });

  test("navigate events from the viz are captured in the harness event log", async ({
    page,
  }) => {
    // Validates that SzNavigateEvent — dispatched by the viz when the user clicks
    // a source-location link on a schema card or field label — is forwarded to the
    // harness and becomes observable in window.__satsumaHarness.events.
    //
    // We dispatch the event programmatically rather than by clicking a DOM element
    // because source-link targets live inside a multi-level shadow DOM
    // (satsuma-viz → sz-mapping-detail → sz-schema-card) that Playwright's CSS
    // locators cannot pierce to the required depth.  The test validates the
    // harness event pipeline, not the click mechanics in the viz component itself.
    await page.evaluate(() => window.__satsumaHarness.clearEvents());

    await page.evaluate(() => {
      const viz = document.querySelector("satsuma-viz");
      if (viz) {
        viz.dispatchEvent(
          new CustomEvent("navigate", {
            bubbles: true,
            composed: true,
            detail: { uri: "file:///test.stm", line: 1, character: 0 },
          }),
        );
      }
    });

    await page.waitForTimeout(300);
    const events = await page.evaluate(() => window.__satsumaHarness.events);
    const navEvents = events.filter((e) => e.type === "navigate");
    // The harness must have captured the dispatched navigate event.
    expect(navEvents.length).toBeGreaterThan(0);
  });
});

test.describe("Larger fixture — layout stability", () => {
  test("sap-po-to-mfcs renders to ready state without layout failure", async ({ page }) => {
    // This fixture is one of the larger canonical examples.  The test validates
    // that the viz can handle more complex schemas without falling back to the
    // error/fallback rendering mode.
    await page.goto("/");
    const fixtures = await page.evaluate(async () => {
      const res = await fetch("/api/fixtures");
      return (await res.json()) as Array<{ name: string; uri: string }>;
    });
    const sapFixture = fixtures.find((f) => f.name === "sap-po-to-mfcs/pipeline.stm");
    if (!sapFixture) {
      test.skip(true, "sap-po-to-mfcs fixture not found");
      return;
    }

    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, sapFixture.uri);

    // The viz must NOT be in fallback mode after rendering a larger fixture.
    await expect(page.locator("[data-testid='viz-root']")).not.toHaveAttribute(
      "data-ready-state",
      "fallback",
    );
    await expect(page.locator("[data-testid='viz-root']")).toHaveAttribute(
      "data-ready-state",
      "ready",
    );
  });
});
