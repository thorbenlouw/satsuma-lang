/**
 * types.ts — Shared type definitions for satsuma-core
 *
 * Defines both the tree-sitter primitives and the extracted record shapes
 * produced by the satsuma-core extraction functions.
 */

// ── Tree-sitter primitives ──────────────────────────────────────────────────

export interface SyntaxNode {
  type: string;
  text: string;
  isNamed: boolean;
  children: SyntaxNode[];
  namedChildren: SyntaxNode[];
  childCount: number;
  child(index: number): SyntaxNode | null;
  childForFieldName?(name: string): SyntaxNode | null;
  parent: SyntaxNode | null;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  startIndex: number;
  endIndex: number;
  isMissing: boolean;
}

export interface Tree {
  rootNode: SyntaxNode;
}

// ── Classification ──────────────────────────────────────────────────────────

/**
 * Arrow transform classification, derived from CST node types by the arrow extractor.
 *
 * - "structural"  — the transform is a deterministic pipeline (function calls, map blocks,
 *                   arithmetic). Fully machine-readable; no interpretation needed.
 * - "nl"          — the transform is a natural language string. Requires human or LLM
 *                   interpretation to understand intent.
 * - "mixed"       — the transform contains both pipeline steps and an NL string.
 *                   The pipeline portion is deterministic; the NL portion requires interpretation.
 * - "none"        — bare arrow with no transform (`src -> tgt`). Signals a direct copy.
 * - "nl-derived"  — a synthetic arrow inferred from an `@ref` mention inside an NL transform
 *                   string. Not declared explicitly in the source; created by the graph builder
 *                   to represent implicit field lineage from NL references.
 */
export type Classification = "structural" | "nl" | "mixed" | "none" | "nl-derived";

export interface PipeStep {
  type: string;
  text: string;
}

// ── Metadata entry types ────────────────────────────────────────────────────

export interface MetaEntryTag {
  kind: "tag";
  tag: string;
}

export interface MetaEntryKV {
  kind: "kv";
  key: string;
  value: string;
}

export interface MetaEntryEnum {
  kind: "enum";
  values: string[];
}

export interface MetaEntryNote {
  kind: "note";
  text: string;
}

/**
 * A `slice { dim1, dim2 }` metadata entry on a metric block.
 *
 * Specifies the dimension schema names by which the metric can be sliced or
 * grouped in reporting tools. Unlike MetaEntryEnum (which lists allowed field
 * values), the `values` here are schema references — names of dimension schemas
 * that define the slicing axes.
 *
 * Created by the metric extractor when it encounters `slice { ... }` in metric
 * metadata. Consumed by the metric command and diff engine.
 */
export interface MetaEntrySlice {
  kind: "slice";
  /** Dimension schema names that define the valid slicing axes for this metric. */
  values: string[];
}

export type MetaEntry = MetaEntryTag | MetaEntryKV | MetaEntryEnum | MetaEntryNote | MetaEntrySlice;

// ── Extracted record shapes ─────────────────────────────────────────────────

export interface FieldDecl {
  name: string;
  type: string;
  children?: FieldDecl[];
  isList?: boolean;
  metadata?: MetaEntry[];
  hasSpreads?: boolean;
  spreads?: string[];
}
