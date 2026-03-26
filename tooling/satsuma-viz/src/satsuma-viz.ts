import { LitElement, html, css, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { VizModel, SourceLocation } from "./model.js";
import tokens from "./tokens.css";

export { VizModel } from "./model.js";

// Re-export components so they register when the bundle loads
export { SzSchemaCard } from "./components/sz-schema-card.js";
export { SzMetricCard } from "./components/sz-metric-card.js";
export { SzFragmentCard } from "./components/sz-fragment-card.js";

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

    .empty {
      color: var(--sz-text-muted);
      font-size: 14px;
      padding: 48px;
      text-align: center;
    }
  `;

  @property({ type: Object })
  model: VizModel | null = null;

  override render() {
    if (!this.model) {
      return html`<div class="empty">No mapping file loaded</div>`;
    }

    const { namespaces } = this.model;
    if (namespaces.length === 0) {
      return html`<div class="empty">No schemas found in this file</div>`;
    }

    return html`
      <div class="canvas">
        ${namespaces.map((ns) =>
          ns.name
            ? html`
                <div class="namespace-group">
                  <span class="namespace-label">${ns.name}</span>
                  ${this._renderCards(ns)}
                </div>
              `
            : this._renderCards(ns)
        )}
      </div>
    `;
  }

  private _renderCards(ns: import("./model.js").NamespaceGroup) {
    return html`
      ${ns.schemas.map(
        (s) => html`<sz-schema-card .schema=${s}></sz-schema-card>`
      )}
      ${ns.fragments.map(
        (f) => html`<sz-fragment-card .fragment=${f}></sz-fragment-card>`
      )}
      ${ns.metrics.map(
        (m) => html`<sz-metric-card .metric=${m}></sz-metric-card>`
      )}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    navigate: SzNavigateEvent;
  }
}
