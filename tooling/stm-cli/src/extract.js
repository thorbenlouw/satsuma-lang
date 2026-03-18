/**
 * extract.js — CST extraction functions for STM files
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

// ── Public extract functions ──────────────────────────────────────────────────

/**
 * Extract all schema_block definitions from the CST.
 *
 * @param {object} rootNode  tree-sitter root node
 * @returns {Array<{name:string, note:string|null, fields:Array<{name,type}>, row:number}>}
 */
export function extractSchemas(rootNode) {
  return children(rootNode, "schema_block").map((node) => {
    const name = labelText(node);
    const meta = child(node, "metadata_block");
    const noteTag = meta ? child(meta, "note_tag") : null;
    const noteStr = noteTag
      ? stringText(noteTag.namedChildren.find((c) => c.type === "nl_string" || c.type === "multiline_string"))
      : null;
    const body = child(node, "schema_body");
    const fields = body ? extractDirectFields(body) : [];
    return { name, note: noteStr, fields, row: node.startPosition.row };
  });
}

/**
 * Extract all metric_block definitions.
 *
 * @param {object} rootNode
 * @returns {Array<{name:string, displayName:string|null, sources:string[], grain:string|null, fields:Array<{name,type}>, row:number}>}
 */
export function extractMetrics(rootNode) {
  return children(rootNode, "metric_block").map((node) => {
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
    if (meta) {
      // source key_value_pair or source { ... }
      for (const entry of meta.namedChildren) {
        if (entry.type === "key_value_pair") {
          const key = child(entry, "kv_key");
          if (key?.text === "source") {
            const val = entry.namedChildren.find((c) => c !== key);
            if (val) sources.push(entryText(val));
          } else if (key?.text === "grain") {
            const val = entry.namedChildren.find((c) => c !== key);
            if (val) grain = entryText(val);
          }
        }
        // source { id1, id2 } appears as a slice_body-like construct — handled via identifiers
        // Actually looking at the grammar, source in metric metadata is a key_value_pair
        // but source { ... } uses a separate block. For now capture tag_tokens too.
      }
    }

    const body = child(node, "metric_body");
    const fields = body ? extractDirectFields(body) : [];
    return { name, displayName, sources, grain, fields, row: node.startPosition.row };
  });
}

/**
 * Extract all mapping_block definitions.
 *
 * @param {object} rootNode
 * @returns {Array<{name:string|null, sources:string[], targets:string[], arrowCount:number, row:number}>}
 */
export function extractMappings(rootNode) {
  return children(rootNode, "mapping_block").map((node) => {
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
          const t = entryText(c);
          if (t) sources.push(t);
        }
      }
      if (tgtBlock) {
        const t = entryText(tgtBlock.namedChildren[0]);
        if (t) targets.push(t);
      }

      arrowCount =
        allDescendants(body, "map_arrow").length +
        allDescendants(body, "computed_arrow").length +
        allDescendants(body, "nested_arrow").length;
    }

    return { name, sources, targets, arrowCount, row: node.startPosition.row };
  });
}

/**
 * Extract all fragment_block definitions.
 *
 * @param {object} rootNode
 * @returns {Array<{name:string, fields:Array<{name,type}>, row:number}>}
 */
export function extractFragments(rootNode) {
  return children(rootNode, "fragment_block").map((node) => {
    const name = labelText(node);
    const body = child(node, "schema_body");
    const fields = body ? extractDirectFields(body) : [];
    return { name, fields, row: node.startPosition.row };
  });
}

/**
 * Extract all transform_block definitions.
 *
 * @param {object} rootNode
 * @returns {Array<{name:string, row:number}>}
 */
export function extractTransforms(rootNode) {
  return children(rootNode, "transform_block").map((node) => ({
    name: labelText(node),
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

  for (const mappingNode of children(rootNode, "mapping_block")) {
    const mappingName = labelText(mappingNode);
    const body = child(mappingNode, "mapping_body");
    if (!body) continue;

    const mapArrows = allDescendants(body, "map_arrow");
    const computedArrows = allDescendants(body, "computed_arrow");

    for (const arrow of [...mapArrows, ...computedArrows]) {
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
