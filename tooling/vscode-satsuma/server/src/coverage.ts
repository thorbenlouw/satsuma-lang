/**
 * Mapping coverage computation.
 *
 * Computes per-field covered/uncovered status for every source and target
 * schema referenced in a named mapping block.  The result is consumed by
 * the VS Code coverage command to apply gutter decorations.
 *
 * "Covered" means:
 *   - source field: its name (or a path that starts with it) appears as a
 *     src_path in at least one arrow, each_block, or flatten_block inside the
 *     mapping.
 *   - target field: its name (or a path that starts with it) appears as a
 *     tgt_path in at least one arrow inside the mapping.
 *
 * Nested record fields are handled recursively.  each_block and flatten_block
 * src-paths contribute both the top-level field and the qualified nested path.
 *
 * Types (FieldCoverageEntry, SchemaCoverageResult, MappingCoverageResult) and
 * the addPathAndPrefixes path utility live in @satsuma/core so the CLI can
 * share the same definitions without depending on the LSP server.
 */

import type { SyntaxNode, Tree } from "./parser-utils";
import { child, children, labelText } from "./parser-utils";
import type { FieldInfo, WorkspaceIndex } from "./workspace-index";
import { resolveDefinition } from "./workspace-index";
import { addPathAndPrefixes } from "@satsuma/core";

// Re-export shared types from core so existing LSP code that imports from
// this module continues to work without import path changes.
export type {
  FieldCoverageEntry,
  SchemaCoverageResult,
  MappingCoverageResult,
} from "@satsuma/core";

import type { FieldCoverageEntry, SchemaCoverageResult, MappingCoverageResult } from "@satsuma/core";

// ---------- Entry point ----------

export function computeMappingCoverage(
  _uri: string,
  tree: Tree,
  mappingName: string,
  wsIndex: WorkspaceIndex,
): MappingCoverageResult {
  const mappingNode = findMappingBlock(tree, mappingName);
  if (!mappingNode) return { schemas: [] };

  const body = child(mappingNode, "mapping_body");
  if (!body) return { schemas: [] };

  const sourceIds = getSchemaIdsFromBlock(body, "source_block");
  const targetIds = getSchemaIdsFromBlock(body, "target_block");

  // Collect all explicit arrow source paths and target paths from the mapping.
  const coveredSrcPaths = new Set<string>();
  const coveredTgtPaths = new Set<string>();
  collectBodyPaths(body, coveredSrcPaths, coveredTgtPaths);

  const schemas: SchemaCoverageResult[] = [];

  for (const schemaId of sourceIds) {
    const def = resolveSchema(wsIndex, schemaId);
    if (!def) continue;
    schemas.push({
      schemaId,
      role: "source",
      fields: buildFieldCoverage(def.fields, def.uri, "", coveredSrcPaths),
    });
  }

  for (const schemaId of targetIds) {
    const def = resolveSchema(wsIndex, schemaId);
    if (!def) continue;
    schemas.push({
      schemaId,
      role: "target",
      fields: buildFieldCoverage(def.fields, def.uri, "", coveredTgtPaths),
    });
  }

  return { schemas };
}

// ---------- Path collection ----------

/**
 * Walk all arrows (including inside each/flatten) in the mapping body and
 * populate the covered src-path and tgt-path sets.
 */
function collectBodyPaths(
  body: SyntaxNode,
  srcPaths: Set<string>,
  tgtPaths: Set<string>,
): void {
  for (const node of body.namedChildren) {
    switch (node.type) {
      case "map_arrow":
        for (const sp of children(node, "src_path")) addPathAndPrefixes(srcPaths, pathText(sp));
        { const tp = child(node, "tgt_path"); if (tp) addPathAndPrefixes(tgtPaths, pathText(tp)); }
        break;
      case "computed_arrow":
        { const tp = child(node, "tgt_path"); if (tp) addPathAndPrefixes(tgtPaths, pathText(tp)); }
        break;
      case "each_block":
        collectEachPaths(node, srcPaths, tgtPaths, null, null);
        break;
      case "flatten_block":
        collectFlattenPaths(node, srcPaths, tgtPaths);
        break;
    }
  }
}

/**
 * Recursively collect paths from an each_block.
 * Arrows inside an each_block are relative to the iteration field.
 *
 * Nullability contract for outerSrcBase / outerTgtBase:
 *   null     — no enclosing each_block has established a base path yet; this
 *               is the top-level call for this each_block, so paths from the
 *               block's own src_path/tgt_path become the new base.
 *   non-null — an enclosing each_block already established a prefix; paths in
 *               this nested block are qualified relative to that prefix via
 *               qualify(outerBase, localPath).
 *
 * Recursive call sites pass srcBase/tgtBase (the base resolved for this level)
 * as the outer values for any nested each_blocks found within this node.
 */
