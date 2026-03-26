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
import { canonicalKey } from "./index-builder.js";

// ── Extraction ──────────────────────────────────────────────────────────────

const BACKTICK_RE = /`([^`]+)`/g;

// @ref pattern: @identifier, @schema.field, @ns::schema.field, @`backtick`.field
// Matches @ followed by a path of identifiers, dots, ::, and backtick segments.
const AT_REF_RE = /@(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*)(?:::(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*))?(?:\.(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*))*/g;

export interface BacktickRef {
  ref: string;
  offset: number;
}

/**
 * Extract backtick-delimited references from a single NL string.
 * Also extracts @ref mentions (preferred modern syntax).
 */
export function extractBacktickRefs(text: string): BacktickRef[] {
  const refs: BacktickRef[] = [];
  let match;

  // Extract @ref mentions (preferred)
  AT_REF_RE.lastIndex = 0;
  while ((match = AT_REF_RE.exec(text)) !== null) {
    // Strip the leading @ and any backtick delimiters from segments
    const rawRef = match[0].slice(1); // remove @
    const ref = rawRef.replace(/`([^`]+)`/g, "$1");
    refs.push({ ref, offset: match.index });
  }

  // Also extract backtick refs (backward compat, cosmetic in new code)
  BACKTICK_RE.lastIndex = 0;
  while ((match = BACKTICK_RE.exec(text)) !== null) {
    // Skip if this backtick ref overlaps with an already-found @ref
    const matchIndex = match.index;
    const alreadyFound = refs.some((r) => {
      const rEnd = r.offset + r.ref.length + 1; // +1 for @
      return matchIndex >= r.offset && matchIndex < rEnd;
    });
    if (!alreadyFound) {
      refs.push({ ref: match[1]!, offset: match.index });
    }
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
    // canonicalKey is a no-op here (ref already contains ::) but keeps the
    // contract explicit: resolvedTo.name is always in canonical form.
    if (index.schemas.has(ref)) return { resolved: true, resolvedTo: { kind: "schema", name: canonicalKey(ref) } };
    if (index.fragments?.has(ref)) return { resolved: true, resolvedTo: { kind: "fragment", name: canonicalKey(ref) } };
    if (index.transforms?.has(ref)) return { resolved: true, resolvedTo: { kind: "transform", name: canonicalKey(ref) } };
    return { resolved: false, resolvedTo: null };
  }

  if (classification === "namespace-qualified-field") {
    const dotIdx = ref.indexOf(".", ref.indexOf("::") + 2);
    const schemaRef = ref.slice(0, dotIdx);
    const fieldName = ref.slice(dotIdx + 1);
    const schema = index.schemas.get(schemaRef);
    if (schema && hasFieldWithSpreads(schema, fieldName, index)) {
      return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(schemaRef)}.${fieldName}` } };
    }
    return { resolved: false, resolvedTo: null };
  }

  if (classification === "dotted-field") {
    const dotIdx = ref.indexOf(".");
    const schemaName = ref.slice(0, dotIdx);
    const fieldName = ref.slice(dotIdx + 1);

    // First, try resolving as a nested field path within mapping source/target schemas.
    // e.g. `PID.DateOfBirth` where PID is a nested record field in source schema hl7_adt
    const allSchemas = [...(mappingContext.sources ?? []), ...(mappingContext.targets ?? [])];
    for (const s of allSchemas) {
      const schema = index.schemas.get(s);
      if (schema && hasNestedFieldPath(schema.fields, ref)) {
        return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(s)}.${ref}` } };
      }
      // Also check expanded spread fields
      if (schema?.hasSpreads) {
        const expanded = expandEntityFields(schema, schema.namespace ?? null, index);
        if (hasNestedFieldPath([...schema.fields, ...expanded], ref)) {
          return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(s)}.${ref}` } };
        }
      }
    }

    // Then try as schema.field (original behavior)
    for (const s of allSchemas) {
      const nsIdx = s.indexOf("::");
      const baseName = nsIdx !== -1 ? s.slice(nsIdx + 2) : s;
      if (baseName === schemaName || s === schemaName) {
        const schema = index.schemas.get(s);
        if (schema && hasFieldWithSpreads(schema, fieldName, index)) {
          return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(s)}.${fieldName}` } };
        }
      }
    }
    // Fall back to all workspace schemas (handles refs to schemas not in source/target list)
    for (const [key, schema] of index.schemas) {
      const nsIdx = key.indexOf("::");
      const baseName = nsIdx !== -1 ? key.slice(nsIdx + 2) : key;
      if (baseName === schemaName || key === schemaName) {
        if (hasFieldWithSpreads(schema, fieldName, index)) {
          return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(key)}.${fieldName}` } };
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
      return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(s)}.${ref}` } };
    }
  }

  // When there is no mapping context (e.g. standalone notes), fall back to
  // searching all workspace schemas for the bare field name.
  if (allSchemaNames.length === 0) {
    for (const [key, schema] of index.schemas) {
      if (hasFieldWithSpreads(schema, ref, index)) {
        return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(key)}.${ref}` } };
      }
    }
  }

  // Try namespace-qualified lookup from mapping's namespace BEFORE global
  if (mappingContext.namespace) {
    const nsRef = `${mappingContext.namespace}::${ref}`;
    if (index.schemas.has(nsRef)) return { resolved: true, resolvedTo: { kind: "schema", name: canonicalKey(nsRef) } };
    if (index.fragments?.has(nsRef)) return { resolved: true, resolvedTo: { kind: "fragment", name: canonicalKey(nsRef) } };
    if (index.transforms?.has(nsRef)) return { resolved: true, resolvedTo: { kind: "transform", name: canonicalKey(nsRef) } };
  }

  // Check if it's a global schema, fragment, or transform name
  if (index.schemas.has(ref)) return { resolved: true, resolvedTo: { kind: "schema", name: canonicalKey(ref) } };
  if (index.fragments?.has(ref)) return { resolved: true, resolvedTo: { kind: "fragment", name: canonicalKey(ref) } };
  if (index.transforms?.has(ref)) return { resolved: true, resolvedTo: { kind: "transform", name: canonicalKey(ref) } };

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
 * Check if a dotted path resolves to a nested field within a field tree.
 * Tries exact path match first (e.g. "PID.DateOfBirth" where PID is at the
 * current level), then searches recursively through nested records.
 */
function hasNestedFieldPath(fields: FieldDecl[], path: string): boolean {
  const segments = path.split(".");
  // Try exact path match from the current level
  if (matchPath(fields, segments)) return true;
  // Try starting from any nested record level
  return searchNestedPath(fields, segments);
}

function matchPath(fields: FieldDecl[], segments: string[]): boolean {
  let current = fields;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const field = current.find((f) => f.name === seg);
    if (!field) return false;
    if (i < segments.length - 1) {
      if (!field.children || field.children.length === 0) return false;
      current = field.children;
    }
  }
  return true;
}

function searchNestedPath(fields: FieldDecl[], segments: string[]): boolean {
  for (const f of fields) {
    if (f.children) {
      if (matchPath(f.children, segments)) return true;
      if (searchNestedPath(f.children, segments)) return true;
    }
  }
  return false;
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
    } else if (c.type === "transform_block") {
      extractTransformNLRefs(c, namespace, results);
    } else if (c.type === "note_block") {
      extractStandaloneNoteRefs(c, namespace, null, results);
    } else if (c.type === "schema_block" || c.type === "metric_block" || c.type === "fragment_block") {
      extractBlockNoteRefs(c, namespace, results);
    }
  }
}

function extractMappingNLRefs(mappingNode: SyntaxNode, namespace: string | null, results: Omit<NLRefData, "file">[]): void {
  const lbl = mappingNode.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  let mappingName = inner?.text ?? null;
  if (inner?.type === "quoted_name") mappingName = mappingName!.slice(1, -1);

  // For anonymous mappings, use row-based key that will match <anon>@file:row
  // The file portion will be filled in later by index-builder
  if (!mappingName) {
    mappingName = `<anon>@:${mappingNode.startPosition.row}`;
  }

  const body = mappingNode.namedChildren.find((c) => c.type === "mapping_body");
  if (!body) return;

  walkArrowsForNL(body, mappingName, namespace, null, results);
}

function extractTransformNLRefs(transformNode: SyntaxNode, namespace: string | null, results: Omit<NLRefData, "file">[]): void {
  const lbl = transformNode.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  let transformName = inner?.text ?? "";
  if (inner?.type === "quoted_name") transformName = transformName.slice(1, -1);

  const pipeChain = transformNode.namedChildren.find((c) => c.type === "pipe_chain");
  if (!pipeChain) return;

  for (const step of pipeChain.namedChildren) {
    if (step.type === "pipe_step") {
      const innerNode = step.namedChildren[0];
      const nlNodes = innerNode?.type === "pipe_text"
        ? innerNode.namedChildren.filter((k) => k.type === "nl_string" || k.type === "multiline_string")
        : [];
      for (const nlNode of nlNodes) {
        const text = nlNode.type === "multiline_string"
          ? nlNode.text.slice(3, -3)
          : nlNode.text.slice(1, -1);
        if (text.includes("`")) {
          results.push({
            text,
            mapping: `transform:${transformName}`,
            namespace,
            targetField: null,
            line: nlNode.startPosition.row,
            column: nlNode.startPosition.column,
          });
        }
      }
    }
  }
}

