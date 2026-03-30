/**
 * nl-ref.ts — Extract and resolve @ref references from NL strings
 *
 * Parses NL strings inside transform pipe steps for @ref references
 * (e.g., `@source_schema`, `@schema.field`, `@ns::schema.field`),
 * classifies them, and optionally resolves them against a DefinitionLookup callback.
 *
 * The DefinitionLookup abstraction decouples this module from WorkspaceIndex
 * so both the CLI and LSP can share it (ADR-006).
 */

import type { FieldDecl, SyntaxNode } from "./types.js";
import { expandEntityFields } from "./spread-expand.js";
import type { SpreadEntity, EntityRefResolver, SpreadEntityLookup } from "./spread-expand.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AtRef {
  ref: string;
  offset: number;
}

export type RefClassification =
  | "namespace-qualified-field"
  | "namespace-qualified-schema"
  | "dotted-field"
  | "bare";

export interface Resolution {
  resolved: boolean;
  resolvedTo: { kind: string; name: string } | null;
}

export interface MappingSourcesTargets {
  sources: string[];
  targets: string[];
  namespace?: string | null;
}

/**
 * Lookup abstraction for resolving NL refs against an index.
 * Implementations provide access to schemas, fragments, transforms, and mappings
 * without exposing the concrete index type.
 */
export interface DefinitionLookup {
  hasSchema(key: string): boolean;
  getSchema(key: string): SchemaLike | null | undefined;
  hasFragment(key: string): boolean;
  getFragment(key: string): SpreadEntity | null | undefined;
  hasTransform(key: string): boolean;
  getMapping(key: string): MappingSourcesTargets | null | undefined;
  /** Iterate all schema entries for workspace-wide fallback resolution. */
  iterateSchemas?(): Iterable<[string, SchemaLike]>;
  /** Expand fragment spreads for a schema. Provided by the consumer's own spread logic. */
  expandSpreads?(entity: SpreadEntity, currentNs: string | null): FieldDecl[];
}

interface SchemaLike {
  fields: FieldDecl[];
  hasSpreads: boolean;
  spreads?: string[];
  namespace?: string | null;
}

export interface NLRefDataItem {
  text: string;
  mapping: string;
  namespace: string | null;
  targetField: string | null;
  line: number;
  column: number;
  file: string;
}

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

// ── Canonical key helper ──────────────────────────────────────────────────────

/**
 * Convert an internal index key to a canonical reference string.
 * If the key already contains "::", it is returned as-is.
 * Otherwise, it is prefixed with "::" to produce the canonical form.
 */
function canonicalKey(key: string): string {
  if (key.includes("::")) return key;
  return `::${key}`;
}

// ── Extraction ────────────────────────────────────────────────────────────────

// @ref pattern: @identifier, @schema.field, @ns::schema.field, @`backtick`.field
const AT_REF_RE = /@(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*)(?:::(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*))?(?:\.(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*))*/g;

/**
 * Extract @ref mentions from a single NL string.
 */
