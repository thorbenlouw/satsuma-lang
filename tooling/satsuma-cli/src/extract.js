/**
 * extract.js — CST extraction functions for Satsuma files
 *
 * Each function accepts a tree-sitter root node and returns structured data
 * extracted from the concrete syntax tree. Functions are pure (no I/O) so
 * they can be tested against mock CST objects.
 */

import { classifyTransform, classifyArrow } from "./classify.js";

// ── CST helpers ──────────────────────────────────────────────────────────────

/** First named child of the given type, or null. */
function child(node, type) {
  return node.namedChildren.find((c) => c.type === type) ?? null;
}

/** All named children of the given type. */
function children(node, type) {
  return node.namedChildren.filter((c) => c.type === type);
}

/** Collect all descendants of a given type (depth-first). */
function allDescendants(node, type, acc = []) {
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
function labelText(node) {
  const lbl = child(node, "block_label");
  if (!lbl) return null;
  const inner = lbl.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "quoted_name") return inner.text.slice(1, -1);
  return inner.text; // identifier
}

/** Strip outer delimiters from a string node. */
function stringText(node) {
  if (!node) return null;
  if (node.type === "multiline_string") return node.text.slice(3, -3).trim();
  if (node.type === "nl_string") return node.text.slice(1, -1);
  return node.text;
}

/**
 * Extract the text from a source/target entry node.
 * _source_entry → backtick_name | identifier | nl_string
 */
function entryText(node) {
  if (!node) return null;
  if (node.type === "backtick_name") return node.text.slice(1, -1);
  if (node.type === "nl_string") return node.text.slice(1, -1);
  return node.text; // identifier
}

/**
 * Extract direct field_decl children of a body node.
 * Returns [{name, type}]
 */
function extractDirectFields(bodyNode) {
  return children(bodyNode, "field_decl").map((fd) => {
    const nameNode = child(fd, "field_name");
    const typeNode = child(fd, "type_expr");
    const inner = nameNode?.namedChildren[0];
    let name = inner?.text ?? "";
    if (inner?.type === "backtick_name") name = name.slice(1, -1);
    return { name, type: typeNode?.text ?? "" };
  });
}

/**
 * Extract the full field tree from a schema_body node, including nested
 * record_block and list_block children.
 *
 * Returns [{name, type, isList?, children?}] where children is recursive.
 */
function extractFieldTree(bodyNode) {
  const fields = [];
  let hasSpreads = false;

  for (const c of bodyNode.namedChildren) {
    if (c.type === "field_decl") {
      const nameNode = child(c, "field_name");
      const typeNode = child(c, "type_expr");
      const inner = nameNode?.namedChildren[0];
      let name = inner?.text ?? "";
      if (inner?.type === "backtick_name") name = name.slice(1, -1);
      fields.push({ name, type: typeNode?.text ?? "" });
    } else if (c.type === "record_block" || c.type === "list_block") {
      const name = labelText(c);
      const innerBody = child(c, "schema_body");
      const nested = innerBody ? extractFieldTree(innerBody) : { fields: [], hasSpreads: false };
      fields.push({
        name,
        type: c.type === "list_block" ? "list" : "record",
        isList: c.type === "list_block",
        children: nested.fields,
      });
      if (nested.hasSpreads) hasSpreads = true;
    } else if (c.type === "fragment_spread") {
      hasSpreads = true;
    }
  }

  return { fields, hasSpreads };
}

/**
 * Extract the text from a qualified_name node (ns::identifier).
 * Returns "ns::name" string.
 */
function qualifiedNameText(node) {
  if (!node || node.type !== "qualified_name") return null;
  const ids = children(node, "identifier");
  if (ids.length < 2) return null;
  return `${ids[0].text}::${ids[1].text}`;
}

/**
 * Extract a source_ref name, handling qualified_name (ns::name) in addition
 * to backtick_name, identifier, and nl_string.
 */
function sourceRefNameNs(node) {
  if (!node) return null;
  if (node.type !== "source_ref") return entryText(node);
  for (const c of node.namedChildren) {
    if (c.type === "qualified_name") return qualifiedNameText(c);
    if (c.type === "backtick_name") return c.text.slice(1, -1);
    if (c.type === "identifier") return c.text;
  }
  return null;
}

