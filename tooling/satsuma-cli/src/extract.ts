/**
 * extract.ts — CST extraction functions for Satsuma files
 *
 * Each function accepts a tree-sitter root node and returns structured data
 * extracted from the concrete syntax tree. Functions are pure (no I/O) so
 * they can be tested against mock CST objects.
 */

import { classifyTransform, classifyArrow } from "./classify.js";
import { extractMetadata } from "./meta-extract.js";
import type { Classification, FieldDecl, PipeStep, SyntaxNode } from "./types.js";

// ── CST helpers ──────────────────────────────────────────────────────────────

/** First named child of the given type, or null. */
function child(node: SyntaxNode, type: string): SyntaxNode | null {
  return node.namedChildren.find((c) => c.type === type) ?? null;
}

/** All named children of the given type. */
function children(node: SyntaxNode, type: string): SyntaxNode[] {
  return node.namedChildren.filter((c) => c.type === type);
}

/** Collect all descendants of a given type (depth-first). */
function allDescendants(node: SyntaxNode, type: string, acc: SyntaxNode[] = []): SyntaxNode[] {
  for (const c of node.namedChildren) {
    if (c.type === type) acc.push(c);
    allDescendants(c, type, acc);
  }
  return acc;
}

/**
 * Extract text from a block_label child of `node`.
 * block_label → identifier | quoted_name
 */
function labelText(node: SyntaxNode): string | null {
  const lbl = child(node, "block_label");
  if (!lbl) return null;
  const inner = lbl.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "quoted_name") return inner.text.slice(1, -1);
  return inner.text; // identifier
}

/** Strip outer delimiters from a string node. */
function stringText(node: SyntaxNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "multiline_string") return node.text.slice(3, -3).trim();
  if (node.type === "nl_string") return node.text.slice(1, -1);
  return node.text;
}

/**
 * Extract the text from a source/target entry node.
 * _source_entry → backtick_name | identifier | nl_string
 */
function entryText(node: SyntaxNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "backtick_name") return node.text.slice(1, -1);
  if (node.type === "nl_string") return node.text.slice(1, -1);
  return node.text; // identifier
}

/**
 * Extract direct field_decl children of a body node.
 */
function extractDirectFields(bodyNode: SyntaxNode): FieldDecl[] {
  return children(bodyNode, "field_decl").map((fd) => {
    const nameNode = child(fd, "field_name");
    const typeNode = child(fd, "type_expr");
    const inner = nameNode?.namedChildren[0];
    let name = inner?.text ?? "";
    if (inner?.type === "backtick_name") name = name.slice(1, -1);
    const meta = extractMetadata(child(fd, "metadata_block"));
    const decl: FieldDecl = { name, type: typeNode?.text ?? "" };
    if (meta.length > 0) decl.metadata = meta;
    return decl;
  });
}

interface FieldTree {
  fields: FieldDecl[];
  hasSpreads: boolean;
  spreads: string[];
}

/**
 * Check whether a field_decl contains a "list_of" keyword token.
 * In the unified syntax, "list_of" is an anonymous child node.
 * Falls back to text matching if the `children` array is not available
 * (e.g., in mock CST objects used by tests).
 */
function hasListOfKeyword(fd: SyntaxNode): boolean {
  if (fd.children) {
    for (const c of fd.children) {
      if (!c.isNamed && c.text === "list_of") return true;
    }
    return false;
  }
  // Fallback: check if the field_decl text contains "list_of" after the field name
  const nameNode = child(fd, "field_name");
  const nameEnd = nameNode ? nameNode.text.length : 0;
  return fd.text.slice(nameEnd).trimStart().startsWith("list_of");
}

/**
 * Extract the full field tree from a schema_body node.
 *
 * In unified field syntax, all declarations are field_decl nodes:
 * - scalar field: field_name type_expr metadata?
 * - record field: field_name "record" metadata? { schema_body }
 * - list_of record: field_name "list_of" "record" metadata? { schema_body }
 * - list_of scalar: field_name "list_of" type_expr metadata?
 *
 * Record/list_of record fields have a schema_body child.
 */