export function extractAtRefs(text: string): AtRef[] {
  const refs: AtRef[] = [];
  let match;

  AT_REF_RE.lastIndex = 0;
  while ((match = AT_REF_RE.exec(text)) !== null) {
    const rawRef = match[0].slice(1); // remove @
    const ref = rawRef.replace(/`([^`]+)`/g, "$1");
    refs.push({ ref, offset: match.index });
  }

  return refs;
}

// ── Classification ────────────────────────────────────────────────────────────

/**
 * Classify an @ref by its syntactic form.
 */
export function classifyRef(ref: string): RefClassification {
  if (ref.includes("::")) {
    return ref.includes(".") ? "namespace-qualified-field" : "namespace-qualified-schema";
  }
  if (ref.includes(".")) return "dotted-field";
  return "bare";
}

// ── Resolution ────────────────────────────────────────────────────────────────

interface MappingContext {
  sources: string[];
  targets: string[];
  namespace: string | null;
}

function getExpandedFields(schema: SchemaLike, lookup: DefinitionLookup): FieldDecl[] {
  if (!schema.hasSpreads) return [];
  if (lookup.expandSpreads) {
    return lookup.expandSpreads(schema as SpreadEntity, schema.namespace ?? null);
  }
  // Default: use core's expandEntityFields with basic lookup
  const resolveRef: EntityRefResolver = (ref, ns) => {
    if (ref.includes("::")) return lookup.hasFragment(ref) ? ref : null;
    if (ns) {
      const nsKey = `${ns}::${ref}`;
      if (lookup.hasFragment(nsKey)) return nsKey;
    }
    if (lookup.hasFragment(ref)) return ref;
    return null;
  };
  const lookupFrag: SpreadEntityLookup = (key) => lookup.getFragment(key) ?? null;
  return expandEntityFields(schema as SpreadEntity, schema.namespace ?? null, resolveRef, lookupFrag);
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

/**
 * Check if a dotted path resolves to a nested field within a field tree.
 */
function hasNestedFieldPath(fields: FieldDecl[], path: string): boolean {
  const segments = path.split(".");
  if (matchPath(fields, segments)) return true;
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

function hasFieldWithSpreads(schema: SchemaLike, fieldName: string, lookup: DefinitionLookup): boolean {
  if (fieldName.includes(".")) {
    if (hasNestedFieldPath(schema.fields, fieldName)) return true;
    if (!schema.hasSpreads) return false;
    const expanded = getExpandedFields(schema, lookup);
    return hasNestedFieldPath([...schema.fields, ...expanded], fieldName);
  }
  if (hasField(schema.fields, fieldName)) return true;
  if (!schema.hasSpreads) return false;
  const expanded = getExpandedFields(schema, lookup);
  return hasField(expanded, fieldName);
}

/**
 * Resolve a single ref against the lookup.
 */
export function resolveRef(ref: string, mappingContext: MappingContext, lookup: DefinitionLookup): Resolution {
  const classification = classifyRef(ref);

  if (classification === "namespace-qualified-schema") {
    if (lookup.hasSchema(ref)) return { resolved: true, resolvedTo: { kind: "schema", name: canonicalKey(ref) } };
    if (lookup.hasFragment(ref)) return { resolved: true, resolvedTo: { kind: "fragment", name: canonicalKey(ref) } };
    if (lookup.hasTransform(ref)) return { resolved: true, resolvedTo: { kind: "transform", name: canonicalKey(ref) } };
    return { resolved: false, resolvedTo: null };
  }

  if (classification === "namespace-qualified-field") {
    const dotIdx = ref.indexOf(".", ref.indexOf("::") + 2);
    const schemaRef = ref.slice(0, dotIdx);
    const fieldName = ref.slice(dotIdx + 1);
    const schema = lookup.getSchema(schemaRef);
    if (schema && hasFieldWithSpreads(schema, fieldName, lookup)) {
      return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(schemaRef)}.${fieldName}` } };
    }
    return { resolved: false, resolvedTo: null };
  }

  if (classification === "dotted-field") {
    const dotIdx = ref.indexOf(".");
    const schemaName = ref.slice(0, dotIdx);
    const fieldName = ref.slice(dotIdx + 1);

    const allSchemas = [...(mappingContext.sources ?? []), ...(mappingContext.targets ?? [])];
    for (const s of allSchemas) {
      const schema = lookup.getSchema(s);
      if (schema && hasNestedFieldPath(schema.fields, ref)) {
        return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(s)}.${ref}` } };
      }
      if (schema?.hasSpreads) {
        const expanded = getExpandedFields(schema, lookup);
        if (hasNestedFieldPath([...schema.fields, ...expanded], ref)) {
          return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(s)}.${ref}` } };
        }
      }
    }

    for (const s of allSchemas) {
      const nsIdx = s.indexOf("::");
      const baseName = nsIdx !== -1 ? s.slice(nsIdx + 2) : s;
      if (baseName === schemaName || s === schemaName) {
        const schema = lookup.getSchema(s);
        if (schema && hasFieldWithSpreads(schema, fieldName, lookup)) {
          return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(s)}.${fieldName}` } };
        }
      }
    }

    // Fall back to workspace-wide search if no mapping context provides the schema
    if (lookup.iterateSchemas) {
      for (const [key, schema] of lookup.iterateSchemas()) {
        const nsIdx = key.indexOf("::");
        const baseName = nsIdx !== -1 ? key.slice(nsIdx + 2) : key;
        if (baseName === schemaName || key === schemaName) {
          if (hasFieldWithSpreads(schema, fieldName, lookup)) {
            return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(key)}.${fieldName}` } };
          }
        }
        // Also try as nested path within this schema
        if (hasNestedFieldPath(schema.fields, ref)) {
          return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(key)}.${ref}` } };
        }
      }
    }
    return { resolved: false, resolvedTo: null };
  }

  // Bare identifier
  const allSchemaNames = [...(mappingContext.sources ?? []), ...(mappingContext.targets ?? [])];
  for (const s of allSchemaNames) {
    const schema = lookup.getSchema(s);
    if (schema && hasFieldWithSpreads(schema, ref, lookup)) {
      return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(s)}.${ref}` } };
    }
  }

  // When there is no mapping context (e.g. standalone notes), fall back to
  // searching all workspace schemas for the bare field name.
  if (allSchemaNames.length === 0 && lookup.iterateSchemas) {
    for (const [key, schema] of lookup.iterateSchemas()) {
      if (hasFieldWithSpreads(schema, ref, lookup)) {
        return { resolved: true, resolvedTo: { kind: "field", name: `${canonicalKey(key)}.${ref}` } };
      }
    }
  }

  if (mappingContext.namespace) {
    const nsRef = `${mappingContext.namespace}::${ref}`;
    if (lookup.hasSchema(nsRef)) return { resolved: true, resolvedTo: { kind: "schema", name: canonicalKey(nsRef) } };
    if (lookup.hasFragment(nsRef)) return { resolved: true, resolvedTo: { kind: "fragment", name: canonicalKey(nsRef) } };
    if (lookup.hasTransform(nsRef)) return { resolved: true, resolvedTo: { kind: "transform", name: canonicalKey(nsRef) } };
  }

  if (lookup.hasSchema(ref)) return { resolved: true, resolvedTo: { kind: "schema", name: canonicalKey(ref) } };
  if (lookup.hasFragment(ref)) return { resolved: true, resolvedTo: { kind: "fragment", name: canonicalKey(ref) } };
  if (lookup.hasTransform(ref)) return { resolved: true, resolvedTo: { kind: "transform", name: canonicalKey(ref) } };

  return { resolved: false, resolvedTo: null };
}