/**
 * Collect nodes of a given type from both top-level and inside namespace blocks.
 * Returns [{node, namespace: string|null}] pairs.
 */
function collectFromNamespaces(rootNode, nodeType) {
  const results = [];
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

/**
 * Extract namespace block metadata.
 * Returns [{name, note, row}] for each namespace block.
 */
export function extractNamespaces(rootNode) {
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

// ── Public extract functions ──────────────────────────────────────────────────

/**
 * Extract all schema_block definitions from the CST.
 *
 * @param {object} rootNode  tree-sitter root node
 * @returns {Array<{name:string, note:string|null, fields:Array<{name,type}>, row:number}>}
 */
export function extractSchemas(rootNode) {
  return collectFromNamespaces(rootNode, "schema_block").map(({ node, namespace }) => {
    const name = labelText(node);
    const meta = child(node, "metadata_block");
    const noteTag = meta ? child(meta, "note_tag") : null;
    const noteStr = noteTag
      ? stringText(noteTag.namedChildren.find((c) => c.type === "nl_string" || c.type === "multiline_string"))
      : null;
    const body = child(node, "schema_body");
    const fieldTree = body ? extractFieldTree(body) : { fields: [], hasSpreads: false };
    return {
      name,
      namespace,
      note: noteStr,
      fields: fieldTree.fields,
      hasSpreads: fieldTree.hasSpreads,
      row: node.startPosition.row,
    };
  });
}

/**
 * Extract all metric_block definitions.
 *
 * @param {object} rootNode
 * @returns {Array<{name:string, displayName:string|null, sources:string[], grain:string|null, fields:Array<{name,type}>, row:number}>}
 */
export function extractMetrics(rootNode) {
  return collectFromNamespaces(rootNode, "metric_block").map(({ node, namespace }) => {
    const name = labelText(node);
    // Optional display name: nl_string directly inside metric_block (not inside metadata)
    const displayNameNode = node.namedChildren.find(
      (c) => (c.type === "nl_string" || c.type === "multiline_string") &&
        node.namedChildren.indexOf(c) < node.namedChildren.findIndex((x) => x.type === "metadata_block"),
    );
    const displayName = displayNameNode ? stringText(displayNameNode) : null;

    const meta = child(node, "metadata_block");
    const sources = [];
    let grain = null;
    const slices = [];
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
                  sources.push(qualifiedNameText(item));
                } else if (item.type === "identifier") {
                  sources.push(item.text);
                }
              }
            } else if (val.type === "qualified_name") {
              sources.push(qualifiedNameText(val));
            } else {
              sources.push(entryText(val));
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

/**
 * Extract all mapping_block definitions.
 *
 * @param {object} rootNode
 * @returns {Array<{name:string|null, sources:string[], targets:string[], arrowCount:number, row:number}>}
 */
export function extractMappings(rootNode) {
  return collectFromNamespaces(rootNode, "mapping_block").map(({ node, namespace }) => {
    const name = labelText(node);
    const body = child(node, "mapping_body");
    const sources = [];
    const targets = [];
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
        const t = sourceRefNameNs(tgtBlock.namedChildren[0]);
        if (t) targets.push(t);
      }

      arrowCount =
        allDescendants(body, "map_arrow").length +
        allDescendants(body, "computed_arrow").length +
        allDescendants(body, "nested_arrow").length;
    }

    // Qualify unqualified targets with their enclosing namespace
    const qualifiedTargets = targets.map((t) =>
      namespace && !t.includes("::") ? `${namespace}::${t}` : t,
    );

    return { name, namespace, sources, targets: qualifiedTargets, arrowCount, row: node.startPosition.row };
  });
}

/**
 * Extract all fragment_block definitions.
 *
 * @param {object} rootNode
 * @returns {Array<{name:string, fields:Array<{name,type}>, row:number}>}
 */
export function extractFragments(rootNode) {
  return collectFromNamespaces(rootNode, "fragment_block").map(({ node, namespace }) => {
    const name = labelText(node);
    const body = child(node, "schema_body");
    const fields = body ? extractDirectFields(body) : [];
    return { name, namespace, fields, row: node.startPosition.row };
  });
}

/**
 * Extract all transform_block definitions.
 *
 * @param {object} rootNode
 * @returns {Array<{name:string, row:number}>}
 */
export function extractTransforms(rootNode) {
  return collectFromNamespaces(rootNode, "transform_block").map(({ node, namespace }) => ({
    name: labelText(node),
    namespace,
    row: node.startPosition.row,
  }));
}

/**
 * Extract all warning comments (//! ...).
 *
 * @param {object} rootNode
 * @returns {Array<{text:string, row:number}>}
 */
export function extractWarnings(rootNode) {
  return allDescendants(rootNode, "warning_comment").map((node) => ({
    text: node.text.replace(/^\/\/!\s*/, ""),
    row: node.startPosition.row,
  }));
}

/**
 * Extract all question comments (//? ...).
 *
 * @param {object} rootNode
 * @returns {Array<{text:string, row:number}>}
 */
export function extractQuestions(rootNode) {
  return allDescendants(rootNode, "question_comment").map((node) => ({
    text: node.text.replace(/^\/\/\?\s*/, ""),
    row: node.startPosition.row,
  }));
}

/**
 * Extract all import_decl nodes from the CST.
 *
 * @param {object} rootNode  tree-sitter root node
 * @returns {Array<{names:string[], path:string, row:number}>}
 */
export function extractImports(rootNode) {
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
      .filter(Boolean);

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
 * Handles field_path, backtick_path, namespaced_path, and relative_field_path.
 */
function pathText(pathNode) {
  if (!pathNode) return null;
  const inner = pathNode.namedChildren[0];
  if (!inner) return pathNode.text;
  if (inner.type === "backtick_path") return inner.text.slice(1, -1);
  return inner.text; // field_path, namespaced_path, relative_field_path
}

/**
 * Decompose pipe_step nodes into structured step records.
 *
 * @param {object[]} steps  Array of pipe_step CST nodes
 * @returns {Array<{type:string, text:string}>}
 */
function decomposePipeSteps(steps) {
  return steps.map((step) => {
    const inner = step.namedChildren[0];
    return {
      type: inner?.type ?? "unknown",
      text: inner?.text ?? step.text,
    };
  });
}

/**
 * Extract detailed arrow records from all mapping blocks in the CST.
 *
 * @param {object} rootNode  tree-sitter root node
 * @returns {Array<ArrowRecord>}
 *
 * @typedef {Object} ArrowRecord
 * @property {string|null} mapping   mapping name
 * @property {string|null} source    source field path (null for computed arrows)
 * @property {string|null} target    target field path
 * @property {string}      transform_raw  raw transform text
 * @property {Array<{type:string, text:string}>} steps  decomposed pipe steps
 * @property {'structural'|'nl'|'mixed'|'none'} classification
 * @property {boolean}     derived   true for computed arrows (no source)
 * @property {number}      line      0-based line number
 */
export function extractArrowRecords(rootNode) {
  const records = [];

  for (const { node: mappingNode, namespace } of collectFromNamespaces(rootNode, "mapping_block")) {
    const mappingName = labelText(mappingNode);
    const body = child(mappingNode, "mapping_body");
    if (!body) continue;

    const mapArrows = allDescendants(body, "map_arrow");
    const computedArrows = allDescendants(body, "computed_arrow");
    const nestedArrows = allDescendants(body, "nested_arrow");

    for (const arrow of [...mapArrows, ...computedArrows, ...nestedArrows]) {
      const srcNode = child(arrow, "src_path");
      const tgtNode = child(arrow, "tgt_path");
      const pipeChain = child(arrow, "pipe_chain");
      const pipeSteps = pipeChain ? children(pipeChain, "pipe_step") : [];

      const source = pathText(srcNode);
      const target = pathText(tgtNode);
      const classification = classifyTransform(pipeSteps);
      const derived = classifyArrow(arrow);
      const steps = decomposePipeSteps(pipeSteps);

      const transformRaw = pipeSteps.length > 0
        ? pipeSteps.map((s) => s.namedChildren[0]?.text ?? s.text).join(" | ")
        : "";

      records.push({
        mapping: mappingName,
        namespace,
        source,
        target,
        transform_raw: transformRaw,
        steps,
        classification,
        derived,
        line: arrow.startPosition.row,
      });
    }
  }

  return records;
}
