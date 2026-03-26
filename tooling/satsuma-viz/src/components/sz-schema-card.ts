import { LitElement, html, css, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { SchemaCard, FieldEntry } from "../model.js";
import { SzNavigateEvent, SzExpandLineageEvent } from "../satsuma-viz.js";

@customElement("sz-schema-card")
export class SzSchemaCard extends LitElement {
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
      background: var(--sz-orange, #F2913D);
      color: #fff;
      cursor: pointer;
      user-select: none;
    }

    .header-icon {
      width: 16px;
      height: 16px;
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

    .label {
      padding: 4px 12px 6px;
      font-size: 12px;
      color: var(--sz-text-muted, #6B6560);
      font-style: italic;
      border-bottom: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
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

    .port {
      width: var(--sz-port-size, 8px);
      height: var(--sz-port-size, 8px);
      border-radius: 50%;
      flex-shrink: 0;
    }

    .port.mapped {
      background: var(--sz-orange-dark, #D97726);
    }

    .port.unmapped {
      border: 1.5px solid var(--sz-text-muted, #6B6560);
      background: transparent;
    }

    .field-name {
      font-family: var(--sz-font-mono, monospace);
      font-size: 12px;
      font-weight: 500;
      color: var(--sz-text, #2D2A26);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    .badge.pii {
      background: var(--sz-warning-bg, #FEF3CD);
      color: var(--sz-warning-icon, #C45D22);
    }

    .comment-badge {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      flex-shrink: 0;
      cursor: help;
    }

    .comment-badge.warning {
      background: var(--sz-warning-bg, #FEF3CD);
      color: var(--sz-warning-icon, #C45D22);
    }

    .comment-badge.question {
      background: var(--sz-question-bg, #E8F0FE);
      color: var(--sz-question-icon, #7C6BAE);
    }

    .nested {
      padding-left: 20px;
    }

    .collapsed .fields {
      display: none;
    }

    .collapsed .label {
      display: none;
    }

    .collapsed .notes-section {
      display: none;
    }

    .lineage-buttons {
      display: flex;
      justify-content: center;
      gap: 4px;
      padding: 4px 12px 6px;
      border-top: 1px dashed var(--sz-card-border, rgba(45, 42, 38, 0.08));
    }

    .lineage-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      border-radius: 4px;
      background: transparent;
      color: var(--sz-text-muted, #6B6560);
      cursor: pointer;
      font-size: 11px;
      font-family: inherit;
    }

    .lineage-btn:hover {
      background: var(--sz-badge-bg, #FFF3E8);
      color: var(--sz-orange-dark, #D97726);
      border-color: var(--sz-orange-dark, #D97726);
    }

    .notes-section {
      border-top: 1px dashed var(--sz-card-border, rgba(45, 42, 38, 0.08));
      padding: 6px 12px;
    }

    .notes-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 12px;
      color: var(--sz-text-muted, #6B6560);
      user-select: none;
      padding: 2px 0;
    }

    .notes-toggle:hover {
      color: var(--sz-text, #2D2A26);
    }

    .notes-toggle .arrow {
      font-size: 10px;
      transition: transform 0.15s ease;
    }

    .notes-toggle .arrow[data-expanded] {
      transform: rotate(90deg);
    }

    .note-content {
      font-family: var(--sz-font-sans, system-ui);
      font-size: 12px;
      color: var(--sz-text, #2D2A26);
      line-height: 1.5;
      padding: 4px 0 2px 22px;
      white-space: pre-wrap;
      word-break: break-word;
    }
  `;

  @property({ type: Object })
  schema: SchemaCard | null = null;

  /** Set of mapped target field names — set by parent to indicate which fields have arrows. */
  @property({ type: Object })
  mappedFields: Set<string> = new Set();

  @state()
  private _collapsed = false;

  @state()
  private _notesExpanded = false;

  override render() {
    const s = this.schema;
    if (!s) return html``;

    const totalFields = this._countFields(s.fields);
    const mappedCount = this._countMapped(s.fields);
    const hasNotes = s.notes.length > 0;

    return html`
      <div class=${this._collapsed ? "collapsed" : ""}>
        <div class="header" @click=${this._onHeaderClick}>
          <svg class="header-icon" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="2" width="14" height="12" rx="2" opacity="0.9"/>
            <line x1="1" y1="6" x2="15" y2="6" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
          </svg>
          <span class="header-name">${s.id}</span>
          <span class="header-count">${mappedCount}/${totalFields}</span>
          <span class="header-toggle" ?data-collapsed=${this._collapsed}>&#9660;</span>
        </div>
        ${s.label ? html`<div class="label">${s.label}</div>` : ""}
        <div class="fields">
          ${s.fields.map((f) => this._renderField(f, 0))}
        </div>
        ${hasNotes ? this._renderNotes(s.notes) : ""}
        ${s.hasExternalLineage ? this._renderLineageButtons(s.qualifiedId) : ""}
      </div>
    `;
  }

  private _renderLineageButtons(qualifiedId: string) {
    return html`
      <div class="lineage-buttons">
        <button class="lineage-btn" @click=${(e: Event) => { e.stopPropagation(); this._expandLineage(qualifiedId); }}
          title="Expand cross-file lineage">
          &#9664; upstream &middot; downstream &#9654;
        </button>
      </div>
    `;
  }

  private _expandLineage(schemaId: string) {
    this.dispatchEvent(new SzExpandLineageEvent(schemaId));
  }

  private _renderNotes(notes: import("../model.js").NoteBlock[]) {
    return html`
      <div class="notes-section">
        <div class="notes-toggle" @click=${this._toggleNotes}>
          <span class="arrow" ?data-expanded=${this._notesExpanded}>&#9654;</span>
          <span>&#128221; ${notes.length === 1 ? "Note" : `${notes.length} Notes`}</span>
        </div>
        ${this._notesExpanded
          ? notes.map((n) => html`<div class="note-content">${n.text}</div>`)
          : ""}
      </div>
    `;
  }

  private _toggleNotes(e: Event) {
    e.stopPropagation();
    this._notesExpanded = !this._notesExpanded;
  }

  private _renderField(f: FieldEntry, depth: number): TemplateResult {
    const isMapped = this.mappedFields.has(f.name);
    const hasWarning = f.comments.some((c) => c.kind === "warning");
    const hasQuestion = f.comments.some((c) => c.kind === "question");
    const hasPii = f.constraints.includes("pii");

    return html`
      <div
        class="field-row ${depth > 0 ? "nested" : ""}"
        style=${depth > 0 ? `padding-left: ${12 + depth * 20}px` : ""}
        @click=${() => this._navigate(f.location)}
        title=${f.name + ": " + f.type}
      >
        <span class="port ${isMapped ? "mapped" : "unmapped"}"></span>
        <span class="field-name">${f.name}</span>
        <span class="field-type">${f.type}</span>
        <span class="badges">
          ${f.constraints
            .filter((c) => c !== "pii")
            .map(
              (c) => html`<span class="badge">${c}</span>`
            )}
          ${hasPii ? html`<span class="badge pii" title="PII">&#128737; pii</span>` : ""}
        </span>
        ${hasWarning
          ? html`<span class="comment-badge warning" title=${this._commentText(f, "warning")}>&#9888;</span>`
          : ""}
        ${hasQuestion
          ? html`<span class="comment-badge question" title=${this._commentText(f, "question")}>?</span>`
          : ""}
      </div>
      ${f.children.map((child) => this._renderField(child, depth + 1))}
    `;
  }

  private _commentText(f: FieldEntry, kind: "warning" | "question"): string {
    return f.comments
      .filter((c) => c.kind === kind)
      .map((c) => c.text)
      .join("\n");
  }

  private _countFields(fields: FieldEntry[]): number {
    let count = 0;
    for (const f of fields) {
      count++;
      count += this._countFields(f.children);
    }
    return count;
  }

  private _countMapped(fields: FieldEntry[]): number {
    let count = 0;
    for (const f of fields) {
      if (this.mappedFields.has(f.name)) count++;
      count += this._countMapped(f.children);
    }
    return count;
  }

  private _onHeaderClick() {
    this._collapsed = !this._collapsed;
    if (this.schema) {
      this._navigate(this.schema.location);
    }
  }

  private _navigate(loc: import("../model.js").SourceLocation) {
    this.dispatchEvent(new SzNavigateEvent(loc));
  }
}
