import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import type {
  MappingBlock,
  SchemaCard,
  ArrowEntry,
  EachBlock,
  FlattenBlock,
} from "../model.js";
import { SzNavigateEvent } from "../satsuma-viz.js";

/**
 * Three-column mapping detail view.
 *
 * Left:   source schema cards (full fields)
 * Center: mapping header + arrow table
 * Right:  target schema card (full fields)
 */
@customElement("sz-mapping-detail")
export class SzMappingDetail extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--sz-font-sans, system-ui);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(200px, 1fr) minmax(300px, 2fr) minmax(200px, 1fr);
      gap: 16px;
      align-items: start;
    }

    .column {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .column-header {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sz-text-muted, #6B6560);
      padding: 0 4px 4px;
      border-bottom: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
    }

    /* Mapping header */
    .mapping-header {
      background: var(--sz-card-bg, #fff);
      border: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      border-radius: var(--sz-card-radius, 8px);
      box-shadow: var(--sz-card-shadow, 0 2px 8px rgba(45, 42, 38, 0.06));
      overflow: hidden;
    }

    .mapping-title {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--sz-orange, #F2913D);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .mapping-title:hover {
      filter: brightness(0.95);
    }

    .mapping-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
    }

    .meta-tag {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--sz-badge-bg, #FFF3E8);
      color: var(--sz-text-muted, #6B6560);
    }

    .meta-tag .label {
      color: var(--sz-orange-dark, #D97726);
      font-weight: 500;
    }

    /* Arrow table */
    .arrow-table {
      width: 100%;
      border-collapse: collapse;
    }

    .arrow-table th {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sz-text-muted, #6B6560);
      text-align: left;
      padding: 6px 12px;
      border-bottom: 2px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
    }

    .arrow-table td {
      padding: 5px 12px;
      border-bottom: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      font-size: 12px;
      vertical-align: top;
    }

    .arrow-table tr {
      cursor: pointer;
    }

    .arrow-table tr:hover {
      background: rgba(45, 42, 38, 0.03);
    }

    .field-ref {
      font-family: var(--sz-font-mono, monospace);
      font-size: 12px;
      font-weight: 500;
      color: var(--sz-text, #2D2A26);
    }

    .transform-pipeline {
      font-family: var(--sz-font-mono, monospace);
      font-size: 11px;
      color: var(--sz-orange-dark, #D97726);
    }

    .transform-pipeline .pipe {
      color: var(--sz-text-muted, #6B6560);
      padding: 0 3px;
    }

    .transform-nl {
      font-style: italic;
      font-size: 11px;
      color: var(--sz-green, #5A9E6F);
    }

    .transform-bare {
      font-size: 11px;
      color: var(--sz-text-muted, #6B6560);
    }

    .arrow-icon {
      color: var(--sz-text-muted, #6B6560);
      font-size: 11px;
    }

    /* Scope sections (each/flatten) */
    .scope-section {
      margin: 4px 0;
    }

    .scope-label {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      color: var(--sz-text-muted, #6B6560);
      background: var(--sz-namespace-bg, #FFF3E8);
      border-top: 1px dashed var(--sz-card-border, rgba(45, 42, 38, 0.08));
    }

    .scope-label .scope-tag {
      font-family: var(--sz-font-mono, monospace);
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 3px;
      background: var(--sz-orange-dark, #D97726);
      color: #fff;
    }

    .scope-fields {
      font-family: var(--sz-font-mono, monospace);
      font-size: 11px;
      color: var(--sz-text, #2D2A26);
    }
  `;

  @property({ type: Object })
  mapping: MappingBlock | null = null;

  /** Source schema cards to show on the left. */
  @property({ type: Array })
  sourceSchemas: SchemaCard[] = [];

  /** Target schema card to show on the right. */
  @property({ type: Object })
  targetSchema: SchemaCard | null = null;

  /** Set of mapped field names for source schemas. */
  @property({ type: Object })
  sourceMappedFields: Map<string, Set<string>> = new Map();

  /** Set of mapped field names for the target schema. */
  @property({ type: Object })
  targetMappedFields: Set<string> = new Set();

  override render() {
    const m = this.mapping;
    if (!m) return html`<div>No mapping selected</div>`;

    return html`
      <div class="layout">
        <div class="column">
          <div class="column-header">Sources</div>
          ${this.sourceSchemas.map((s) => html`
            <sz-schema-card
              .schema=${s}
              .mappedFields=${this.sourceMappedFields.get(s.qualifiedId) ?? new Set()}
            ></sz-schema-card>
          `)}
        </div>

        <div class="column">
          <div class="column-header">Mapping</div>
          ${this._renderMappingHeader(m)}
          ${this._renderArrowTable(m)}
        </div>

        <div class="column">
          <div class="column-header">Target</div>
          ${this.targetSchema
            ? html`<sz-schema-card
                .schema=${this.targetSchema}
                .mappedFields=${this.targetMappedFields}
              ></sz-schema-card>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderMappingHeader(m: MappingBlock) {
    const sb = m.sourceBlock;

    return html`
      <div class="mapping-header">
        <div class="mapping-title" @click=${() => this._navigate(m.location)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 4h5l2 2h5v8H2V4z" opacity="0.9"/>
          </svg>
          ${m.id}
        </div>
        <div class="mapping-meta">
          ${m.sourceRefs.map((s) => html`<span class="meta-tag"><span class="label">source</span> ${s}</span>`)}
          <span class="meta-tag"><span class="label">target</span> ${m.targetRef}</span>
          ${sb?.joinDescription
            ? html`<span class="meta-tag"><span class="label">join</span> ${sb.joinDescription}</span>`
            : nothing}
          ${(sb?.filters ?? []).map((f) => html`<span class="meta-tag"><span class="label">filter</span> ${f}</span>`)}
        </div>
      </div>
    `;
  }

  private _renderArrowTable(m: MappingBlock) {
    return html`
      <div class="mapping-header" style="padding: 0;">
        <table class="arrow-table">
          <thead>
            <tr>
              <th>Source</th>
              <th></th>
              <th>Transform</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            ${m.arrows.map((a) => this._renderArrowRow(a))}
            ${m.eachBlocks.map((eb) => this._renderEachSection(eb))}
            ${m.flattenBlocks.map((fb) => this._renderFlattenSection(fb))}
          </tbody>
        </table>
      </div>
    `;
  }

  private _renderArrowRow(a: ArrowEntry): TemplateResult {
    return html`
      <tr @click=${() => this._navigate(a.location)}>
        <td><span class="field-ref">${a.sourceFields.join(", ")}</span></td>
        <td><span class="arrow-icon">&#x2192;</span></td>
        <td>${this._renderTransform(a)}</td>
        <td><span class="field-ref">${a.targetField}</span></td>
      </tr>
    `;
  }

  private _renderTransform(a: ArrowEntry): TemplateResult {
    if (!a.transform) {
      return html`<span class="transform-bare">direct</span>`;
    }

    const t = a.transform;
    if (t.kind === "pipeline" || t.kind === "mixed") {
      return html`
        <span class="transform-pipeline">
          ${t.steps.map((step, i) => html`${i > 0 ? html`<span class="pipe">|</span>` : nothing}${step}`)}
        </span>
        ${t.nlText ? html`<br/><span class="transform-nl">${t.nlText}</span>` : nothing}
      `;
    }

    if (t.kind === "nl") {
      return html`<span class="transform-nl">${t.nlText ?? t.text}</span>`;
    }

    // map kind
    return html`<span class="transform-pipeline">${t.text}</span>`;
  }

  private _renderEachSection(eb: EachBlock): TemplateResult {
    return html`
      <tr class="scope-section">
        <td colspan="4">
          <div class="scope-label">
            <span class="scope-tag">each</span>
            <span class="scope-fields">${eb.sourceField} &#x2192; ${eb.targetField}</span>
          </div>
        </td>
      </tr>
      ${eb.arrows.map((a) => this._renderArrowRow(a))}
      ${eb.nestedEach.map((ne) => this._renderEachSection(ne))}
    `;
  }

  private _renderFlattenSection(fb: FlattenBlock): TemplateResult {
    return html`
      <tr class="scope-section">
        <td colspan="4">
          <div class="scope-label">
            <span class="scope-tag">flatten</span>
            <span class="scope-fields">${fb.sourceField}</span>
          </div>
        </td>
      </tr>
      ${fb.arrows.map((a) => this._renderArrowRow(a))}
    `;
  }

  private _navigate(loc: import("../model.js").SourceLocation) {
    this.dispatchEvent(new SzNavigateEvent(loc));
  }
}
