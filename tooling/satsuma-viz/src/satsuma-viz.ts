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
  `;

  @property({ type: Object })
  model: VizModel | null = null;

  @state()
  private _layout: LayoutResult | null = null;

  @state()
  private _layoutError = false;

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

    // If layout hasn't computed yet, show flex fallback
    if (!this._layout && !this._layoutError) {
      return html`<div class="loading">Computing layout...</div>`;
    }

    // If layout failed, fall back to simple flex layout
    if (this._layoutError || !this._layout) {
      return this._renderFlexFallback(namespaces);
    }

    return this._renderPositioned(this._layout, namespaces);
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
