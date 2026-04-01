/**
 * app.ts — browser-side harness application.
 *
 * Loads fixture metadata from the server, renders syntax-highlighted source
 * text and the satsuma-viz web component side-by-side, and records all
 * interaction events in window.__satsumaHarness for Playwright assertions.
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
 *
 * URL parameters for headless use (e.g. Playwright tests):
 *   ?fixture=<encoded-uri>   — auto-selects a fixture on load
 *   ?mode=lineage|single     — overrides the default view mode
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

const fixtureListEl     = getRequired("fixture-list");
const fixturePickerBtn  = getRequired("fixture-picker-btn");
const fixturePickerName = getRequired("fixture-picker-name");
const fixtureDropdown   = getRequired("fixture-picker-dropdown");
const sourceCodeEl      = getRequired("source-code");
const vizContainer      = getRequired("viz-container");
const readyBadge        = getRequired("harness-ready-badge");
const viewModeToggle    = getRequired("view-mode-toggle");

// ---------- Syntax highlighting ----------

/**
 * Translate Satsuma source text to HTML with <span class="tok-*"> wrappers.
 *
 * The tokeniser is derived from the TextMate grammar in
 * tooling/vscode-satsuma/syntaxes/satsuma.tmLanguage.json.
 * Earlier alternatives in the master regex win (priority ordering mirrors
 * the grammar's include order).  No external library is required.
 */
function highlightSatsuma(source: string): string {
  // HTML-escape a plain-text segment.
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const wrap = (cls: string, s: string) => `<span class="${cls}">${esc(s)}</span>`;

  /**
   * Wrap the contents of a double-quoted string, further highlighting
   * any @ref cross-references embedded within it.
   */
  function highlightStringContents(text: string): string {
    // @ref pattern from variable.other.reference.satsuma in the grammar.
    const refRe =
      /@(?:`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*)(?:::[a-zA-Z_][a-zA-Z0-9_-]*)?(?:\.(?:`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*))*(?!\w)/g;

    let html = `<span class="tok-string">`;
    let last = 0;
    for (const m of text.matchAll(refRe)) {
      html += esc(text.slice(last, m.index));
      html += `</span><span class="tok-ref">${esc(m[0])}</span><span class="tok-string">`;
      last = (m.index ?? 0) + m[0].length;
    }
    html += esc(text.slice(last)) + `</span>`;
    return html;
  }

  // ── Master token regex ──────────────────────────────────────────────────
  // Alternatives are listed in priority order (first match wins).
  // Named capture groups map directly to the rendering logic below.
  const TOKEN = new RegExp(
    [
      // Triple-quoted strings (multiline) must come before single-quoted.
      String.raw`(?<triple>"""[\s\S]*?(?:"""|$))`,
      // Double-quoted strings (single line, may contain @ref).
      String.raw`(?<string>"(?:[^"\\]|\\.)*"?)`,
      // Warning comments: //! take priority over plain //
      String.raw`(?<comment_warn>//!.*)`,
      // Question comments: //?
      String.raw`(?<comment_q>//\?.*)`,
      // Regular line comments.
      String.raw`(?<comment>//.*)`,
      // Mapping arrow operator.
      String.raw`(?<arrow>->)`,
      // Spread: ...
      String.raw`(?<spread>\.\.\.)`,
      // Pipe operator.
      String.raw`(?<pipe>\|)`,
      // Backtick-quoted identifiers: `field name`.
      String.raw`(?<backtick>` + "`[^`]*`)",
      // Block-level and structural keywords.
      String.raw`(?<kw>\b(?:namespace|schema|fragment|mapping|metric|transform|note|map|source|target|each|flatten|record|list_of|import|from|default)\b)`,
      // Data type names used in field declarations.
      String.raw`(?<type>\b(?:STRING|VARCHAR|INT|INTEGER|BIGINT|DECIMAL|CHAR|BOOLEAN|DATE|TIMESTAMPTZ|TIMESTAMP_NTZ|UUID|JSON|TEXT|NUMBER|INT32|FLOAT|DOUBLE|CURRENCY|PICKLIST|ID|PERCENT|DATETIME)\b)`,
      // Built-in pipeline function names.
      String.raw`(?<pipeline>\b(?:trim|lowercase|uppercase|coalesce|round|split|first|last|to_utc|to_iso8601|parse|null_if_empty|null_if_invalid|validate_email|now_utc|title_case|escape_html|truncate|to_number|prepend|max_length|assume_utc|join|dedup)\b)`,
      // Boolean and null literals.
      String.raw`(?<boolean>\b(?:true|false|null)\b)`,
      // Numeric literals (integer and decimal).
      String.raw`(?<number>-?\b\d+(?:\.\d+)?\b)`,
    ].join("|"),
    "g",
  );

  let html = "";
  let last = 0;

  for (const m of source.matchAll(TOKEN)) {
    // Emit any plain text that precedes this token.
    if ((m.index ?? 0) > last) html += esc(source.slice(last, m.index));

    const g = m.groups ?? {};
    const text = m[0];

    if (g.triple)        html += wrap("tok-string-triple", text);
    else if (g.string)   html += highlightStringContents(text);
    else if (g.comment_warn) html += wrap("tok-comment-warn", text);
    else if (g.comment_q)    html += wrap("tok-comment-q",    text);
    else if (g.comment)      html += wrap("tok-comment",       text);
    else if (g.arrow)    html += wrap("tok-arrow",    text);
    else if (g.spread)   html += wrap("tok-spread",   text);
    else if (g.pipe)     html += wrap("tok-pipe",     text);
    else if (g.backtick) html += wrap("tok-backtick", text);
    else if (g.kw)       html += wrap("tok-kw",       text);
    else if (g.type)     html += wrap("tok-type",     text);
    else if (g.pipeline) html += wrap("tok-pipeline", text);
    else if (g.boolean)  html += wrap("tok-boolean",  text);
    else if (g.number)   html += wrap("tok-number",   text);
    else                 html += esc(text);

    last = (m.index ?? 0) + text.length;
  }

  // Emit any remaining plain text after the last token.
  html += esc(source.slice(last));
  return html;
}

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

  // Safe: highlightSatsuma HTML-escapes all user content via esc() before
  // constructing the markup — no raw source text reaches the DOM.
  sourceCodeEl.innerHTML = highlightSatsuma(source); // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method
  sourceCodeEl.className = "";

  // Pass the model to the viz component.
  const viz = ensureVizElement();
  (viz as unknown as { model: unknown }).model = model;
}

