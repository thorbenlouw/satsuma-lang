import { LitElement, html, css, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { VizModel, SourceLocation, NamespaceGroup } from "./model.js";
import { computeLayout, type LayoutResult } from "./layout/elk-layout.js";
import tokens from "./tokens.css";

export { VizModel } from "./model.js";

// Re-export components so they register when the bundle loads
export { SzSchemaCard } from "./components/sz-schema-card.js";
export { SzMetricCard } from "./components/sz-metric-card.js";
export { SzFragmentCard } from "./components/sz-fragment-card.js";
export { SzEdgeLayer } from "./edges/sz-edge-layer.js";
export { computeLayout } from "./layout/elk-layout.js";
export type { LayoutResult, LayoutNode, LayoutEdge } from "./layout/elk-layout.js";

/** Navigate event — dispatched when the user clicks a source-linked element. */
export class SzNavigateEvent extends Event {
  readonly location: SourceLocation;
  constructor(location: SourceLocation) {
    super("navigate", { bubbles: true, composed: true });
    this.location = location;
  }
}

@customElement("satsuma-viz")
export class SatsumaViz extends LitElement {
  static override styles = css`
    ${unsafeCSS(tokens)}

    :host {
      display: block;
      background: var(--sz-bg);
      color: var(--sz-text);
      font-family: var(--sz-font-sans);
      min-height: 100%;
      overflow: auto;
    }

    .canvas {
      position: relative;
      min-width: 100%;
      min-height: 100%;
    }

    .card-layer {
      position: relative;
    }

    .positioned-card {
      position: absolute;
    }

    .namespace-box {
      position: absolute;
      border: 2px dashed var(--sz-namespace-border);
      background: var(--sz-namespace-bg);
      border-radius: var(--sz-card-radius);
    }

    .namespace-label {
      position: absolute;
      top: -10px;
      left: 12px;
      background: var(--sz-namespace-bg);
      padding: 0 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--sz-text-muted);
      letter-spacing: 0.05em;
    }

    /* Flexbox fallback when no layout computed yet */
    .flex-canvas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sz-card-gap);
      padding: 24px;
      align-items: flex-start;
    }

    .namespace-group {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sz-card-gap);
      padding: 16px;
      border: 2px dashed var(--sz-namespace-border);
      background: var(--sz-namespace-bg);
      border-radius: var(--sz-card-radius);
      position: relative;
    }

    .namespace-group > .namespace-label {
      position: absolute;
      top: -10px;
      left: 12px;
    }

    .empty {
      color: var(--sz-text-muted);
      font-size: 14px;
      padding: 48px;
      text-align: center;
    }

    .loading {
      color: var(--sz-text-muted);
      font-size: 14px;
      padding: 48px;
      text-align: center;
    }

    .file-notes {
      margin: 16px 24px 0;
      border-radius: var(--sz-card-radius, 8px);
      background: var(--sz-card-bg, #fff);
      border: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      box-shadow: var(--sz-card-shadow, 0 2px 8px rgba(45, 42, 38, 0.06));
      overflow: hidden;
    }

    .file-notes-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
      font-weight: 600;
      color: var(--sz-text, #2D2A26);
    }

    .file-notes-toggle:hover {
      background: rgba(45, 42, 38, 0.03);
    }

    .file-notes-toggle .arrow {
      font-size: 10px;
      transition: transform 0.15s ease;
    }

    .file-notes-toggle .arrow[data-expanded] {
      transform: rotate(90deg);
    }

    .file-note-item {
      padding: 8px 12px 8px 34px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--sz-text, #2D2A26);
      white-space: pre-wrap;
      word-break: break-word;
      border-top: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 12px;
      background: var(--sz-card-bg, #fff);
      border-bottom: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      font-family: var(--sz-font-sans, system-ui);
      font-size: 12px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .toolbar-title {
      font-weight: 600;
      font-size: 13px;
      color: var(--sz-text, #2D2A26);
      margin-right: 12px;
      padding: 4px 0;
    }

    .toolbar-sep {
      width: 1px;
      height: 20px;
      background: var(--sz-card-border, rgba(45, 42, 38, 0.08));
      margin: 0 6px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      color: var(--sz-text-muted, #6B6560);
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      user-select: none;
      white-space: nowrap;
    }

    .toolbar-btn:hover {
      background: rgba(45, 42, 38, 0.05);
      color: var(--sz-text, #2D2A26);
    }

    .toolbar-btn[data-active] {
      background: var(--sz-badge-bg, #FFF3E8);
      color: var(--sz-orange-dark, #D97726);
      border-color: var(--sz-orange-dark, #D97726);
    }

    .toolbar-spacer {
      flex: 1;
    }

    .toolbar-select {
      padding: 4px 8px;
      border: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      border-radius: 4px;
      background: var(--sz-card-bg, #fff);
      color: var(--sz-text, #2D2A26);
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
    }

    /* Hide edges when schema-only mode */
    .schema-only sz-edge-layer {
      display: none;
    }

    /* Hide notes when notes hidden */
    .hide-notes .file-notes,
    .hide-notes .notes-section {
      display: none;
    }
  `;

  @property({ type: Object })
  model: VizModel | null = null;

  @state()
  private _layout: LayoutResult | null = null;

  @state()
  private _layoutError = false;

  @state()
  private _fileNotesExpanded = false;

  @state()
  private _schemaOnly = false;

  @state()
  private _showNotes = true;

  @state()
  private _nsFilter: string | null = null;

  @state()
  private _mappedFieldsBySchema = new Map<string, Set<string>>();

  override updated(changed: Map<string, unknown>) {
    if (changed.has("model") && this.model) {
      this._runLayout();
    }
  }

  private async _runLayout() {
    if (!this.model) return;

    this._layout = null;
    this._layoutError = false;

    // Build mapped fields index for card rendering
    this._mappedFieldsBySchema = this._buildMappedFieldsIndex();

    try {
      this._layout = await computeLayout(this.model);
    } catch {
      this._layoutError = true;
    }
  }

  override render() {
    if (!this.model) {
      return html`<div class="empty">No mapping file loaded</div>`;
    }

    const { namespaces } = this.model;
    if (namespaces.length === 0) {
      return html`<div class="empty">No schemas found in this file</div>`;
    }

    const filtered = this._filterNamespaces(namespaces);
    const toggleClasses = `${this._schemaOnly ? "schema-only" : ""} ${!this._showNotes ? "hide-notes" : ""}`;

    // If layout hasn't computed yet, show flex fallback
    if (!this._layout && !this._layoutError) {
      return html`
        ${this._renderToolbar(namespaces)}
        <div class="loading">Computing layout...</div>
      `;
    }

    // If layout failed, fall back to simple flex layout
    if (this._layoutError || !this._layout) {
      return html`
        ${this._renderToolbar(namespaces)}
        <div class=${toggleClasses}>
          ${this._renderFileNotes()}
          ${this._renderFlexFallback(filtered)}
        </div>
      `;
    }

    return html`
      ${this._renderToolbar(namespaces)}
      <div class=${toggleClasses}>
        ${this._renderFileNotes()}
        ${this._renderPositioned(this._layout, filtered)}
      </div>
    `;
  }

  private _renderToolbar(allNamespaces: NamespaceGroup[]) {
    const namedNs = allNamespaces.filter((ns) => ns.name);
    const hasNamespaces = namedNs.length > 0;

    return html`
      <div class="toolbar">
        <span class="toolbar-title">&#9673; Mapping Viz</span>
        <div class="toolbar-sep"></div>
        <button
          class="toolbar-btn"
          ?data-active=${this._schemaOnly}
          @click=${() => { this._schemaOnly = !this._schemaOnly; }}
          title="Show only schema cards, hide arrows and transforms"
        >Schema Only</button>
        <button
          class="toolbar-btn"
          ?data-active=${this._showNotes}
          @click=${() => { this._showNotes = !this._showNotes; }}
          title="Show or hide notes"
        >Show Notes</button>
        <div class="toolbar-sep"></div>
        <button class="toolbar-btn" @click=${this._fit} title="Fit all content in viewport">Fit</button>
        <button class="toolbar-btn" @click=${this._refresh} title="Re-fetch visualization data">&#8635; Refresh</button>
        ${hasNamespaces
          ? html`
              <div class="toolbar-sep"></div>
              <select
                class="toolbar-select"
                @change=${this._onNsFilterChange}
                title="Filter by namespace"
              >
                <option value="" ?selected=${this._nsFilter === null}>All namespaces</option>
                ${namedNs.map(
                  (ns) => html`<option value=${ns.name!} ?selected=${this._nsFilter === ns.name}>${ns.name}</option>`
                )}
              </select>
            `
          : ""}
        <div class="toolbar-spacer"></div>
      </div>
    `;
  }

  private _fit() {
    this.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  private _refresh() {
    this.dispatchEvent(new Event("refresh", { bubbles: true, composed: true }));
  }

  private _onNsFilterChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this._nsFilter = val || null;
  }

  private _filterNamespaces(namespaces: NamespaceGroup[]): NamespaceGroup[] {
    if (!this._nsFilter) return namespaces;
    return namespaces.filter(
      (ns) => ns.name === this._nsFilter || (!ns.name && namespaces.some((n) => n.name === this._nsFilter))
    );
  }

  private _renderFileNotes() {
    if (!this.model || this.model.fileNotes.length === 0) return html``;

    const notes = this.model.fileNotes;
    return html`
      <div class="file-notes">
        <div class="file-notes-toggle" @click=${this._toggleFileNotes}>
          <span class="arrow" ?data-expanded=${this._fileNotesExpanded}>&#9654;</span>
          <span>&#128221; File Notes (${notes.length})</span>
        </div>
        ${this._fileNotesExpanded
          ? notes.map((n) => html`<div class="file-note-item">${n.text}</div>`)
          : ""}
      </div>
    `;
  }

  private _toggleFileNotes() {
    this._fileNotesExpanded = !this._fileNotesExpanded;
  }

  private _renderPositioned(layout: LayoutResult, namespaces: NamespaceGroup[]) {
    // Build namespace bounding boxes from child node positions
    const nsBoxes = this._computeNamespaceBoxes(layout, namespaces);

    return html`
      <div class="canvas" style="width: ${layout.width + 48}px; height: ${layout.height + 48}px; padding: 24px;">
        <!-- SVG edge layer (behind cards) -->
        <sz-edge-layer
          .edges=${layout.edges}
          .width=${layout.width + 48}
          .height=${layout.height + 48}
        ></sz-edge-layer>

        <!-- Namespace bounding boxes -->
        ${nsBoxes.map(
          (box) => html`
            <div
              class="namespace-box"
              style="left: ${box.x}px; top: ${box.y}px; width: ${box.w}px; height: ${box.h}px;"
            >
              <span class="namespace-label">${box.name}</span>
            </div>
          `
        )}

        <!-- Positioned cards -->
        <div class="card-layer">
          ${namespaces.flatMap((ns) => [
            ...ns.schemas.map((s) => {
              const node = layout.nodes.get(s.qualifiedId);
              if (!node) return html``;
              const mapped = this._mappedFieldsBySchema.get(s.qualifiedId) ?? new Set();
              return html`
                <div class="positioned-card" style="left: ${node.x}px; top: ${node.y}px; width: ${node.width}px;">
                  <sz-schema-card .schema=${s} .mappedFields=${mapped}></sz-schema-card>
                </div>
              `;
            }),
            ...ns.fragments.map((f) => {
              const node = layout.nodes.get(f.id);
              if (!node) return html``;
              return html`
                <div class="positioned-card" style="left: ${node.x}px; top: ${node.y}px; width: ${node.width}px;">
                  <sz-fragment-card .fragment=${f}></sz-fragment-card>
                </div>
              `;
            }),
            ...ns.metrics.map((m) => {
              const node = layout.nodes.get(m.qualifiedId);
              if (!node) return html``;
              return html`
                <div class="positioned-card" style="left: ${node.x}px; top: ${node.y}px; width: ${node.width}px;">
                  <sz-metric-card .metric=${m}></sz-metric-card>
                </div>
              `;
            }),
          ])}
        </div>
      </div>
    `;
  }

  private _renderFlexFallback(namespaces: NamespaceGroup[]) {
    return html`
      <div class="flex-canvas">
        ${namespaces.map((ns) =>
          ns.name
            ? html`
                <div class="namespace-group">
                  <span class="namespace-label">${ns.name}</span>
                  ${this._renderFlexCards(ns)}
                </div>
              `
            : this._renderFlexCards(ns)
        )}
      </div>
    `;
  }

  private _renderFlexCards(ns: NamespaceGroup) {
    return html`
      ${ns.schemas.map((s) => {
        const mapped = this._mappedFieldsBySchema.get(s.qualifiedId) ?? new Set();
        return html`<sz-schema-card .schema=${s} .mappedFields=${mapped}></sz-schema-card>`;
      })}
      ${ns.fragments.map(
        (f) => html`<sz-fragment-card .fragment=${f}></sz-fragment-card>`
      )}
      ${ns.metrics.map(
        (m) => html`<sz-metric-card .metric=${m}></sz-metric-card>`
      )}
    `;
  }

  private _computeNamespaceBoxes(
    layout: LayoutResult,
    namespaces: NamespaceGroup[]
  ): Array<{ name: string; x: number; y: number; w: number; h: number }> {
    const boxes: Array<{ name: string; x: number; y: number; w: number; h: number }> = [];

    for (const ns of namespaces) {
      if (!ns.name) continue;

      const ids = [
        ...ns.schemas.map((s) => s.qualifiedId),
        ...ns.fragments.map((f) => f.id),
        ...ns.metrics.map((m) => m.qualifiedId),
      ];

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let found = false;

      for (const id of ids) {
        const node = layout.nodes.get(id);
        if (!node) continue;
        found = true;
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      }

      if (found) {
        const pad = 16;
        boxes.push({
          name: ns.name,
          x: minX - pad,
          y: minY - pad - 12, // extra space for label
          w: maxX - minX + pad * 2,
          h: maxY - minY + pad * 2 + 12,
        });
      }
    }

    return boxes;
  }

  private _buildMappedFieldsIndex(): Map<string, Set<string>> {
    const index = new Map<string, Set<string>>();
    if (!this.model) return index;

    const ensureSet = (id: string) => {
      if (!index.has(id)) index.set(id, new Set());
      return index.get(id)!;
    };

    for (const ns of this.model.namespaces) {
      for (const m of ns.mappings) {
        const collect = (arrows: import("./model.js").ArrowEntry[]) => {
          for (const a of arrows) {
            ensureSet(m.targetRef).add(a.targetField);
            for (const sf of a.sourceFields) {
              for (const sr of m.sourceRefs) {
                ensureSet(sr).add(sf);
              }
            }
          }
        };

        collect(m.arrows);
        for (const eb of m.eachBlocks) {
          collect(eb.arrows);
        }
        for (const fb of m.flattenBlocks) {
          collect(fb.arrows);
        }
      }
    }

    return index;
  }
}

declare global {
  interface HTMLElementEventMap {
    navigate: SzNavigateEvent;
  }
}