function extractFieldTree(bodyNode: SyntaxNode): FieldTree {
  const fields: FieldDecl[] = [];
  let hasSpreads = false;
  const spreads: string[] = [];

  for (const c of bodyNode.namedChildren) {
    if (c.type === "field_decl") {
      const nameNode = child(c, "field_name");
      const typeNode = child(c, "type_expr");
      const innerBody = child(c, "schema_body");
      const inner = nameNode?.namedChildren[0];
      let name = inner?.text ?? "";
      if (inner?.type === "backtick_name") name = name.slice(1, -1);
      const meta = extractMetadata(child(c, "metadata_block"));

      if (innerBody) {
        // Nested structure: record or list_of record
        const isList = hasListOfKeyword(c);
        const nested = extractFieldTree(innerBody);
        const decl: FieldDecl = {
          name,
          type: isList ? "list" : "record",
          isList,
          children: nested.fields,
        };
        if (meta.length > 0) decl.metadata = meta;
        fields.push(decl);
        if (nested.hasSpreads) hasSpreads = true;
        spreads.push(...nested.spreads);
      } else {
        // Scalar field or list_of scalar
        const isList = hasListOfKeyword(c);
        const decl: FieldDecl = { name, type: typeNode?.text ?? "" };
        if (isList) decl.isList = true;
        if (meta.length > 0) decl.metadata = meta;
        fields.push(decl);
      }
    } else if (c.type === "fragment_spread") {
      hasSpreads = true;
      const label = child(c, "spread_label");
      if (label) {
        spreads.push(spreadLabelText(label));
      }
    }
  }

  return { fields, hasSpreads, spreads };
}

/**
 * Extract the text from a spread_label node.
 * spread_label → qualified_name | quoted_name | _spread_words (identifier+)
 */
function spreadLabelText(labelNode: SyntaxNode): string {
  const qn = child(labelNode, "qualified_name");
  if (qn) return qualifiedNameText(qn)!;
  const q = child(labelNode, "quoted_name");
  if (q) return q.text.slice(1, -1);
  // Multi-word or single-word: join all identifiers with spaces
  const ids = children(labelNode, "identifier");
  return ids.map((id) => id.text).join(" ");
}

/**
 * Extract the text from a qualified_name node (ns::identifier).
 * Returns "ns::name" string.
 */
function qualifiedNameText(node: SyntaxNode | null): string | null {
  if (!node || node.type !== "qualified_name") return null;
  const ids = children(node, "identifier");
  if (ids.length < 2) return null;
  return `${ids[0]!.text}::${ids[1]!.text}`;
}

/**
 * Extract a source_ref name, handling qualified_name (ns::name) in addition
 * to backtick_name, identifier, and nl_string.
 */
function sourceRefNameNs(node: SyntaxNode | null | undefined): string | null {
  if (!node) return null;
  // Handle ERROR nodes from error-recovery (e.g., multi-target blocks)
  if (node.type === "ERROR") {
    for (const c of node.namedChildren) {
      const result = sourceRefNameNs(c);
      if (result) return result;
    }
    return null;
  }
  if (node.type !== "source_ref") return entryText(node);
  for (const c of node.namedChildren) {
    if (c.type === "qualified_name") return qualifiedNameText(c);
    if (c.type === "backtick_name") return c.text.slice(1, -1);
    if (c.type === "identifier") return c.text;
  }
  return null;
}

interface NamespaceCollected {
  node: SyntaxNode;
  namespace: string | null;
}

/**
 * Collect nodes of a given type from both top-level and inside namespace blocks.
 */
function collectFromNamespaces(rootNode: SyntaxNode, nodeType: string): NamespaceCollected[] {
  const results: NamespaceCollected[] = [];
  for (const c of rootNode.namedChildren) {
    if (c.type === nodeType) {
      results.push({ node: c, namespace: null });
    } else if (c.type === "namespace_block") {
      const nsName = c.namedChildren.find((x) => x.type === "identifier");
      const ns = nsName?.text ?? null;
      for (const inner of c.namedChildren) {
        if (inner.type === nodeType) {
          results.push({ node: inner, namespace: ns });
        }
      }
    }
  }
  return results;
}

// ── Public extract functions ──────────────────────────────────────────────────

export interface NamespaceInfo {
  name: string | null;
  note: string | null;
  row: number;
}

/**
 * Extract namespace block metadata.
 */
