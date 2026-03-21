/**
 * nl-ref-extract.ts — Extract and resolve backtick references from NL strings
 *
 * Parses NL strings inside transform pipe steps for backtick-delimited
 * references (e.g., `source::hr_employees`, `posted_by`), classifies them,
 * and optionally resolves them against a WorkspaceIndex.
 *
 * This module is the shared foundation for validate, lineage, where-used,
 * arrows, context, and the nl-refs command.
 */

import type { FieldDecl, MappingRecord, NLRefData, SyntaxNode, WorkspaceIndex } from "./types.js";
import { expandEntityFields } from "./spread-expand.js";

// ── Extraction ──────────────────────────────────────────────────────────────

const BACKTICK_RE = /`([^`]+)`/g;

export interface BacktickRef {
  ref: string;
  offset: number;
}

/**
 * Extract backtick-delimited references from a single NL string.
 */
export function extractBacktickRefs(text: string): BacktickRef[] {
  const refs: BacktickRef[] = [];
  let match;
  BACKTICK_RE.lastIndex = 0;
  while ((match = BACKTICK_RE.exec(text)) !== null) {
    refs.push({ ref: match[1]!, offset: match.index });
  }
  return refs;
}

// ── Classification ──────────────────────────────────────────────────────────

export type RefClassification =
  | "namespace-qualified-field"
  | "namespace-qualified-schema"
  | "dotted-field"
  | "bare";

/**
 * Classify a backtick reference by its syntactic form.
 */
export function classifyRef(ref: string): RefClassification {
  if (ref.includes("::")) {
    return ref.includes(".") ? "namespace-qualified-field" : "namespace-qualified-schema";
  }
  if (ref.includes(".")) return "dotted-field";
  return "bare";
}

// ── Resolution ──────────────────────────────────────────────────────────────

interface MappingContext {
  sources: string[];
  targets: string[];
  namespace: string | null;
}

interface Resolution {
  resolved: boolean;
  resolvedTo: { kind: string; name: string } | null;
}

/**
 * Resolve a single backtick reference against the workspace index.
 */
export function resolveRef(ref: string, mappingContext: MappingContext, index: WorkspaceIndex): Resolution {
  const classification = classifyRef(ref);

  if (classification === "namespace-qualified-schema") {
    if (index.schemas.has(ref)) return { resolved: true, resolvedTo: { kind: "schema", name: ref } };
    if (index.fragments?.has(ref)) return { resolved: true, resolvedTo: { kind: "fragment", name: ref } };
    if (index.transforms?.has(ref)) return { resolved: true, resolvedTo: { kind: "transform", name: ref } };
    return { resolved: false, resolvedTo: null };
  }

  if (classification === "namespace-qualified-field") {
    const dotIdx = ref.indexOf(".", ref.indexOf("::") + 2);
    const schemaRef = ref.slice(0, dotIdx);
    const fieldName = ref.slice(dotIdx + 1);
    const schema = index.schemas.get(schemaRef);
    if (schema && hasFieldWithSpreads(schema, fieldName, index)) {
      return { resolved: true, resolvedTo: { kind: "field", name: ref } };
    }
    return { resolved: false, resolvedTo: null };
  }

  if (classification === "dotted-field") {
    const dotIdx = ref.indexOf(".");
    const schemaName = ref.slice(0, dotIdx);
    const fieldName = ref.slice(dotIdx + 1);
    // First check mapping sources/targets
    const allSchemas = [...(mappingContext.sources ?? []), ...(mappingContext.targets ?? [])];
    for (const s of allSchemas) {
      const nsIdx = s.indexOf("::");
      const baseName = nsIdx !== -1 ? s.slice(nsIdx + 2) : s;
      if (baseName === schemaName || s === schemaName) {
        const schema = index.schemas.get(s);
        if (schema && hasFieldWithSpreads(schema, fieldName, index)) {
          return { resolved: true, resolvedTo: { kind: "field", name: `${s}.${fieldName}` } };
        }
      }
    }
    // Fall back to all workspace schemas (handles refs to schemas not in source/target list)
    for (const [key, schema] of index.schemas) {
      const nsIdx = key.indexOf("::");
      const baseName = nsIdx !== -1 ? key.slice(nsIdx + 2) : key;
      if (baseName === schemaName || key === schemaName) {
        if (hasFieldWithSpreads(schema, fieldName, index)) {
          return { resolved: true, resolvedTo: { kind: "field", name: `${key}.${fieldName}` } };
        }
      }
    }
    return { resolved: false, resolvedTo: null };
  }

  // Bare identifier — check fields in declared sources/targets, then schemas/transforms
  const allSchemaNames = [...(mappingContext.sources ?? []), ...(mappingContext.targets ?? [])];
  for (const s of allSchemaNames) {
    const schema = index.schemas.get(s);
    if (schema && hasFieldWithSpreads(schema, ref, index)) {
      return { resolved: true, resolvedTo: { kind: "field", name: `${s}.${ref}` } };
    }
  }

  // Try namespace-qualified lookup from mapping's namespace BEFORE global
  if (mappingContext.namespace) {
    const nsRef = `${mappingContext.namespace}::${ref}`;
    if (index.schemas.has(nsRef)) return { resolved: true, resolvedTo: { kind: "schema", name: nsRef } };
    if (index.fragments?.has(nsRef)) return { resolved: true, resolvedTo: { kind: "fragment", name: nsRef } };
    if (index.transforms?.has(nsRef)) return { resolved: true, resolvedTo: { kind: "transform", name: nsRef } };
  }

  // Check if it's a global schema, fragment, or transform name
  if (index.schemas.has(ref)) return { resolved: true, resolvedTo: { kind: "schema", name: ref } };
  if (index.fragments?.has(ref)) return { resolved: true, resolvedTo: { kind: "fragment", name: ref } };
  if (index.transforms?.has(ref)) return { resolved: true, resolvedTo: { kind: "transform", name: ref } };

  return { resolved: false, resolvedTo: null };
}

/**
 * Check if a field tree contains a field with the given name (flat or nested).
 */
function hasField(fields: FieldDecl[], name: string): boolean {
  for (const f of fields) {
    if (f.name === name) return true;
    if (f.children && hasField(f.children, name)) return true;
  }
  return false;
}

interface SchemaLike {
  fields: FieldDecl[];
  hasSpreads: boolean;
  spreads?: string[];
  namespace?: string;
}

/**
 * Check if a schema has a field, including fields contributed by fragment spreads.
 */
function hasFieldWithSpreads(schema: SchemaLike, fieldName: string, index: WorkspaceIndex): boolean {
  if (hasField(schema.fields, fieldName)) return true;
  if (!schema.hasSpreads) return false;
  const ns = schema.namespace ?? null;
  const expanded = expandEntityFields(schema, ns, index);
  return hasField(expanded, fieldName);
}

// ── CST Walking (for extractFileData integration) ───────────────────────────

/**
 * Extract NL ref data from a CST root node. Called during extractFileData()
 * while the tree is still valid.
 */
export function extractNLRefData(rootNode: SyntaxNode): Omit<NLRefData, "file">[] {
  const results: Omit<NLRefData, "file">[] = [];
  walkMappings(rootNode, null, results);
  return results;
}

function walkMappings(node: SyntaxNode, namespace: string | null, results: Omit<NLRefData, "file">[]): void {
  for (const c of node.namedChildren) {
    if (c.type === "namespace_block") {
      const nsName = c.namedChildren.find((x) => x.type === "identifier");
      walkMappings(c, nsName?.text ?? null, results);
    } else if (c.type === "mapping_block") {
      extractMappingNLRefs(c, namespace, results);
    }
  }
}

function extractMappingNLRefs(mappingNode: SyntaxNode, namespace: string | null, results: Omit<NLRefData, "file">[]): void {
  const lbl = mappingNode.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  let mappingName = inner?.text ?? null;
  if (inner?.type === "quoted_name") mappingName = mappingName!.slice(1, -1);

  const body = mappingNode.namedChildren.find((c) => c.type === "mapping_body");
  if (!body) return;

  walkArrowsForNL(body, mappingName ?? "", namespace, null, results);
}

function walkArrowsForNL(
  node: SyntaxNode,
  mappingName: string,
  namespace: string | null,
  targetField: string | null,
  results: Omit<NLRefData, "file">[],
): void {
  for (const c of node.namedChildren) {
    if (c.type === "map_arrow" || c.type === "computed_arrow" || c.type === "nested_arrow") {
      const tgtNode = c.namedChildren.find((x) => x.type === "tgt_path");
      const tgt = extractPathText(tgtNode) ?? targetField;

      const pipeChain = c.namedChildren.find((x) => x.type === "pipe_chain");
      if (pipeChain) {
        for (const step of pipeChain.namedChildren) {
          if (step.type === "pipe_step") {
            const innerNode = step.namedChildren[0];
            if (innerNode && (innerNode.type === "nl_string" || innerNode.type === "multiline_string")) {
              const text = innerNode.type === "multiline_string"
                ? innerNode.text.slice(3, -3).trim()
                : innerNode.text.slice(1, -1);
              if (text.includes("`")) {
                results.push({
                  text,
                  mapping: mappingName,
                  namespace,
                  targetField: tgt,
                  line: innerNode.startPosition.row,
                  column: innerNode.startPosition.column,
                });
              }
            }
          }
        }
      }

      walkArrowsForNL(c, mappingName, namespace, tgt, results);
    }
  }
}