// ── CST Walking ───────────────────────────────────────────────────────────────

export type NLRefDataItemNoFile = Omit<NLRefDataItem, "file">;

/**
 * Extract NL ref data from a CST root node. Called during file extraction
 * while the tree is still valid.
 */
export function extractNLRefData(rootNode: SyntaxNode): NLRefDataItemNoFile[] {
  const results: NLRefDataItemNoFile[] = [];
  walkMappings(rootNode, null, results);
  return results;
}

function walkMappings(node: SyntaxNode, namespace: string | null, results: NLRefDataItemNoFile[]): void {
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

function extractMappingNLRefs(mappingNode: SyntaxNode, namespace: string | null, results: NLRefDataItemNoFile[]): void {
  const lbl = mappingNode.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  let mappingName = inner?.text ?? null;
  if (inner?.type === "backtick_name") mappingName = mappingName!.slice(1, -1);
  if (!mappingName) {
    mappingName = `<anon>@:${mappingNode.startPosition.row}`;
  }

  const body = mappingNode.namedChildren.find((c) => c.type === "mapping_body");
  if (!body) return;

  walkArrowsForNL(body, mappingName, namespace, null, results);
}

function extractTransformNLRefs(transformNode: SyntaxNode, namespace: string | null, results: NLRefDataItemNoFile[]): void {
  const lbl = transformNode.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  let transformName = inner?.text ?? "";
  if (inner?.type === "backtick_name") transformName = transformName.slice(1, -1);

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
        if (text.includes("`") || /@[a-zA-Z_`]/.test(text)) {
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
  results: NLRefDataItemNoFile[],
): void {
  for (const inner of noteNode.namedChildren) {
    if (inner.type === "nl_string" || inner.type === "multiline_string") {
      const text = inner.type === "multiline_string"
        ? inner.text.slice(3, -3)
        : inner.text.slice(1, -1);
      if (text.includes("`") || /@[a-zA-Z_`]/.test(text)) {
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
  results: NLRefDataItemNoFile[],
): void {
  const lbl = blockNode.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  let blockName = inner?.text ?? "";
  if (inner?.type === "backtick_name") blockName = blockName.slice(1, -1);

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
  results: NLRefDataItemNoFile[],
): void {
  for (const c of node.namedChildren) {
    if (c.type === "note_block") {
      for (const inner of c.namedChildren) {
        if (inner.type === "nl_string" || inner.type === "multiline_string") {
          const text = inner.type === "multiline_string"
            ? inner.text.slice(3, -3)
            : inner.text.slice(1, -1);
          if (text.includes("`") || /@[a-zA-Z_`]/.test(text)) {
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
    if (c.type === "source_block") {
      const nlNodes = [
        ...c.namedChildren.filter((x) => x.type === "nl_string" || x.type === "multiline_string"),
        ...c.namedChildren
          .filter((x) => x.type === "source_ref")
          .flatMap((x) => x.namedChildren.filter((y) => y.type === "nl_string" || y.type === "multiline_string")),
      ];
      for (const nlNode of nlNodes) {
        const text = nlNode.type === "multiline_string"
          ? nlNode.text.slice(3, -3)
          : nlNode.text.slice(1, -1);
        if (text.includes("`") || /@[a-zA-Z_`]/.test(text)) {
          results.push({
            text,
            mapping: mappingName,
            namespace,
            targetField: null,
            line: nlNode.startPosition.row,
            column: nlNode.startPosition.column,
          });
        }
      }
      continue;
    }
    if (c.type === "each_block" || c.type === "flatten_block") {
      const tgtNode = c.namedChildren.find((x) => x.type === "tgt_path");
      const tgt = extractPathText(tgtNode) ?? targetField;
      walkArrowsForNL(c, mappingName, namespace, tgt, results);
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
              if (text.includes("`") || /@[a-zA-Z_`]/.test(text)) {
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

// ── High-level resolution ─────────────────────────────────────────────────────

/**
 * Process pre-extracted NL ref data into fully resolved reference records.
 *
 * @param nlRefData - Items extracted during file parsing (with file path)
 * @param lookup - Consumer-provided index accessor callbacks
 */
export function resolveAllNLRefs(
  nlRefData: NLRefDataItem[],
  lookup: DefinitionLookup,
): ResolvedNLRef[] {
  const results: ResolvedNLRef[] = [];

  for (const item of nlRefData) {
    const atRefs = extractAtRefs(item.text);
    const mappingKey = item.namespace
      ? `${item.namespace}::${item.mapping}`
      : item.mapping;
    const mapping = lookup.getMapping(mappingKey);
    const mappingContext: MappingContext = {
      sources: mapping?.sources ?? [],
      targets: mapping?.targets ?? [],
      namespace: item.namespace,
    };

    for (const { ref, offset } of atRefs) {
      const classification = classifyRef(ref);
      const resolution = resolveRef(ref, mappingContext, lookup);

      const textBefore = item.text.slice(0, offset);
      const newlines = (textBefore.match(/\n/g) ?? []).length;
      const line = item.line + newlines;
      let column: number;
      if (newlines > 0) {
        const lastNl = textBefore.lastIndexOf("\n");
        column = offset - lastNl;
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
export function isSchemaInMappingSources(schemaRef: string, mapping: MappingSourcesTargets | null | undefined): boolean {
  if (!mapping) return false;
  const allRefs = [...(mapping.sources ?? []), ...(mapping.targets ?? [])];
  return allRefs.some((r) => r === schemaRef || canonicalKey(r) === schemaRef);
}
