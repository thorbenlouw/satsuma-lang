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

export interface MetaEntrySlice {
  kind: "slice";
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