function extractStandaloneNoteRefs(
  noteNode: SyntaxNode,
  namespace: string | null,
  parentLabel: string | null,
  results: Omit<NLRefData, "file">[],
): void {
  for (const inner of noteNode.namedChildren) {
    if (inner.type === "nl_string" || inner.type === "multiline_string") {
      const text = inner.type === "multiline_string"
        ? inner.text.slice(3, -3)
        : inner.text.slice(1, -1);
      if (text.includes("`")) {
        results.push({
          text,
          mapping: parentLabel ? `note:${parentLabel}` : "note:",
          namespace,
          targetField: null,
          line: inner.startPosition.row,
          column: inner.startPosition.column,
        });
      }
    }
  }
}

function extractBlockNoteRefs(
  blockNode: SyntaxNode,
  namespace: string | null,
  results: Omit<NLRefData, "file">[],
): void {
  const lbl = blockNode.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  let blockName = inner?.text ?? "";
  if (inner?.type === "quoted_name") blockName = blockName.slice(1, -1);

  // extractStandaloneNoteRefs prepends "note:" to the parentLabel, so we just pass
  // a type-prefixed block name so downstream can distinguish metric vs mapping notes.
  // Result: "note:metric:monthly_revenue" for metrics, "note:schema:foo" for schemas.
  const blockTypePrefix = blockNode.type === "metric_block" ? "metric:"
    : blockNode.type === "schema_block" ? "schema:"
    : blockNode.type === "fragment_block" ? "fragment:"
    : "";
  const parentLabel = `${blockTypePrefix}${blockName}`;

  const bodyTypes = ["schema_body", "metric_body"];
  for (const child of blockNode.namedChildren) {
    if (child.type === "note_block") {
      extractStandaloneNoteRefs(child, namespace, parentLabel, results);
    } else if (bodyTypes.includes(child.type)) {
      for (const bodyChild of child.namedChildren) {
        if (bodyChild.type === "note_block") {
          extractStandaloneNoteRefs(bodyChild, namespace, parentLabel, results);
        }
      }
    }
  }
}