export function extractNamespaces(rootNode: SyntaxNode): NamespaceInfo[] {
  return children(rootNode, "namespace_block").map((node) => {
    const nameNode = node.namedChildren.find((c) => c.type === "identifier");
    const name = nameNode?.text ?? null;
    const meta = child(node, "metadata_block");
    const noteTag = meta ? child(meta, "note_tag") : null;
    const noteStr = noteTag
      ? stringText(noteTag.namedChildren.find((c) => c.type === "nl_string" || c.type === "multiline_string"))
      : null;
    return { name, note: noteStr, row: node.startPosition.row };
  });
}

interface ExtractedSchema {
  name: string | null;
  namespace: string | null;
  note: string | null;
  fields: FieldDecl[];
  hasSpreads: boolean;
  spreads: string[];
  row: number;
  blockMetadata?: import("./meta-extract.js").MetaEntry[];
}

/**
 * Extract all schema_block definitions from the CST.
 */
export function extractSchemas(rootNode: SyntaxNode): ExtractedSchema[] {
  return collectFromNamespaces(rootNode, "schema_block").map(({ node, namespace }) => {
    const name = labelText(node);
    const meta = child(node, "metadata_block");
    const noteTag = meta ? child(meta, "note_tag") : null;
    const noteStr = noteTag
      ? stringText(noteTag.namedChildren.find((c) => c.type === "nl_string" || c.type === "multiline_string"))
      : null;
    const body = child(node, "schema_body");
    const fieldTree = body ? extractFieldTree(body) : { fields: [], hasSpreads: false, spreads: [] };
    const blockMeta = meta ? extractMetadata(meta) : [];
    const result: ExtractedSchema = {
      name,
      namespace,
      note: noteStr,
      fields: fieldTree.fields,
      hasSpreads: fieldTree.hasSpreads,
      spreads: fieldTree.spreads,
      row: node.startPosition.row,
    };
    if (blockMeta.length > 0) result.blockMetadata = blockMeta;
    return result;
  });
}

interface ExtractedMetric {
  name: string | null;
  namespace: string | null;
  displayName: string | null;
  sources: string[];
  grain: string | null;
  slices: string[];
  fields: FieldDecl[];
  row: number;
}

/**
 * Extract all metric_block definitions.
 */
export function extractMetrics(rootNode: SyntaxNode): ExtractedMetric[] {
  return collectFromNamespaces(rootNode, "metric_block").map(({ node, namespace }) => {
    const name = labelText(node);
    // Optional display name: nl_string directly inside metric_block (not inside metadata)
    const displayNameNode = node.namedChildren.find(
      (c) => (c.type === "nl_string" || c.type === "multiline_string") &&
        node.namedChildren.indexOf(c) < node.namedChildren.findIndex((x) => x.type === "metadata_block"),
    );
    const displayName = displayNameNode ? stringText(displayNameNode) : null;

    const meta = child(node, "metadata_block");
    const sources: string[] = [];
    let grain: string | null = null;
    const slices: string[] = [];
    if (meta) {
      for (const entry of meta.namedChildren) {
        if (entry.type === "key_value_pair") {
          const key = child(entry, "kv_key");
          const val = entry.namedChildren.find((c) => c.type !== "kv_key");
          if (key?.text === "source") {
            if (!val) continue;
            if (val.type === "kv_braced_list") {
              for (const item of val.namedChildren) {
                if (item.type === "qualified_name") {
                  sources.push(qualifiedNameText(item)!);
                } else if (item.type === "identifier") {
                  sources.push(item.text);
                }
              }
            } else if (val.type === "qualified_name") {
              sources.push(qualifiedNameText(val)!);
            } else {
              sources.push(entryText(val)!);
            }
          } else if (key?.text === "grain") {
            if (val) grain = entryText(val);
          }
        } else if (entry.type === "slice_body") {
          for (const item of entry.namedChildren) {
            if (item.type === "identifier") slices.push(item.text);
          }
        }
      }
    }

    const body = child(node, "metric_body");
    const fields = body ? extractDirectFields(body) : [];
    return { name, namespace, displayName, sources, grain, slices, fields, row: node.startPosition.row };
  });
}

interface ExtractedMapping {
  name: string | null;
  namespace: string | null;
  sources: string[];
  targets: string[];
  arrowCount: number;
  row: number;
}

/**
 * Extract all mapping_block definitions.
 */
