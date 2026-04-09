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

/**
 * Return recorded harness events of a specific type.
 * The function is intentionally small so event payload assertions stay
 * focused on the user interaction each test performs.
 */
async function recordedEvents(page: Page, type: string): Promise<HarnessEvent[]> {
  return page.evaluate(
    (eventType) => window.__satsumaHarness.events.filter((event) => event.type === eventType),
    type,
  );
}

/**
 * Open the first overview mapping card and wait for the mapping detail view.
 */
async function openFirstMappingDetail(page: Page): Promise<void> {
  await page.locator("[data-testid^='overview-mapping-card-']").first().click();
  await expect(page.locator("[data-testid^='mapping-detail-']").first()).toBeVisible({
    timeout: 10_000,
  });
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
    // A real field hover exercises the production SzFieldHoverEvent path and
    // proves the harness normalizes schemaId/fieldName from event properties.
    await openFirstMappingDetail(page);
    await page.evaluate(() => window.__satsumaHarness.clearEvents());

    // After sl-eikr the source/target schema cards inside the mapping detail
    // use prefixes like `mapping-detail-<mid>-source-schema-card-<sid>` so the
    // top-level `schema-card-field-id` selector no longer matches.  Locate the
    // `Id` field row inside the source column instead — robust to mapping IDs.
    await page
      .locator("[data-testid$='-source-column'] [data-testid$='-field-id']")
      .first()
      .hover();

    await expect.poll(async () => recordedEvents(page, "field-hover")).toContainEqual(
      expect.objectContaining({
        detail: { schemaId: "sfdc_opportunity", fieldName: "Id" },
      }),
    );
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
    // Use nth(1) as a retrying assertion — the lineage model includes schemas from
    // both metrics.stm and metric_sources.stm, so at least two cards must appear.
    // A bare .count() is a point-in-time snapshot that races with layout completion.
    const schemaCards = page.locator("[data-testid^='overview-schema-card-']");
    await expect(schemaCards.nth(1)).toBeVisible({ timeout: 20_000 });
  });

  test("expand-lineage events from the viz are captured in the harness event log", async ({
    page,
  }) => {
    // RECORDER COMPATIBILITY TEST (the only synthetic-event test in this suite).
    // SzExpandLineageEvent is defined in @satsuma/viz but no UI control
    // currently dispatches it — it exists for future "expand to lineage from
    // here" affordances.  Until that control lands we still want to guarantee
    // the harness recorder normalizes the production Event-property shape
    // (not CustomEvent.detail), so this test dispatches a production-shaped
    // Event directly on <satsuma-viz>.  Replace with a real interaction once
    // an expand-lineage control exists in the UI.
    await page.goto("/");
    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, metricsUri);

    await page.evaluate(() => window.__satsumaHarness.clearEvents());

    await page.evaluate(() => {
      const viz = document.querySelector("satsuma-viz");
      if (viz) {
        const event = new Event("expand-lineage", { bubbles: true, composed: true });
        Object.defineProperty(event, "schemaId", { value: "test::schema" });
        viz.dispatchEvent(event);
      }
    });

    await expect.poll(async () => recordedEvents(page, "expand-lineage")).toContainEqual(
      expect.objectContaining({ detail: { schemaId: "test::schema" } }),
    );
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
    // A real overview schema-header click dispatches SzNavigateEvent with a
    // SourceLocation property; the harness must normalize it to stable JSON.
    await page.evaluate(() => window.__satsumaHarness.clearEvents());

    await page.locator("[data-testid='overview-schema-card-sfdc-opportunity']").click();

    await expect.poll(async () => recordedEvents(page, "navigate")).toContainEqual(
      expect.objectContaining({
        detail: expect.objectContaining({
          uri: expect.stringContaining("sfdc-to-snowflake/pipeline.stm"),
          line: expect.any(Number),
          character: expect.any(Number),
        }),
      }),
    );
  });

  test("field-lineage events from the viz are captured in the harness event log", async ({
    page,
  }) => {
    // A real field-lineage button click dispatches SzFieldLineageEvent with
    // field identity properties that the harness must preserve as JSON.
    await openFirstMappingDetail(page);
    await page.evaluate(() => window.__satsumaHarness.clearEvents());

    // Same selector update as the field-hover test: source column scoped, then
    // the `-field-id` row, then the per-field lineage button (suffix `-lineage`).
    const fieldRow = page
      .locator("[data-testid$='-source-column'] [data-testid$='-field-id']")
      .first();
    await fieldRow.hover();
    await fieldRow.locator("[data-testid$='-field-id-lineage']").click();

    await expect.poll(async () => recordedEvents(page, "field-lineage")).toContainEqual(
      expect.objectContaining({
        detail: { schemaId: "sfdc_opportunity", fieldName: "Id" },
      }),
    );
  });

  test("clicking an arrow row in the mapping detail records a navigate event", async ({
    page,
  }) => {
    // Each arrow row in the mapping detail table is wired to _navigate(arrow.location)
    // (sz-mapping-detail.ts:645). A real click must therefore round-trip through
    // SzNavigateEvent and surface as a `navigate` event in the harness recorder
    // with the source location of that specific arrow row.  This validates the
    // arrow-row → navigation production path end-to-end without any synthetic
    // event dispatch.
    await openFirstMappingDetail(page);
    await page.evaluate(() => window.__satsumaHarness.clearEvents());

    await page
      .locator("[data-testid^='mapping-detail-'][data-testid*='-arrow-row-']")
      .first()
      .click();

    await expect.poll(async () => recordedEvents(page, "navigate")).toContainEqual(
      expect.objectContaining({
        detail: expect.objectContaining({
          uri: expect.stringContaining("sfdc-to-snowflake/pipeline.stm"),
          line: expect.any(Number),
          character: expect.any(Number),
        }),
      }),
    );
  });

  test("export events from the viz are captured in the harness event log", async ({ page }) => {
    // A real toolbar export click emits SVG content through CustomEvent.detail;
    // the recorder should preserve that supported CustomEvent payload shape.
    await page.evaluate(() => window.__satsumaHarness.clearEvents());

    await page.locator("[data-testid='toolbar-export']").click();

    await expect.poll(async () => recordedEvents(page, "export")).toContainEqual(
      expect.objectContaining({
        detail: expect.objectContaining({
          format: "svg",
          content: expect.stringContaining("<svg"),
        }),
      }),
    );
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
