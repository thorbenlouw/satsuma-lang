/**
 * app.ts — browser-side harness application.
 *
 * Loads fixture metadata from the server, renders source text and the
 * satsuma-viz web component side-by-side, and records all interaction events
 * in window.__satsumaHarness for Playwright assertions.
 *
 * The viz component (satsuma-viz.js) is loaded as a separate <script type="module">
 * in index.html, so this module does not import it directly.  It interacts
 * with the custom element by tag name once the element is defined.
 *
 * Automation contract (exposed on window.__satsumaHarness):
 *   fixture     — currently loaded fixture URI, or null
 *   viewMode    — "lineage" | "single"
 *   events      — array of recorded interaction events
 *   ready       — true once the viz has reached the "ready" state
 *   clearEvents — helper to reset the event log between assertions
 */

// ---------- Types ----------

interface Fixture {
  name: string;
  path: string;
  uri: string;
}

/**
 * A recorded interaction event emitted by the viz component.
 * Playwright tests assert against this log to verify that specific user
 * interactions (navigate, expand-lineage, field-lineage) are observable.
 */
interface HarnessEvent {
  type: string;
  detail: unknown;
  timestamp: number;
}

/**
 * The automation API exposed on window.__satsumaHarness.
 * All Playwright tests assert against this object rather than VS Code APIs.
 */