export function extractMappings(rootNode: SyntaxNode): ExtractedMapping[] {
  return collectFromNamespaces(rootNode, "mapping_block").map(({ node, namespace }) => {
    const name = labelText(node);
    const body = child(node, "mapping_body");
    const sources: string[] = [];
    const targets: string[] = [];
    let arrowCount = 0;

    if (body) {
      const srcBlock = child(body, "source_block");
      const tgtBlock = child(body, "target_block");

      if (srcBlock) {
        for (const c of srcBlock.namedChildren) {
          const t = sourceRefNameNs(c);
          if (t) sources.push(t);
        }
      }
      if (tgtBlock) {
        for (const c of tgtBlock.namedChildren) {
          const t = sourceRefNameNs(c);
          if (t) targets.push(t);
        }
      }

      arrowCount =
        allDescendants(body, "map_arrow").length +
        allDescendants(body, "computed_arrow").length +
        allDescendants(body, "nested_arrow").length +
        allDescendants(body, "each_block").length +
        allDescendants(body, "flatten_block").length;
    }

    // Qualify unqualified targets with their enclosing namespace
    const qualifiedTargets = targets.map((t) =>
      namespace && !t.includes("::") ? `${namespace}::${t}` : t,
    );

    return { name, namespace, sources, targets: qualifiedTargets, arrowCount, row: node.startPosition.row };
  });
}

interface ExtractedFragment {
  name: string | null;
  namespace: string | null;
  fields: FieldDecl[];
  hasSpreads: boolean;
  spreads: string[];
  row: number;
}

/**
 * Extract all fragment_block definitions.
 */
export function extractFragments(rootNode: SyntaxNode): ExtractedFragment[] {
  return collectFromNamespaces(rootNode, "fragment_block").map(({ node, namespace }) => {
    const name = labelText(node);
    const body = child(node, "schema_body");
    const fieldTree = body ? extractFieldTree(body) : { fields: [], hasSpreads: false, spreads: [] };
    return {
      name,
      namespace,
      fields: fieldTree.fields,
      hasSpreads: fieldTree.hasSpreads,
      spreads: fieldTree.spreads,
      row: node.startPosition.row,
    };
  });
}

interface ExtractedTransform {
  name: string | null;
  namespace: string | null;
  row: number;
}

/**
 * Extract all transform_block definitions.
 */
export function extractTransforms(rootNode: SyntaxNode): ExtractedTransform[] {
  return collectFromNamespaces(rootNode, "transform_block").map(({ node, namespace }) => ({
    name: labelText(node),
    namespace,
    row: node.startPosition.row,
  }));
}

const BLOCK_TYPES = new Set([
  "schema_block", "mapping_block", "metric_block",
  "fragment_block", "transform_block",
]);

function findParentBlock(node: SyntaxNode): { name: string | null; blockType: string | null } {
  let current = node.parent;
  while (current) {
    if (BLOCK_TYPES.has(current.type)) {
      const label = child(current, "block_label");
      const name = label ? labelText(current) : null;
      const blockType = current.type.replace(/_block$/, "");
      return { name, blockType };
    }
    current = current.parent;
  }
  return { name: null, blockType: null };
}

export interface ExtractedNote {
  text: string;
  row: number;
  parent: string | null;
  namespace: string | null;
}

/**
 * Extract all note_block nodes from the CST.
 */
export function extractNotes(rootNode: SyntaxNode): ExtractedNote[] {
  const results: ExtractedNote[] = [];

  function walkForNotes(node: SyntaxNode, namespace: string | null): void {
    for (const c of node.namedChildren) {
      if (c.type === "namespace_block") {
        const nsName = child(c, "identifier");
        walkForNotes(c, nsName?.text ?? null);
        continue;
      }
      if (c.type === "note_block") {
        // Top-level note
        results.push({
          text: extractNoteText(c),
          row: c.startPosition.row,
          parent: null,
          namespace,
        });
      } else if (
        c.type === "schema_block" ||
        c.type === "metric_block" ||
        c.type === "fragment_block"
      ) {
        const parentName = labelText(c);
        collectNotesInBlock(c, parentName, namespace, results);
      }
    }
  }

  walkForNotes(rootNode, null);
  return results;
}

