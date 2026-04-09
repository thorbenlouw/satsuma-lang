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
/** Multi-namespace platform entry point — qualified IDs and namespace pills. */
let nsPlatformUri: string;
/** Reports + models fixture — report card metadata coverage. */
let reportsUri: string;
/** Larger fixture used in geometry/layout-stability tests. */
let sapUri: string;

/**
 * Resolve fixture URIs before tests run.  The harness API serves the full list;
 * we pick the specific fixtures by display name.
 */
test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/fixtures");
  const fixtures = await res.json() as Array<{ name: string; uri: string }>;

  const find = (name: string) => fixtures.find((f) => f.name === name);
  const sfdc = find("sfdc-to-snowflake/pipeline.stm");
  const metrics = find("metrics-platform/metrics.stm");
  const nsPlatform = find("namespaces/ns-platform.stm");
  const reports = find("reports-and-models/pipeline.stm");
  const sap = find("sap-po-to-mfcs/pipeline.stm");

  if (!sfdc || !metrics || !nsPlatform || !reports || !sap) {
    throw new Error("Required fixtures not found in /api/fixtures");
  }

  sfdcUri = sfdc.uri;
  metricsUri = metrics.uri;
  nsPlatformUri = nsPlatform.uri;
  reportsUri = reports.uri;
  sapUri = sap.uri;
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

// ---------------------------------------------------------------------------
// Fixture matrix overview coverage (sl-3c2w)
//
// One describe block per fixture family.  Each block clicks the appropriate
// view-mode toggle, loads the fixture, then asserts overview content that is
// specific to that fixture's category — vanilla schemas + mappings, namespaced
// cards with namespace pills, metric cards merged across imports, report card
// metadata, and large-fixture layout stability beyond data-ready-state=ready.
// ---------------------------------------------------------------------------

test.describe("Overview view — sfdc-to-snowflake single-file mode", () => {
  test("renders the canonical vanilla schema cards and mapping card", async ({ page }) => {
    // Single-file mode on sfdc-to-snowflake exercises the non-namespaced card
    // height path: each schema renders without a namespace pill and the
    // pipeline's single mapping renders both as an overview mapping card and
    // as a connector mapping node. This is the baseline we compare the
    // namespaced fixture against.
    await page.goto("/");
    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, sfdcUri);

    const schemaCards = page.locator("[data-testid^='overview-schema-card-']");
    await expect(schemaCards).toHaveCount(4);

    // None of the sfdc schemas live inside a namespace, so the namespace pill
    // hook (sl-3c2w) must not appear anywhere in the overview.
    await expect(
      page.locator("[data-testid$='-namespace-pill']"),
    ).toHaveCount(0);

    await expect(
      page.locator("[data-testid^='overview-mapping-card-']"),
    ).toHaveCount(1);
  });
});

test.describe("Overview view — namespaces/ns-platform lineage mode", () => {
  test("renders qualified namespaced cards, mapping nodes, and namespace labels", async ({
    page,
  }) => {
    // ns-platform.stm declares schemas and mappings inside `raw`, `vault`,
    // `mart`, and `analytics` namespaces.  In lineage mode the overview must
    // render every namespace's cards with namespace-qualified test ids
    // (proving qualified rendering) and emit a namespace pill for each card
    // (proving the namespace card-height path is hit).
    await page.goto("/");
    // Default mode is lineage; explicitly assert it for clarity.
    await expect(page.locator(".toggle-btn[data-mode='lineage']")).toHaveClass(/active/);
    await loadFixture(page, nsPlatformUri);

    // Every namespace declared in the fixture should produce at least one
    // card with a namespace-qualified test id.  `analytics` only contains
    // metric schemas (rendered via <sz-metric-card>), so we look for metric
    // cards there instead of schema cards.  Test id segments are produced by
    // sanitizeTestIdSegment, which lowercases and replaces non-alnum runs
    // (`::`) with a single `-`, so e.g. `raw::crm_contacts` → `raw-crm-contacts`.
    for (const ns of ["raw", "vault", "mart"]) {
      await expect(
        page.locator(`[data-testid^='overview-schema-card-${ns}-']`).first(),
      ).toBeVisible();
    }
    await expect(
      page.locator("[data-testid^='overview-metric-card-analytics-']").first(),
    ).toBeVisible();

    // Each namespaced schema card carries the namespace pill hook.
    const pills = page.locator("[data-testid$='-namespace-pill']");
    expect(await pills.count()).toBeGreaterThanOrEqual(4);

    // Mapping node ids are built as `mapping:<namespace>:<id>` (see
    // _overviewMappingNodeId in satsuma-viz.ts), then sanitized — so a vault
    // mapping becomes a test id starting with `overview-mapping-node-mapping-vault-`.
    // The vault layer is the densest mapping zone in this fixture.
    await expect(
      page
        .locator("[data-testid^='overview-mapping-node-mapping-vault-']")
        .first(),
    ).toBeVisible();
  });
});