function extractPathText(pathNode: SyntaxNode | undefined): string | null {
  if (!pathNode) return null;
  const inner = pathNode.namedChildren[0];
  if (!inner) return pathNode.text;
  if (inner.type === "backtick_path") return inner.text.slice(1, -1);
  return inner.text;
}

// ── High-level extraction ───────────────────────────────────────────────────

export interface ResolvedNLRef {
  ref: string;
  classification: RefClassification;
  resolved: boolean;
  resolvedTo: { kind: string; name: string } | null;
  mapping: string;
  namespace: string | null;
  targetField: string | null;
  file: string;
  line: number;
  column: number;
}

/**
 * Process pre-extracted NL ref data into fully resolved reference records.
 */
export function resolveAllNLRefs(index: WorkspaceIndex): ResolvedNLRef[] {
  const results: ResolvedNLRef[] = [];
  const nlRefData = index.nlRefData ?? [];

  for (const item of nlRefData) {
    const backtickRefs = extractBacktickRefs(item.text);
    const mappingKey = item.namespace
      ? `${item.namespace}::${item.mapping}`
      : item.mapping;
    const mapping = index.mappings.get(mappingKey);
    const mappingContext: MappingContext = {
      sources: mapping?.sources ?? [],
      targets: mapping?.targets ?? [],
      namespace: item.namespace,
    };

    for (const { ref, offset } of backtickRefs) {
      const classification = classifyRef(ref);
      const resolution = resolveRef(ref, mappingContext, index);

      results.push({
        ref,
        classification,
        resolved: resolution.resolved,
        resolvedTo: resolution.resolvedTo,
        mapping: mappingKey,
        namespace: item.namespace,
        targetField: item.targetField,
        file: item.file,
        line: item.line,
        column: item.column + 1 + offset,
      });
    }
  }

  return results;
}

/**
 * Check if a schema reference from an NL block is declared in the mapping's
 * source or target list.
 */
export function isSchemaInMappingSources(schemaRef: string, mapping: MappingRecord | undefined): boolean {
  if (!mapping) return false;
  const allRefs = [...(mapping.sources ?? []), ...(mapping.targets ?? [])];
  return allRefs.includes(schemaRef);
}
