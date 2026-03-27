import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  MappingBlock,
  SchemaCard,
  ArrowEntry,
  EachBlock,
  FlattenBlock,
} from "../model.js";
import { SzNavigateEvent, SzFieldHoverEvent } from "../satsuma-viz.js";

/**
 * Three-column mapping detail view.
 *
 * Left:   source schema cards (full fields)
 * Center: mapping header + arrow table
 * Right:  target schema card (full fields)
 *
 * Supports bidirectional hover cross-highlighting between the arrow table
 * and the schema cards.
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
      grid-template-columns: minmax(280px, 1fr) minmax(360px, 2fr) minmax(280px, 1fr);
      gap: 16px;
      align-items: start;
    }

    /* Let schema cards fill the available column width without capping at 380px */
    .column sz-schema-card {
      --sz-card-max-width: none;
      width: 100%;
      box-sizing: border-box;
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
      transition: opacity 0.15s ease, background 0.15s ease;
    }

    .arrow-table tr:hover {
      background: rgba(45, 42, 38, 0.03);
    }

    /* Cross-highlighting on arrow rows */
    :host([has-highlight]) .arrow-table tr.arrow-row {
      opacity: 0.5;
    }

    :host([has-highlight]) .arrow-table tr.arrow-row.hl {
      opacity: 1;
      background: rgba(242, 145, 61, 0.08);
    }

    :host([has-highlight]) .arrow-table tr.arrow-row.hl .field-ref {
      font-weight: 700;
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

  /** Currently hovered arrow (from table row hover). */
  @state()
  private _hoveredArrow: ArrowEntry | null = null;

  /** Field name hovered from a schema card (via field-hover event). */
  @state()
  private _hoveredCardField: string | null = null;

  /** Schema ID of the card whose field is hovered. */
  @state()
  private _hoveredCardSchema: string | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener("field-hover", this._onFieldHover as EventListener);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("field-hover", this._onFieldHover as EventListener);
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has("_hoveredArrow") || changed.has("_hoveredCardField")) {
      if (this._hoveredArrow || this._hoveredCardField) {
        this.setAttribute("has-highlight", "");
      } else {
        this.removeAttribute("has-highlight");
      }
    }
  }

  private _onFieldHover = ((e: SzFieldHoverEvent) => {
    this._hoveredCardSchema = e.schemaId;
    this._hoveredCardField = e.fieldName;
    // Clear table row hover when card field is hovered
    if (e.fieldName) this._hoveredArrow = null;
  }) as EventListener;

  /** Compute which source fields should be highlighted. */
  private get _sourceHighlightFields(): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    const m = this.mapping;
    if (!m) return result;

    if (this._hoveredArrow) {
      // Highlight source fields of the hovered arrow in all source schemas
      for (const sr of m.sourceRefs) {
        const fields = new Set(this._hoveredArrow.sourceFields);
        result.set(sr, fields);
      }
    } else if (this._hoveredCardField && this._hoveredCardSchema) {
      // If a target field is hovered, find which source fields map to it
      if (this._hoveredCardSchema === m.targetRef) {
        const matchingSourceFields = this._findSourceFieldsForTarget(
          this._hoveredCardField, m
        );
        for (const sr of m.sourceRefs) {
          result.set(sr, matchingSourceFields);
        }
      }
      // If a source field is hovered, highlight it in its own card
      else if (m.sourceRefs.includes(this._hoveredCardSchema)) {
        result.set(
          this._hoveredCardSchema,
          new Set([this._hoveredCardField])
        );
      }
    }

    return result;
  }

  /** Compute which target fields should be highlighted. */
  private get _targetHighlightFields(): Set<string> {
    const m = this.mapping;
    if (!m) return new Set();

    if (this._hoveredArrow) {
      return new Set([this._hoveredArrow.targetField]);
    }

    if (this._hoveredCardField && this._hoveredCardSchema) {
      // If a source field is hovered, find which target fields it maps to
      if (m.sourceRefs.includes(this._hoveredCardSchema)) {
        return this._findTargetFieldsForSource(this._hoveredCardField, m);
      }
      // If target card field is hovered, highlight it
      if (this._hoveredCardSchema === m.targetRef) {
        return new Set([this._hoveredCardField]);
      }
    }

    return new Set();
  }

  /** Find source fields that map to a given target field. */
  private _findSourceFieldsForTarget(targetField: string, m: MappingBlock): Set<string> {
    const result = new Set<string>();
    const search = (arrows: ArrowEntry[]) => {
      for (const a of arrows) {
        if (a.targetField === targetField) {
          for (const sf of a.sourceFields) result.add(sf);
        }
      }
    };
    search(m.arrows);
    for (const eb of m.eachBlocks) search(eb.arrows);
    for (const fb of m.flattenBlocks) search(fb.arrows);
    return result;
  }

  /** Find target fields that a given source field maps to. */
  private _findTargetFieldsForSource(sourceField: string, m: MappingBlock): Set<string> {
    const result = new Set<string>();
    const search = (arrows: ArrowEntry[]) => {
      for (const a of arrows) {
        if (a.sourceFields.includes(sourceField)) {
          result.add(a.targetField);
        }
      }
    };
    search(m.arrows);
    for (const eb of m.eachBlocks) search(eb.arrows);
    for (const fb of m.flattenBlocks) search(fb.arrows);
    return result;
  }

  /** Check if an arrow row should be highlighted. */
  private _isArrowHighlighted(a: ArrowEntry): boolean {
    if (this._hoveredArrow === a) return true;
    if (!this._hoveredCardField || !this._hoveredCardSchema) return false;

    const m = this.mapping!;
    // Source card field hovered → highlight rows where it's a source
    if (m.sourceRefs.includes(this._hoveredCardSchema)) {
      return a.sourceFields.includes(this._hoveredCardField);
    }
    // Target card field hovered → highlight rows where it's the target
    if (this._hoveredCardSchema === m.targetRef) {
      return a.targetField === this._hoveredCardField;
    }
    return false;
  }

  override render() {
    const m = this.mapping;
    if (!m) return html`<div>No mapping selected</div>`;

    const sourceHL = this._sourceHighlightFields;
    const targetHL = this._targetHighlightFields;

    return html`
      <div class="layout">
        <div class="column">
          <div class="column-header">Sources</div>
          ${this.sourceSchemas.map((s) => html`
            <sz-schema-card
              .schema=${s}
              .mappedFields=${this.sourceMappedFields.get(s.qualifiedId) ?? new Set()}
              .highlightFields=${sourceHL.get(s.qualifiedId) ?? new Set()}
              highlightColor="source"
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
                .highlightFields=${targetHL}
                highlightColor="target"
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
    const hl = this._isArrowHighlighted(a) ? "hl" : "";

    return html`
      <tr
        class="arrow-row ${hl}"
        @click=${() => this._navigate(a.location)}
        @mouseenter=${() => { this._hoveredArrow = a; this._hoveredCardField = null; }}
        @mouseleave=${() => { this._hoveredArrow = null; }}
      >
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
