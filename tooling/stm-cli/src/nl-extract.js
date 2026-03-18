/**
 * nl-extract.js — Extract NL (natural language) content from STM CST nodes
 *
 * Walks a CST subtree and collects all NL content nodes: nl_string,
 * multiline_string, note_block, note_tag, warning_comment, question_comment.
 * Each item includes raw text, position type, and parent block/field context.
 */

/**
 * @typedef {Object} NLItem
 * @property {string} text         raw text content (delimiters stripped)
 * @property {string} kind         note | warning | question | transform
 * @property {string|null} parent  parent block or field name
 * @property {number} line         0-based line number
 */

/**
 * Extract all NL content from a CST subtree.
 *
 * @param {object} node       CST node to walk
 * @param {string|null} parent  parent context name
 * @returns {NLItem[]}
 */
export function extractNLContent(node, parent = null) {
  const items = [];
  walkNL(node, parent, items);
  return items;
}

function stripDelimiters(text, type) {
  if (type === "multiline_string") return text.slice(3, -3).trim();
  if (type === "nl_string") return text.slice(1, -1);
  return text;
}

function walkNL(node, parent, items) {
  for (const c of node.namedChildren) {
    if (c.type === "warning_comment") {
      items.push({
        text: c.text.replace(/^\/\/!\s*/, ""),
        kind: "warning",
        parent,
        line: c.startPosition.row,
      });
    } else if (c.type === "question_comment") {
      items.push({
        text: c.text.replace(/^\/\/\?\s*/, ""),
        kind: "question",
        parent,
        line: c.startPosition.row,
      });
    } else if (c.type === "note_block" || c.type === "note_tag") {
      const strNode = c.namedChildren.find(
        (x) => x.type === "nl_string" || x.type === "multiline_string",
      );
      if (strNode) {
        items.push({
          text: stripDelimiters(strNode.text, strNode.type),
          kind: "note",
          parent,
          line: c.startPosition.row,
        });
      }
    } else if (c.type === "pipe_step") {
      const inner = c.namedChildren[0];
      if (
        inner &&
        (inner.type === "nl_string" || inner.type === "multiline_string")
      ) {
        items.push({
          text: stripDelimiters(inner.text, inner.type),
          kind: "transform",
          parent,
          line: c.startPosition.row,
        });
      }
      // Don't recurse into pipe_step children further
    } else {
      // Update parent context for block-level nodes
      let newParent = parent;
      if (
        c.type === "schema_block" ||
        c.type === "mapping_block" ||
        c.type === "metric_block" ||
        c.type === "fragment_block"
      ) {
        newParent = getBlockName(c);
      } else if (c.type === "field_decl") {
        newParent = getFieldName(c) ?? parent;
      }
      walkNL(c, newParent, items);
    }
  }
}

function getBlockName(node) {
  const lbl = node.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "quoted_name") return inner.text.slice(1, -1);
  return inner.text;
}

function getFieldName(node) {
  const nameNode = node.namedChildren.find((c) => c.type === "field_name");
  const inner = nameNode?.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text;
}