test.describe("Overview view — metrics-platform lineage mode", () => {
  test("merges metric cards with imported source cards", async ({ page }) => {
    // metrics.stm declares metric schemas and imports fact/dim sources from
    // metric_sources.stm.  In lineage mode the overview must contain the
    // headline metric cards AND at least one imported source card — proving
    // the lineage merge produced cards from BOTH files, not just the entry
    // point.
    await page.goto("/");
    await expect(page.locator(".toggle-btn[data-mode='lineage']")).toHaveClass(/active/);
    await loadFixture(page, metricsUri);

    // Metric schemas render via <sz-metric-card>, not <sz-schema-card>, so we
    // look for the metric-card test id.  sanitizeTestIdSegment turns
    // underscores into dashes, so `monthly_recurring_revenue` →
    // `monthly-recurring-revenue`.
    for (const metric of [
      "monthly-recurring-revenue",
      "churn-rate",
      "customer-lifetime-value",
    ]) {
      await expect(
        page.locator(`[data-testid='overview-metric-card-${metric}']`),
      ).toBeVisible();
    }

    // Imported source from metric_sources.stm — proves the lineage merge
    // pulled in cards from a file other than the entry point.
    await expect(
      page.locator("[data-testid='overview-schema-card-fact-subscriptions']"),
    ).toBeVisible();
  });
});

test.describe("Overview view — reports-and-models", () => {
  test("renders report and model cards alongside their source facts", async ({ page }) => {
    // reports-and-models/pipeline.stm declares fact tables, model schemas
    // (churn_predictor) and report schemas (weekly_sales_dashboard,
    // customer_risk_report, daily_order_summary).  The overview must surface
    // each as a stable schema card so downstream tools can navigate to
    // report/model targets the same way they navigate to ordinary schemas.
    await page.goto("/");
    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, reportsUri);

    // sanitizeTestIdSegment lowercases and turns each underscore into `-`.
    for (const id of [
      "fact-orders",
      "dim-customer",
      "weekly-sales-dashboard",
      "churn-predictor",
      "customer-risk-report",
      "daily-order-summary",
    ]) {
      await expect(
        page.locator(`[data-testid='overview-schema-card-${id}']`),
      ).toBeVisible();
    }
  });
});

test.describe("Overview view — sap-po-to-mfcs layout stability", () => {
  test("renders without falling back and surfaces the larger schema set", async ({ page }) => {
    // The SAP-PO fixture is one of the larger canonical examples.  Reaching
    // data-ready-state=ready proves layout completed; we additionally assert
    // it did NOT fall back to the error renderer AND that a non-trivial
    // number of schema cards became visible — guarding against an "empty
    // ready" regression where layout completes but emits no cards.
    await page.goto("/");
    await page.locator(".toggle-btn[data-mode='single']").click();
    await loadFixture(page, sapUri);

    const vizRoot = page.locator("[data-testid='viz-root']");
    await expect(vizRoot).not.toHaveAttribute("data-ready-state", "fallback");
    await expect(vizRoot).toHaveAttribute("data-ready-state", "ready");

    // The SAP fixture is "larger" in field volume rather than card count
    // (only a handful of top-level schemas).  We therefore guard against an
    // empty-but-ready regression by asserting BOTH that at least the source
    // and target cards exist AND that the mapping connector node was laid
    // out — these are the smallest invariants that distinguish "rendered"
    // from "ready but blank".
    const SAP_MIN_OVERVIEW_CARDS = 2;
    expect(
      await page.locator("[data-testid^='overview-schema-card-']").count(),
    ).toBeGreaterThanOrEqual(SAP_MIN_OVERVIEW_CARDS);
    expect(
      await page.locator("[data-testid^='overview-mapping-node-']").count(),
    ).toBeGreaterThanOrEqual(1);
  });
});
