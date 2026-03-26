/**
 * SVG edge layer — renders Bezier curves between mapped field ports.
 *
 * Sits as an SVG overlay on top of the card DOM. Receives positioned edge
 * data from the ELK layout engine and renders styled paths with optional
 * gear icons at the midpoint for transform detail.
 */

import { LitElement, html, svg, css, unsafeCSS, type SVGTemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { LayoutEdge } from "../layout/elk-layout.js";
import tokens from "../tokens.css";
import { SzNavigateEvent } from "../satsuma-viz.js";

@customElement("sz-edge-layer")
export class SzEdgeLayer extends LitElement {
  static override styles = css`
    ${unsafeCSS(tokens)}

    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      overflow: visible;
    }

    svg {
      overflow: visible;
    }

    .edge-path {
      fill: none;
      stroke-width: 1.5;
      pointer-events: stroke;
      cursor: pointer;
      transition: stroke-width 0.15s ease;
    }

    .edge-path:hover {
      stroke-width: 3;
    }

    .edge-path.pipeline {
      stroke: var(--sz-edge-pipeline, #D97726);
    }

    .edge-path.nl {
      stroke: var(--sz-edge-nl, #5A9E6F);
      stroke-dasharray: 6 3;
    }

    .edge-path.bare {
      stroke: var(--sz-text-muted, #6B6560);
      stroke-width: 1;
    }

    .gear-group {
      pointer-events: all;
      cursor: pointer;
    }

    .gear-circle {
      fill: var(--sz-card-bg, #fff);
      stroke: var(--sz-text-muted, #6B6560);
      stroke-width: 1;
    }

    .gear-icon {
      fill: var(--sz-text-muted, #6B6560);
      font-size: 10px;
      text-anchor: middle;
      dominant-baseline: central;
    }

    .gear-group:hover .gear-circle {
      stroke: var(--sz-orange, #F2913D);
      fill: var(--sz-badge-bg, #FFF3E8);
    }

    .gear-group:hover .gear-icon {
      fill: var(--sz-orange, #F2913D);
    }

    .transform-card {
      position: absolute;
      pointer-events: all;
      background: var(--sz-card-bg, #fff);
      border: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      box-shadow: var(--sz-card-shadow, 0 2px 8px rgba(45, 42, 38, 0.06));
      border-radius: var(--sz-card-radius, 8px);
      padding: 8px 12px;
      font-size: 11px;
      max-width: 280px;
      z-index: 10;
    }

    .transform-card .label {
      font-family: var(--sz-font-sans, system-ui);
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--sz-text-muted, #6B6560);
      margin-bottom: 4px;
      letter-spacing: 0.04em;
    }

    .transform-card .pipeline-text {
      font-family: var(--sz-font-mono, monospace);
      color: var(--sz-text, #2D2A26);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .transform-card .nl-text {
      font-family: var(--sz-font-sans, system-ui);
      font-style: italic;
      color: var(--sz-green, #5A9E6F);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .transform-card .step {
      display: flex;
      gap: 4px;
      align-items: baseline;
      padding: 1px 0;
    }

    .transform-card .step-sep {
      color: var(--sz-text-muted, #6B6560);
    }
  `;

  @property({ type: Array })
  edges: LayoutEdge[] = [];

  @property({ type: Number })
  width = 800;

  @property({ type: Number })
  height = 600;

  @state()
  private _expandedEdge: string | null = null;

  override render() {
    return html`
      <svg
        width=${this.width}
        height=${this.height}
        viewBox="0 0 ${this.width} ${this.height}"
      >
        ${this.edges.map((e) => this._renderEdge(e))}
      </svg>
      ${this._expandedEdge ? this._renderTransformCard() : ""}
    `;
  }

  private _renderEdge(edge: LayoutEdge): SVGTemplateResult {
    if (edge.points.length < 2) return svg``;

    const d = this._buildCurvePath(edge.points);
    const kind = edge.arrow.transform?.kind ?? "bare";
    const cls =
      kind === "nl"
        ? "nl"
        : kind === "pipeline" || kind === "mixed" || kind === "map"
          ? "pipeline"
          : "bare";

    const mid = this._midpoint(edge.points);
    const hasTransform = edge.arrow.transform !== null;

    return svg`
      <path
        class="edge-path ${cls}"
        d=${d}
        @click=${() => this._onEdgeClick(edge)}
      />
      ${hasTransform
        ? svg`
          <g
            class="gear-group"
            transform="translate(${mid.x}, ${mid.y})"
            @click=${(ev: Event) => { ev.stopPropagation(); this._toggleGear(edge.id); }}
          >
            <circle class="gear-circle" r="9" />
            <text class="gear-icon" dy="0.5">&#9881;</text>
          </g>
        `
        : svg``}
    `;
  }

  private _buildCurvePath(points: Array<{ x: number; y: number }>): string {
    if (points.length === 2) {
      // Simple cubic bezier with horizontal control points
      const [p0, p1] = points;
      const dx = (p1.x - p0.x) * 0.5;
      return `M ${p0.x} ${p0.y} C ${p0.x + dx} ${p0.y}, ${p1.x - dx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    // Multi-point: start with move, then curve through bend points
    const parts = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = (curr.x - prev.x) * 0.4;
      parts.push(
        `C ${prev.x + dx} ${prev.y}, ${curr.x - dx} ${curr.y}, ${curr.x} ${curr.y}`
      );
    }
    return parts.join(" ");
  }

  private _midpoint(
    points: Array<{ x: number; y: number }>
  ): { x: number; y: number } {
    const mid = Math.floor(points.length / 2);
    if (points.length % 2 === 0) {
      return {
        x: (points[mid - 1].x + points[mid].x) / 2,
        y: (points[mid - 1].y + points[mid].y) / 2,
      };
    }
    return points[mid];
  }

  private _onEdgeClick(edge: LayoutEdge) {
    if (edge.arrow.location.uri) {
      this.dispatchEvent(new SzNavigateEvent(edge.arrow.location));
    }
  }

  private _toggleGear(edgeId: string) {
    this._expandedEdge = this._expandedEdge === edgeId ? null : edgeId;
  }

  private _renderTransformCard() {
    const edge = this.edges.find((e) => e.id === this._expandedEdge);
    if (!edge?.arrow.transform) return html``;

    const mid = this._midpoint(edge.points);
    const t = edge.arrow.transform;

    return html`
      <div
        class="transform-card"
        style="left: ${mid.x + 16}px; top: ${mid.y - 12}px"
        @click=${(ev: Event) => ev.stopPropagation()}
      >
        <div class="label">
          ${t.kind === "nl" ? "Natural Language" : t.kind === "mixed" ? "Mixed Transform" : "Pipeline"}
        </div>
        ${t.kind === "nl" || (t.kind === "mixed" && t.nlText)
          ? html`<div class="nl-text">${t.nlText ?? t.text}</div>`
          : ""}
        ${t.steps.length > 0
          ? html`${t.steps.map(
              (step, i) => html`
                <div class="step">
                  ${i > 0 ? html`<span class="step-sep">|</span>` : ""}
                  <span class="pipeline-text">${step}</span>
                </div>
              `
            )}`
          : t.kind !== "nl"
            ? html`<div class="pipeline-text">${t.text}</div>`
            : ""}
      </div>
    `;
  }
}
