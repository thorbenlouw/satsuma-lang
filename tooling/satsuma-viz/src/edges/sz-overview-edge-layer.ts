/**
 * SVG edge layer for the schema-level overview.
 *
 * Renders thick (3-4px) curved arrows between schema nodes. Each arrow is
 * labeled with the mapping name at the midpoint. Click dispatches
 * SzOpenMappingEvent. Hover shows a tooltip with mapping summary.
 */

import { LitElement, html, svg, css, unsafeCSS, type SVGTemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { OverviewEdge } from "../layout/elk-layout.js";
import type { MappingBlock } from "../model.js";
import tokens from "../tokens.css";

/** Event dispatched when a user clicks an overview edge to open a mapping detail. */
export class SzOpenMappingEvent extends Event {
  readonly mapping: MappingBlock;
  constructor(mapping: MappingBlock) {
    super("open-mapping", { bubbles: true, composed: true });
    this.mapping = mapping;
  }
}

@customElement("sz-overview-edge-layer")
export class SzOverviewEdgeLayer extends LitElement {
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

    .overview-path {
      fill: none;
      stroke-width: 3;
      pointer-events: stroke;
      cursor: pointer;
      transition: stroke-width 0.15s ease, opacity 0.15s ease;
    }

    .overview-path:hover {
      stroke-width: 5;
    }

    .overview-path.pipeline {
      stroke: var(--sz-edge-pipeline, #D97726);
    }

    .overview-path.nl {
      stroke: var(--sz-edge-nl, #5A9E6F);
    }

    .overview-path.mixed {
      stroke: var(--sz-edge-pipeline, #D97726);
    }

    .overview-path.bare {
      stroke: var(--sz-text-muted, #6B6560);
    }

    .mapping-label-group {
      pointer-events: all;
      cursor: pointer;
    }

    .mapping-label-bg {
      fill: var(--sz-card-bg, #fff);
      stroke: var(--sz-card-border, rgba(45, 42, 38, 0.08));
      stroke-width: 1;
      rx: 4;
    }

    .mapping-label-text {
      font-family: var(--sz-font-sans, system-ui);
      font-size: 10px;
      font-weight: 600;
      fill: var(--sz-text-muted, #6B6560);
      text-anchor: middle;
      dominant-baseline: central;
    }

    .mapping-label-group:hover .mapping-label-bg {
      fill: var(--sz-badge-bg, #FFF3E8);
      stroke: var(--sz-orange-dark, #D97726);
    }

    .mapping-label-group:hover .mapping-label-text {
      fill: var(--sz-orange-dark, #D97726);
    }

    /* Tooltip */
    .tooltip {
      position: absolute;
      pointer-events: none;
      background: var(--sz-card-bg, #fff);
      border: 1px solid var(--sz-card-border, rgba(45, 42, 38, 0.08));
      box-shadow: var(--sz-card-shadow, 0 2px 8px rgba(45, 42, 38, 0.06));
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 11px;
      white-space: nowrap;
      z-index: 20;
    }

    .tooltip-name {
      font-weight: 600;
      color: var(--sz-text, #2D2A26);
      margin-bottom: 2px;
    }

    .tooltip-detail {
      color: var(--sz-text-muted, #6B6560);
    }

    .tooltip-count {
      font-family: var(--sz-font-mono, monospace);
      color: var(--sz-orange-dark, #D97726);
    }
  `;

  @property({ type: Array })
  edges: OverviewEdge[] = [];

  @property({ type: Number })
  width = 800;

  @property({ type: Number })
  height = 600;

  @state()
  private _hoveredEdge: string | null = null;

  @state()
  private _hoverPos: { x: number; y: number } = { x: 0, y: 0 };

  override render() {
    const hoveredEdge = this._hoveredEdge
      ? this.edges.find((e) => e.id === this._hoveredEdge)
      : null;

    return html`
      <svg
        width=${this.width}
        height=${this.height}
        viewBox="0 0 ${this.width} ${this.height}"
      >
        ${this.edges.map((e) => this._renderOverviewEdge(e))}
      </svg>
      ${hoveredEdge ? this._renderTooltip(hoveredEdge) : ""}
    `;
  }

  private _renderOverviewEdge(edge: OverviewEdge): SVGTemplateResult {
    if (edge.points.length < 2) return svg``;

    const d = this._buildCurvePath(edge.points);
    const cls = this._edgeColorClass(edge.mapping);
    const labelPos = this._labelAnchor(edge.points);
    const labelText = edge.mapping.id;
    const labelWidth = edge.labelWidth;

    return svg`
      <path
        class="overview-path ${cls}"
        d=${d}
        @click=${() => this._onEdgeClick(edge)}
        @mouseenter=${(ev: MouseEvent) => this._onEdgeHover(edge.id, ev)}
        @mouseleave=${() => this._onEdgeLeave()}
      />
      <g
        class="mapping-label-group"
        transform="translate(${labelPos.x}, ${labelPos.y})"
        @click=${() => this._onEdgeClick(edge)}
        @mouseenter=${(ev: MouseEvent) => this._onEdgeHover(edge.id, ev)}
        @mouseleave=${() => this._onEdgeLeave()}
      >
        <rect
          class="mapping-label-bg"
          x=${-labelWidth / 2}
          y="-10"
          width=${labelWidth}
          height="20"
        />
        <text class="mapping-label-text">${labelText}</text>
      </g>
    `;
  }

  /** Classify the mapping's dominant transform type for coloring. */
  private _edgeColorClass(m: MappingBlock): string {
    let pipeline = 0;
    let nl = 0;
    let bare = 0;

    const countArrows = (arrows: typeof m.arrows) => {
      for (const a of arrows) {
        if (!a.transform) bare++;
        else if (a.transform.kind === "nl") nl++;
        else pipeline++;
      }
    };

    countArrows(m.arrows);
    for (const eb of m.eachBlocks) countArrows(eb.arrows);
    for (const fb of m.flattenBlocks) countArrows(fb.arrows);

    if (nl > pipeline && nl > bare) return "nl";
    if (pipeline > 0) return "pipeline";
    if (nl > 0) return "nl";
    return "bare";
  }

  private _buildCurvePath(points: Array<{ x: number; y: number }>): string {
    if (points.length === 2) {
      const [p0, p1] = points;
      const dx = (p1.x - p0.x) * 0.5;
      return `M ${p0.x} ${p0.y} C ${p0.x + dx} ${p0.y}, ${p1.x - dx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

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

  private _labelAnchor(
    points: Array<{ x: number; y: number }>
  ): { x: number; y: number } {
    if (points.length < 2) return { x: 0, y: 0 };

    let best:
      | {
          score: number;
          length: number;
          start: { x: number; y: number };
          end: { x: number; y: number };
        }
      | null = null;

    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1];
      const end = points[i];
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const score = dx - dy * 0.5;

      if (!best || score > best.score || (score === best.score && length > best.length)) {
        best = { score, length, start, end };
      }
    }

    if (!best) return this._midpoint(points);

    return {
      x: (best.start.x + best.end.x) / 2,
      y: (best.start.y + best.end.y) / 2,
    };
  }

  private _onEdgeClick(edge: OverviewEdge) {
    this.dispatchEvent(new SzOpenMappingEvent(edge.mapping));
  }

  private _onEdgeHover(edgeId: string, ev: MouseEvent) {
    this._hoveredEdge = edgeId;
    const rect = this.getBoundingClientRect();
    this._hoverPos = { x: ev.clientX - rect.left + 12, y: ev.clientY - rect.top - 10 };
  }

  private _onEdgeLeave() {
    this._hoveredEdge = null;
  }

  private _countAllArrows(m: MappingBlock): number {
    let count = m.arrows.length;
    for (const eb of m.eachBlocks) count += eb.arrows.length;
    for (const fb of m.flattenBlocks) count += fb.arrows.length;
    return count;
  }

  private _renderTooltip(edge: OverviewEdge) {
    const m = edge.mapping;
    const arrowCount = this._countAllArrows(m);

    return html`
      <div class="tooltip" style="left: ${this._hoverPos.x}px; top: ${this._hoverPos.y}px;">
        <div class="tooltip-name">${m.id}</div>
        <div class="tooltip-detail">
          ${m.sourceRefs.join(", ")} &#x2192; ${m.targetRef}
        </div>
        <div class="tooltip-count">${arrowCount} arrow${arrowCount !== 1 ? "s" : ""}</div>
      </div>
    `;
  }
}