function collectNotesInBlock(
  blockNode: SyntaxNode,
  parentName: string | null,
  namespace: string | null,
  results: ExtractedNote[],
): void {
  for (const c of blockNode.namedChildren) {
    if (c.type === "note_block") {
      results.push({
        text: extractNoteText(c),
        row: c.startPosition.row,
        parent: parentName,
        namespace,
      });
    }
    // Also search in body nodes
    if (c.type === "schema_body" || c.type === "metric_body") {
      for (const inner of c.namedChildren) {
        if (inner.type === "note_block") {
          results.push({
            text: extractNoteText(inner),
            row: inner.startPosition.row,
            parent: parentName,
            namespace,
          });
        }
      }
    }
  }
}

function extractNoteText(noteNode: SyntaxNode): string {
  const parts: string[] = [];
  for (const c of noteNode.namedChildren) {
    if (c.type === "nl_string") {
      parts.push(c.text.slice(1, -1));
    } else if (c.type === "multiline_string") {
      parts.push(c.text.slice(3, -3).trim());
    }
  }
  return parts.join("\n");
}

interface ExtractedWarning {
  text: string;
  row: number;
  parent: string | null;
  parentType: string | null;
}

/**
 * Extract all warning comments (//! ...).
 */
export function extractWarnings(rootNode: SyntaxNode): ExtractedWarning[] {
  return allDescendants(rootNode, "warning_comment").map((node) => {
    const { name, blockType } = findParentBlock(node);
    return {
      text: node.text.replace(/^\/\/!\s*/, ""),
      row: node.startPosition.row,
      parent: name,
      parentType: blockType,
    };
  });
}

interface ExtractedQuestion {
  text: string;
  row: number;
  parent: string | null;
  parentType: string | null;
}

/**
 * Extract all question comments (//? ...).
 */
export function extractQuestions(rootNode: SyntaxNode): ExtractedQuestion[] {
  return allDescendants(rootNode, "question_comment").map((node) => {
    const { name, blockType } = findParentBlock(node);
    return {
      text: node.text.replace(/^\/\/\?\s*/, ""),
      row: node.startPosition.row,
      parent: name,
      parentType: blockType,
    };
  });
}

export interface ExtractedImport {
  names: string[];
  path: string | null;
  row: number;
}

/**
 * Extract all import_decl nodes from the CST.
 */
export function extractImports(rootNode: SyntaxNode): ExtractedImport[] {
  return children(rootNode, "import_decl").map((node) => {
    const names = children(node, "import_name")
      .map((nm) => {
        const qn = child(nm, "qualified_name");
        if (qn) return qualifiedNameText(qn);
        const q = child(nm, "quoted_name");
        if (q) return q.text.slice(1, -1);
        const id = child(nm, "identifier");
        return id?.text ?? null;
      })
      .filter((n): n is string => n != null);

    const pathNode = child(node, "import_path");
    const pathStr = pathNode
      ? stringText(pathNode.namedChildren[0])
      : null;

    return { names, path: pathStr, row: node.startPosition.row };
  });
}

// ── Arrow-level extraction ──────────────────────────────────────────────────

/**
 * Extract the text of a src_path or tgt_path node.
 */
function pathText(pathNode: SyntaxNode | null): string | null {
  if (!pathNode) return null;
  const inner = pathNode.namedChildren[0];
  if (!inner) return pathNode.text;
  if (inner.type === "backtick_path") return inner.text.slice(1, -1);
  return inner.text;
}

/**
 * Decompose pipe_step nodes into structured step records.
 */
function decomposePipeSteps(steps: SyntaxNode[]): PipeStep[] {
  return steps.map((step) => {
    const inner = step.namedChildren[0];
    return {
      type: inner?.type ?? "unknown",
      text: inner?.text ?? step.text,
    };
  });
}

interface ExtractedArrow {
  mapping: string | null;
  namespace: string | null;
  source: string | null;
  target: string | null;
  transform_raw: string;
  steps: PipeStep[];
  classification: Classification;
  derived: boolean;
  line: number;
  metadata?: import("./meta-extract.js").MetaEntry[];
}

/**
 * Extract detailed arrow records from all mapping blocks in the CST.
 */