export interface SatsumaHarness {
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

// ---------- Harness state ----------

const harness: SatsumaHarness = {
  fixture: null,
  viewMode: "lineage",
  events: [],
  ready: false,
  clearEvents() { this.events = []; },
};

window.__satsumaHarness = harness;

// ---------- DOM references ----------

/**
 * Retrieve a required DOM element by id.
 * Throws a clear error if the element is absent — this indicates a mismatch
 * between index.html and app.ts rather than a recoverable runtime condition.
 */
function getRequired(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[harness] required element #${id} not found`);
  return el;
}

const fixtureListEl = getRequired("fixture-list");
const fixtureLabelEl = getRequired("fixture-label");
const sourceCodeEl = getRequired("source-code");
const vizContainer = getRequired("viz-container");
const readyBadge = getRequired("harness-ready-badge");
const viewModeToggle = getRequired("view-mode-toggle");

// ---------- Viz element management ----------

/**
 * The <satsuma-viz> element currently mounted in the viz container.
 * Re-used across fixture loads so the component preserves its own internal
 * state (zoom, pan) where possible.
 */
let vizEl: HTMLElement | null = null;

/** Mirror of the viz element's data-ready-state attribute. */
let vizReadyState = "empty";

/**
 * Record a viz interaction event in the harness log and update the ready flag.
 * Called from the event handlers attached to the viz element.
 */
function recordEvent(type: string, detail: unknown): void {
  harness.events.push({ type, detail, timestamp: Date.now() });
}

/**
 * Update the badge and harness.ready flag to reflect the current viz state.
 */
function updateReadyBadge(state: string): void {
  vizReadyState = state;
  harness.ready = state === "ready";
  readyBadge.textContent = state;
  readyBadge.className = state === "ready" ? "ready" : "";
}

/**
 * Ensure a <satsuma-viz> element is mounted, attaching event listeners once.
 * Returns the element so the caller can set its model property.
 */
function ensureVizElement(): HTMLElement {
  if (vizEl) return vizEl;

  const el = document.createElement("satsuma-viz");
  // Enable test-mode to suppress animations and make the harness deterministic
  // under automation.  The satsuma-viz component uses this to skip CSS transitions
  // and emit layout-complete signals synchronously.
  el.setAttribute("test-mode", "");

  // Monitor ready-state changes via MutationObserver so Playwright can wait
  // for `data-ready-state="ready"` on the root element.
  const observer = new MutationObserver(() => {
    const state = (el as HTMLElement).dataset["readyState"] ?? "empty";
    if (state !== vizReadyState) updateReadyBadge(state);
  });
  observer.observe(el, { attributes: true, attributeFilter: ["data-ready-state"] });

  // Record all interaction events for Playwright assertion.
  el.addEventListener("navigate", (e) => {
    recordEvent("navigate", (e as CustomEvent).detail);
  });
  el.addEventListener("field-hover", (e) => {
    recordEvent("field-hover", (e as CustomEvent).detail);
  });
  el.addEventListener("expand-lineage", (e) => {
    const detail = (e as CustomEvent).detail as { schemaId?: string };
    recordEvent("expand-lineage", detail);
    // When the user requests lineage expansion from within the viz, switch to
    // the lineage view for the current fixture so the full cross-file model loads.
    if (harness.fixture && harness.viewMode !== "lineage") {
      setViewMode("lineage");
    } else if (harness.fixture) {
      void loadFixture(harness.fixture);
    }
  });
  el.addEventListener("field-lineage", (e) => {
    recordEvent("field-lineage", (e as CustomEvent).detail);
  });
  el.addEventListener("open-mapping", (e) => {
    recordEvent("open-mapping", (e as CustomEvent).detail);
  });

  // Clear the placeholder and mount the element.
  const placeholder = document.getElementById("viz-placeholder");
  if (placeholder) placeholder.remove();
  vizContainer.appendChild(el);
  vizEl = el;
  return el;
}

// ---------- Fixture loading ----------

/**
 * Fetch and render the source and VizModel for the given fixture URI.
 * Uses the current viewMode to decide whether to request a single-file or
 * full-lineage model from the server.
 */
async function loadFixture(uri: string): Promise<void> {
  harness.fixture = uri;
  harness.ready = false;
  updateReadyBadge("loading");

  // Fetch source text and model in parallel to keep the UI responsive.
  const lineageParam = harness.viewMode === "lineage" ? "1" : "0";
  const [sourceRes, modelRes] = await Promise.all([
    fetch(`/api/source?uri=${encodeURIComponent(uri)}`),
    fetch(`/api/model?uri=${encodeURIComponent(uri)}&lineage=${lineageParam}`),
  ]);

  if (!sourceRes.ok || !modelRes.ok) {
    sourceCodeEl.textContent = "Failed to load fixture.";
    sourceCodeEl.className = "empty";
    updateReadyBadge("empty");
    return;
  }

  const { source } = (await sourceRes.json()) as { source: string };
  const model = await modelRes.json();

  // Update source panel.
  sourceCodeEl.textContent = source;
  sourceCodeEl.className = "";

  // Pass the model to the viz component.
  const viz = ensureVizElement();
  (viz as unknown as { model: unknown }).model = model;
}

// ---------- Sidebar ----------

/**
 * Render the fixture list in the sidebar.
 * Clicking an item loads the fixture and highlights the selected row.
 */
function renderFixtureList(fixtures: Fixture[]): void {
  fixtureListEl.innerHTML = "";
  for (const fixture of fixtures) {
    const btn = document.createElement("button");
    btn.className = "fixture-item";
    btn.textContent = fixture.name;
    btn.dataset["uri"] = fixture.uri;
    btn.addEventListener("click", () => {
      selectFixture(fixture.uri, btn);
    });
    fixtureListEl.appendChild(btn);
  }
}

/**
 * Mark a fixture item as selected, update the header label, and load the data.
 */
function selectFixture(uri: string, btn: HTMLButtonElement): void {
  for (const el of fixtureListEl.querySelectorAll(".fixture-item")) {
    el.classList.remove("selected");
  }
  btn.classList.add("selected");
  fixtureLabelEl.textContent = btn.textContent ?? uri;
  void loadFixture(uri);
}

// ---------- View mode toggle ----------

/**
 * Switch between "lineage" (full transitive import merge) and "single"
 * (current file only) view modes, then reload the current fixture.
 */
function setViewMode(mode: "lineage" | "single"): void {
  harness.viewMode = mode;
  for (const btn of viewModeToggle.querySelectorAll<HTMLButtonElement>(".toggle-btn")) {
    btn.classList.toggle("active", btn.dataset["mode"] === mode);
  }
  if (harness.fixture) void loadFixture(harness.fixture);
}

viewModeToggle.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".toggle-btn");
  if (!btn) return;
  const mode = btn.dataset["mode"] as "lineage" | "single" | undefined;
  if (mode && mode !== harness.viewMode) setViewMode(mode);
});

// ---------- Startup ----------

/**
 * Fetch the fixture list from the server and populate the sidebar.
 * Automatically selects the first fixture so the harness is in a useful state
 * on load, which also satisfies the requirement that Playwright tests can wait
 * for a ready state without a manual fixture selection step.
 */
async function init(): Promise<void> {
  const res = await fetch("/api/fixtures");
  if (!res.ok) {
    fixtureListEl.textContent = "Failed to load fixtures.";
    return;
  }
  const fixtures = (await res.json()) as Fixture[];
  renderFixtureList(fixtures);

  // Pre-select the first fixture so the page is immediately useful.
  if (fixtures.length > 0) {
    const first = fixtures[0];
    const firstBtn = fixtureListEl.querySelector<HTMLButtonElement>(".fixture-item");
    if (first && firstBtn) selectFixture(first.uri, firstBtn);
  }
}

void init();