function collectEachPaths(
  node: SyntaxNode,
  srcPaths: Set<string>,
  tgtPaths: Set<string>,
  outerSrcBase: string | null,
  outerTgtBase: string | null,
): void {
  const rawSrc = child(node, "src_path");
  const rawTgt = child(node, "tgt_path");
  const srcBase = rawSrc ? qualify(outerSrcBase, pathText(rawSrc)) : outerSrcBase;
  const tgtBase = rawTgt ? qualify(outerTgtBase, pathText(rawTgt)) : outerTgtBase;

  if (srcBase) addPathAndPrefixes(srcPaths, srcBase);
  if (tgtBase) addPathAndPrefixes(tgtPaths, tgtBase);

  for (const ch of node.namedChildren) {
    if (ch.type === "map_arrow") {
      for (const sp of children(ch, "src_path")) {
        const leaf = pathText(sp);
        addPathAndPrefixes(srcPaths, srcBase ? qualify(srcBase, leaf) : leaf);
      }
      const tp = child(ch, "tgt_path");
      if (tp) {
        const leaf = pathText(tp);
        addPathAndPrefixes(tgtPaths, tgtBase ? qualify(tgtBase, leaf) : leaf);
      }
    } else if (ch.type === "computed_arrow") {
      const tp = child(ch, "tgt_path");
      if (tp) {
        const leaf = pathText(tp);
        addPathAndPrefixes(tgtPaths, tgtBase ? qualify(tgtBase, leaf) : leaf);
      }
    } else if (ch.type === "each_block") {
      collectEachPaths(ch, srcPaths, tgtPaths, srcBase, tgtBase);
    }
  }
}

function collectFlattenPaths(
  node: SyntaxNode,
  srcPaths: Set<string>,
  tgtPaths: Set<string>,
): void {
  const rawSrc = child(node, "src_path");
  const srcBase = rawSrc ? pathText(rawSrc) : null;
  if (srcBase) addPathAndPrefixes(srcPaths, srcBase);

  for (const ch of node.namedChildren) {
    if (ch.type === "map_arrow") {
      for (const sp of children(ch, "src_path")) {
        const leaf = pathText(sp);
        addPathAndPrefixes(srcPaths, srcBase ? qualify(srcBase, leaf) : leaf);
      }
      const tp = child(ch, "tgt_path");
      if (tp) addPathAndPrefixes(tgtPaths, pathText(tp));
    } else if (ch.type === "computed_arrow") {
      const tp = child(ch, "tgt_path");
      if (tp) addPathAndPrefixes(tgtPaths, pathText(tp));
    }
  }
}

function qualify(base: string | null, leaf: string): string {
  return base ? `${base}.${leaf}` : leaf;
}

// ---------- Field coverage building ----------

/**
 * Recursively build FieldCoverageEntry list for a schema's fields.
 * `prefix` is the path from the schema root to the current level.
 */
function buildFieldCoverage(
  fields: FieldInfo[],
  uri: string,
  prefix: string,
  coveredPaths: Set<string>,
): FieldCoverageEntry[] {
  const result: FieldCoverageEntry[] = [];
  for (const f of fields) {
    const path = prefix ? `${prefix}.${f.name}` : f.name;
    const mapped = coveredPaths.has(f.name) || coveredPaths.has(path);
    result.push({ path, uri, line: f.range.start.line, mapped });
    if (f.children.length > 0) {
      result.push(...buildFieldCoverage(f.children, uri, path, coveredPaths));
    }
  }
  return result;
}

// ---------- Helpers ----------

function findMappingBlock(tree: Tree, name: string): SyntaxNode | null {
  for (const node of tree.rootNode.namedChildren) {
    if (node.type === "mapping_block" && labelText(node) === name) return node;
    if (node.type === "namespace_block") {
      for (const ch of node.namedChildren) {
        if (ch.type === "mapping_block" && labelText(ch) === name) return ch;
      }
    }
  }
  return null;
}

function getSchemaIdsFromBlock(body: SyntaxNode, blockType: "source_block" | "target_block"): string[] {
  for (const node of body.namedChildren) {
    if (node.type === blockType) {
      const ids: string[] = [];
      for (const ref of children(node, "source_ref")) {
        const name = sourceRefText(ref);
        if (name) ids.push(name);
      }
      return ids;
    }
  }
  return [];
}

function resolveSchema(
  wsIndex: WorkspaceIndex,
  schemaId: string,
): { fields: FieldInfo[]; uri: string } | null {
  const defs = resolveDefinition(wsIndex, schemaId, null);
  const def = defs.find((d) => d.kind === "schema");
  return def ? { fields: def.fields, uri: def.uri } : null;
}

function pathText(node: SyntaxNode): string {
  const text = node.text;
  return text.startsWith("`") && text.endsWith("`") ? text.slice(1, -1) : text;
}

function sourceRefText(ref: SyntaxNode): string | null {
  const qn = child(ref, "qualified_name");
  if (qn) {
    const ids = qn.namedChildren.filter((c) => c.type === "identifier");
    if (ids.length >= 2 && ids[0] && ids[1]) return `${ids[0].text}::${ids[1].text}`;
    if (ids.length === 1 && ids[0]) return ids[0].text;
    return qn.text;
  }
  const bn = child(ref, "backtick_name");
  if (bn) return bn.text.slice(1, -1);
  const id = child(ref, "identifier");
  return id ? id.text : null;
}