function walkArrowsForNL(
  node: SyntaxNode,
  mappingName: string,
  namespace: string | null,
  targetField: string | null,
  results: Omit<NLRefData, "file">[],
): void {
  for (const c of node.namedChildren) {
    if (c.type === "note_block") {
      for (const inner of c.namedChildren) {
        if (inner.type === "nl_string" || inner.type === "multiline_string") {
          const text = inner.type === "multiline_string"
            ? inner.text.slice(3, -3)
            : inner.text.slice(1, -1);
          if (text.includes("`")) {
            results.push({
              text,
              mapping: mappingName,
              namespace,
              targetField: null,
              line: inner.startPosition.row,
              column: inner.startPosition.column,
            });
          }
        }
      }
      continue;
    }
    if (c.type === "map_arrow" || c.type === "computed_arrow" || c.type === "nested_arrow") {
      const tgtNode = c.namedChildren.find((x) => x.type === "tgt_path");
      const tgt = extractPathText(tgtNode) ?? targetField;

      const pipeChain = c.namedChildren.find((x) => x.type === "pipe_chain");
      if (pipeChain) {
        for (const step of pipeChain.namedChildren) {
          if (step.type === "pipe_step") {
            const innerNode = step.namedChildren[0];
            const nlNodes2 = innerNode?.type === "pipe_text"
              ? innerNode.namedChildren.filter((k) => k.type === "nl_string" || k.type === "multiline_string")
              : [];
            for (const nlNode of nlNodes2) {
              const text = nlNode.type === "multiline_string"
                ? nlNode.text.slice(3, -3)
                : nlNode.text.slice(1, -1);
              if (text.includes("`")) {
                results.push({
                  text,
                  mapping: mappingName,
                  namespace,
                  targetField: tgt,
                  line: nlNode.startPosition.row,
                  column: nlNode.startPosition.column,
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

      // Compute actual line/column for refs in multiline strings
      const textBefore = item.text.slice(0, offset);
      const newlines = (textBefore.match(/\n/g) ?? []).length;
      const line = item.line + newlines;
      let column: number;
      if (newlines > 0) {
        const lastNl = textBefore.lastIndexOf("\n");
        column = offset - lastNl; // 1-based column from start of line
      } else {
        column = item.column + 1 + offset;
      }

      results.push({
        ref,
        classification,
        resolved: resolution.resolved,
        resolvedTo: resolution.resolvedTo,
        mapping: mappingKey,
        namespace: item.namespace,
        targetField: item.targetField,
        file: item.file,
        line,
        column,
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
  // Compare using canonical forms since schemaRef may be canonical (::name)
  // while mapping sources/targets are internal keys (bare name)
  return allRefs.some((r) => r === schemaRef || canonicalKey(r) === schemaRef);
}
