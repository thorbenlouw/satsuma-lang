import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { FragmentCard, FieldEntry } from "../model.js";
import { SzNavigateEvent } from "../satsuma-viz.js";

@customElement("sz-fragment-card")
export class SzFragmentCard extends LitElement {
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
      background: var(--sz-green, #5A9E6F);
      color: #fff;
      cursor: pointer;
      user-select: none;
    }

    .header-icon {
      font-size: 13px;
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

    .header-count {
      font-size: 11px;
      opacity: 0.85;
      flex-shrink: 0;
    }

    .header-toggle {
      font-size: 12px;
      flex-shrink: 0;
      transition: transform 0.15s ease;
    }

    .header-toggle[data-collapsed] {
      transform: rotate(-90deg);
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

    .spread-icon {
      font-size: 11px;
      color: var(--sz-green, #5A9E6F);
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

    .badges {
      display: flex;
      gap: 3px;
      flex-shrink: 0;
    }

    .badge {
      font-family: var(--sz-font-sans, system-ui);
      font-size: 10px;
      font-weight: 500;
      padding: 1px 5px;
      border-radius: var(--sz-badge-radius, 4px);
      background: var(--sz-badge-bg, #FFF3E8);
      color: var(--sz-badge-text, #D97726);
      line-height: 1.4;
    }

    .collapsed .fields {
      display: none;
    }
  `;

  @property({ type: Object })
  fragment: FragmentCard | null = null;

  @state()
  private _collapsed = false;

  override render() {
    const fr = this.fragment;
    if (!fr) return html``;

    return html`
      <div class=${this._collapsed ? "collapsed" : ""}>
        <div class="header" @click=${this._onHeaderClick}>
          <span class="header-icon">&#9674;</span>
          <span class="header-name">${fr.id}</span>
          <span class="header-count">${fr.fields.length} fields</span>
          <span class="header-toggle" ?data-collapsed=${this._collapsed}>&#9660;</span>
        </div>
        <div class="fields">
          ${fr.fields.map((f) => this._renderField(f))}
        </div>
      </div>
    `;
  }

  private _renderField(f: FieldEntry) {
    return html`
      <div class="field-row" @click=${() => this._navigate(f.location)}>
        <span class="spread-icon">&#8230;</span>
        <span class="field-name">${f.name}</span>
        <span class="field-type">${f.type}</span>
        <span class="badges">
          ${f.constraints.map(
            (c) => html`<span class="badge">${c}</span>`
          )}
        </span>
      </div>
    `;
  }

  private _onHeaderClick() {
    this._collapsed = !this._collapsed;
    if (this.fragment) {
      this._navigate(this.fragment.location);
    }
  }

  private _navigate(loc: import("../model.js").SourceLocation) {
    this.dispatchEvent(new SzNavigateEvent(loc));
  }
}
