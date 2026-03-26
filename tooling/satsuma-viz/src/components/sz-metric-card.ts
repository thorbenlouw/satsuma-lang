import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { MetricCard, MetricFieldEntry } from "../model.js";
import { SzNavigateEvent } from "../satsuma-viz.js";

const MEASURE_ICONS: Record<string, string> = {
  additive: "\u03A3",        // Σ
  non_additive: "\u2248",    // ≈
  semi_additive: "\u00BD",   // ½
};

@customElement("sz-metric-card")
export class SzMetricCard extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-width: var(--sz-card-min-width, 240px);
      max-width: var(--sz-card-max-width, 380px);
      border-radius: var(--sz-card-radius, 8px);
      background: var(--sz-card-bg, #fff);
      border: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      box-shadow: var(--sz-card-shadow, 0 2px 8px rgba(45, 42, 38, 0.06));
      overflow: hidden;
      font-family: var(--sz-font-sans, system-ui);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--sz-violet, #8E5BB0);
      color: #fff;
      cursor: pointer;
      user-select: none;
    }

    .header-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .header-name {
      font-size: 14px;
      font-weight: 600;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header-toggle {
      font-size: 12px;
      flex-shrink: 0;
      transition: transform 0.15s ease;
    }

    .header-toggle[data-collapsed] {
      transform: rotate(-90deg);
    }

    .meta {
      padding: 4px 12px 6px;
      font-size: 11px;
      color: var(--sz-text-muted, #6B6560);
      border-bottom: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      line-height: 1.5;
    }

    .meta-row {
      display: flex;
      gap: 6px;
    }

    .meta-label {
      opacity: 0.7;
    }

    .fields {
      padding: 4px 0;
    }

    .field-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 12px;
      height: var(--sz-field-height, 28px);
      cursor: pointer;
    }

    .field-row:hover {
      background: rgba(45, 42, 38, 0.03);
    }

    .measure-icon {
      width: 16px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--sz-violet, #8E5BB0);
      flex-shrink: 0;
    }

    .field-name {
      font-family: var(--sz-font-mono, monospace);
      font-size: 12px;
      font-weight: 500;
      color: var(--sz-text, #2D2A26);
      flex: 1;
    }

    .field-type {
      font-family: var(--sz-font-mono, monospace);
      font-size: 11px;
      color: var(--sz-text-muted, #6B6560);
      flex-shrink: 0;
    }

    .collapsed .fields,
    .collapsed .meta {
      display: none;
    }
  `;

  @property({ type: Object })
  metric: MetricCard | null = null;

  @state()
  private _collapsed = false;

  override render() {
    const m = this.metric;
    if (!m) return html``;

    const hasMeta = m.label || m.grain || m.slices.length > 0;

    return html`
      <div class=${this._collapsed ? "collapsed" : ""}>
        <div class="header" @click=${this._onHeaderClick}>
          <span class="header-icon">&#9670;</span>
          <span class="header-name">${m.id}</span>
          <span class="header-toggle" ?data-collapsed=${this._collapsed}>&#9660;</span>
        </div>
        ${hasMeta
          ? html`
              <div class="meta">
                ${m.label ? html`<div class="meta-row">"${m.label}"${m.grain ? html` &middot; grain: ${m.grain}` : ""}</div>` : ""}
                ${!m.label && m.grain ? html`<div class="meta-row"><span class="meta-label">grain:</span> ${m.grain}</div>` : ""}
                ${m.slices.length > 0
                  ? html`<div class="meta-row"><span class="meta-label">slice:</span> ${m.slices.join(", ")}</div>`
                  : ""}
              </div>
            `
          : ""}
        <div class="fields">
          ${m.fields.map((f) => this._renderField(f))}
        </div>
      </div>
    `;
  }

  private _renderField(f: MetricFieldEntry) {
    const icon = f.measure ? MEASURE_ICONS[f.measure] ?? "" : "";
    return html`
      <div class="field-row" @click=${() => this._navigate(f.location)}>
        <span class="measure-icon">${icon}</span>
        <span class="field-name">${f.name}</span>
        <span class="field-type">${f.type}</span>
      </div>
    `;
  }

  private _onHeaderClick() {
    this._collapsed = !this._collapsed;
    if (this.metric) {
      this._navigate(this.metric.location);
    }
  }

  private _navigate(loc: import("../model.js").SourceLocation) {
    this.dispatchEvent(new SzNavigateEvent(loc));
  }
}