// ---------- Fixture picker (dropdown) ----------

/** Whether the fixture dropdown is currently open. */
let pickerOpen = false;

/**
 * Toggle the fixture picker dropdown open/closed.
 */
function togglePicker(open?: boolean): void {
  pickerOpen = open !== undefined ? open : !pickerOpen;
  fixtureDropdown.classList.toggle("hidden", !pickerOpen);
}

fixturePickerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePicker();
});

// Close the dropdown when the user clicks anywhere else.
document.addEventListener("click", () => {
  if (pickerOpen) togglePicker(false);
});

/**
 * Render the fixture list inside the picker dropdown.
 * All fixture items are always present in the DOM so that URL-param
 * auto-selection (?fixture=<uri>) can find them by data-uri attribute.
 */
function renderFixtureList(fixtures: Fixture[]): void {
  fixtureListEl.innerHTML = "";
  for (const fixture of fixtures) {
    const btn = document.createElement("button");
    btn.className = "fixture-item";
    btn.textContent = fixture.name;
    btn.dataset["uri"] = fixture.uri;
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent document click from immediately closing
      selectFixture(fixture.uri, btn);
      togglePicker(false);
    });
    fixtureListEl.appendChild(btn);
  }
}

/**
 * Mark a fixture item as selected, update the picker button label, and load
 * the source and model data.
 */
function selectFixture(uri: string, btn: HTMLButtonElement): void {
  for (const el of fixtureListEl.querySelectorAll(".fixture-item")) {
    el.classList.remove("selected");
  }
  btn.classList.add("selected");
  // Show a short name (last path segment) in the compact picker button.
  const shortName = btn.textContent ?? uri;
  fixturePickerName.textContent = shortName;
  fixturePickerName.title = shortName;
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
 * Fetch the fixture list from the server and populate the picker dropdown.
 * Auto-selects the first fixture (or a fixture specified via URL params) so
 * the harness is in a useful state on load, which also satisfies the requirement
 * that Playwright tests can wait for a ready state without a manual fixture
 * selection step.
 */
async function init(): Promise<void> {
  // Read URL parameters set by headless callers (e.g. /api/screenshot).
  const params = new URLSearchParams(window.location.search);
  const autoFixtureUri = params.get("fixture");
  const autoMode = params.get("mode");
  if (autoMode === "lineage" || autoMode === "single") harness.viewMode = autoMode;

  const res = await fetch("/api/fixtures");
  if (!res.ok) {
    fixtureListEl.textContent = "Failed to load fixtures.";
    return;
  }
  const fixtures = (await res.json()) as Fixture[];
  renderFixtureList(fixtures);

  // If a fixture was specified via URL param, select it; otherwise select the first.
  if (autoFixtureUri) {
    for (const btn of fixtureListEl.querySelectorAll<HTMLButtonElement>(".fixture-item")) {
      if (btn.dataset["uri"] === autoFixtureUri) {
        selectFixture(autoFixtureUri, btn);
        return;
      }
    }
  }

  // Default: pre-select the first fixture so the page is immediately useful.
  if (fixtures.length > 0) {
    const first = fixtures[0];
    const firstBtn = fixtureListEl.querySelector<HTMLButtonElement>(".fixture-item");
    if (first && firstBtn) selectFixture(first.uri, firstBtn);
  }
}

void init();
