/**
 * nl-extract.ts — Extract NL (natural language) content from Satsuma CST nodes
 *
 * Walks a CST subtree and collects all NL content nodes: nl_string,
 * multiline_string, note_block, note_tag, warning_comment, question_comment.
 * Each item includes raw text, position type, and parent block/field context.
 */

import type { SyntaxNode } from "./types.js";

export interface NLItem {
  text: string;
  kind: "note" | "warning" | "question" | "transform";
  parent: string | null;
  line: number;
}

/**
 * Extract all NL content from a CST subtree.
 */
export function extractNLContent(node: SyntaxNode, parent: string | null = null): NLItem[] {
  const items: NLItem[] = [];
  walkNL(node, parent, items);
  return items;
}

function stripDelimiters(text: string, type: string): string {
  if (type === "multiline_string") return text.slice(3, -3).trim();
  if (type === "nl_string") return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  return text;
}

function walkNL(node: SyntaxNode, parent: string | null, items: NLItem[]): void {
  for (const c of node.namedChildren) {
    if (c.type === "warning_comment") {
      items.push({
        text: c.text.replace(/^\/\/!\s*/, ""),
        kind: "warning",
        parent,
        line: c.startPosition.row + 1,
      });
    } else if (c.type === "question_comment") {
      items.push({
        text: c.text.replace(/^\/\/\?\s*/, ""),
        kind: "question",
        parent,
        line: c.startPosition.row + 1,
      });
    } else if (c.type === "note_block" || c.type === "note_tag") {
      const strNodes = c.namedChildren.filter(
        (x) => x.type === "nl_string" || x.type === "multiline_string",
      );
      if (strNodes.length > 0) {
        const text = strNodes.map((s) => stripDelimiters(s.text, s.type)).join("\n");
        items.push({
          text,
          kind: "note",
          parent,
          line: c.startPosition.row + 1,
        });
      }
    } else if (c.type === "source_block") {
      // Extract NL strings from source blocks (join descriptions)
      for (const sc of c.namedChildren) {
        if (sc.type === "nl_string" || sc.type === "multiline_string") {
          items.push({
            text: stripDelimiters(sc.text, sc.type),
            kind: "note",
            parent,
            line: sc.startPosition.row + 1,
          });
        }
      }
    } else if (c.type === "pipe_step") {
      const inner = c.namedChildren[0];
      if (inner?.type === "pipe_text") {
        // Check if pipe_text contains NL strings
        for (const kid of inner.namedChildren) {
          if (kid.type === "nl_string" || kid.type === "multiline_string") {
            items.push({
              text: stripDelimiters(kid.text, kid.type),
              kind: "transform",
              parent,
              line: c.startPosition.row + 1,
            });
          }
        }
      }
    } else {
      let newParent = parent;
      if (
        c.type === "schema_block" ||
        c.type === "mapping_block" ||
        c.type === "metric_block" ||
        c.type === "fragment_block" ||
        c.type === "transform_block"
      ) {
        newParent = getBlockName(c);
      } else if (c.type === "field_decl") {
        newParent = getFieldName(c) ?? parent;
      }
      walkNL(c, newParent, items);
    }
  }
}

function getBlockName(node: SyntaxNode): string | null {
  const lbl = node.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "quoted_name") return inner.text.slice(1, -1);
  return inner.text;
}

function getFieldName(node: SyntaxNode): string | null {
  const nameNode = node.namedChildren.find((c) => c.type === "field_name");
  const inner = nameNode?.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text;
}