export function extractArrowRecords(rootNode: SyntaxNode): ExtractedArrow[] {
  const records: ExtractedArrow[] = [];

  for (const { node: mappingNode, namespace } of collectFromNamespaces(rootNode, "mapping_block")) {
    const mappingName = labelText(mappingNode);
    const body = child(mappingNode, "mapping_body");
    if (!body) continue;

    // Collect only direct (non-nested) arrows from the mapping body
    const directArrows = body.namedChildren.filter(
      (c) => c.type === "map_arrow" || c.type === "computed_arrow",
    );
    const nestedArrows = body.namedChildren.filter(
      (c) => c.type === "nested_arrow",
    );
    const eachBlocks = body.namedChildren.filter(
      (c) => c.type === "each_block",
    );
    const flattenBlocks = body.namedChildren.filter(
      (c) => c.type === "flatten_block",
    );

    for (const arrow of directArrows) {
      records.push(extractSingleArrow(arrow, mappingName, namespace, null, null));
    }

    // For nested_arrow blocks, extract the parent arrow and child arrows with parent prefix
    for (const nested of nestedArrows) {
      const parentSrc = pathText(child(nested, "src_path"));
      const parentTgt = pathText(child(nested, "tgt_path"));

      // Emit the parent (container) arrow
      records.push(extractSingleArrow(nested, mappingName, namespace, null, null));

      // Emit child arrows with parent path prefix
      for (const childArrow of nested.namedChildren) {
        if (childArrow.type === "map_arrow" || childArrow.type === "computed_arrow") {
          records.push(extractSingleArrow(childArrow, mappingName, namespace, parentSrc, parentTgt));
        }
      }
    }

    // For each_block and flatten_block, treat like nested arrows with parent prefix
    for (const block of [...eachBlocks, ...flattenBlocks]) {
      const parentSrc = pathText(child(block, "src_path"));
      const parentTgt = pathText(child(block, "tgt_path"));

      // Emit the container arrow for the each/flatten block itself
      records.push(extractSingleArrow(block, mappingName, namespace, null, null));

      // Emit child arrows with parent path prefix
      for (const childArrow of block.namedChildren) {
        if (childArrow.type === "map_arrow" || childArrow.type === "computed_arrow" || childArrow.type === "nested_arrow") {
          records.push(extractSingleArrow(childArrow, mappingName, namespace, parentSrc, parentTgt));
        }
      }
    }
  }

  return records;
}

/**
 * Extract a single arrow record, optionally prefixing source/target with parent paths.
 */
function extractSingleArrow(
  arrow: SyntaxNode,
  mappingName: string | null,
  namespace: string | null,
  parentSrc: string | null,
  parentTgt: string | null,
): ExtractedArrow {
  const srcNode = child(arrow, "src_path");
  const tgtNode = child(arrow, "tgt_path");
  const pipeChain = child(arrow, "pipe_chain");
  const pipeSteps = pipeChain ? children(pipeChain, "pipe_step") : [];

  let source = cleanPathText(pathText(srcNode));
  let target = cleanPathText(pathText(tgtNode));
  const classification = classifyTransform(pipeSteps);
  const derived = classifyArrow(arrow);
  const steps = decomposePipeSteps(pipeSteps);

  // Prefix with parent path for nested child arrows
  if (parentSrc && source) {
    const cleanSrc = source.replace(/^\./, "");
    source = `${parentSrc}.${cleanSrc}`;
  }
  if (parentTgt && target) {
    const cleanTgt = target.replace(/^\./, "");
    target = `${parentTgt}.${cleanTgt}`;
  }

  const transformRaw = pipeSteps.length > 0
    ? pipeSteps.map((s) => s.namedChildren[0]?.text ?? s.text).join(" | ")
    : "";

  // Extract arrow-level metadata if present
  const metaNode = child(arrow, "metadata_block");
  const metadata = metaNode ? extractMetadata(metaNode) : undefined;

  const record: ExtractedArrow = {
    mapping: mappingName,
    namespace,
    source,
    target,
    transform_raw: transformRaw,
    steps,
    classification,
    derived,
    line: arrow.startPosition.row,
  };

  if (metadata && metadata.length > 0) {
    record.metadata = metadata;
  }

  return record;
}

/**
 * Clean path text: defensive newline stripping.  The grammar now uses
 * token.immediate(".") so paths should never span lines, but we keep
 * this as a safety net for malformed input or error-recovery parses.
 */
function cleanPathText(text: string | null): string | null {
  if (!text) return null;
  const nlIdx = text.indexOf("\n");
  if (nlIdx !== -1) {
    text = text.slice(0, nlIdx).trim();
  }
  return text;
}
