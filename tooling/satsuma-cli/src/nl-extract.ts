/**
 * nl-extract.ts — Extract NL (natural language) content from Satsuma CST nodes
 *
 * Walks a CST subtree and collects all NL content nodes: nl_string,
 * multiline_string, note_block, note_tag, warning_comment, question_comment.
 * Each item includes raw text, position type, and parent block/field context.
 */

import { labelText, stringText, isMetricSchema, child } from "@satsuma/core";
import type { SyntaxNode } from "./types.js";

export interface NLItem {
  text: string;
  kind: "note" | "warning" | "question" | "transform";
  parent: string | null;
  line: number;
}

/**
 * Extract all NL content from a CST subtree.
 *
 * When the root node is itself a schema_block for a metric schema, the
 * metric_name tag value is emitted as the first note item before descending
 * into the body. This handles both the scoped case (where a caller passes the
 * schema_block directly) and the document-level walk (where the block is a
 * child and the metric_name check fires in walkNL's else branch).
 */
export function extractNLContent(node: SyntaxNode, parent: string | null = null): NLItem[] {
  const items: NLItem[] = [];
  // When called directly with a schema_block (scoped query), emit the metric_name
  // immediately — walkNL only detects metric_name when schema_block is a child.
  if (node.type === "schema_block") {
    const metaBlock = child(node, "metadata_block");
    if (isMetricSchema(metaBlock)) {
      const metricNameText = extractMetricNameTag(metaBlock!);
      if (metricNameText) {
        items.push({
          text: metricNameText,
          kind: "note",
          parent: parent ?? labelText(node),
          line: node.startPosition.row + 1,
        });
      }
    }
  }
  walkNL(node, parent, items);
  return items;
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
        const text = strNodes.map((s) => stringText(s) ?? "").join("\n");
        items.push({
          text,
          kind: "note",
          parent,
          line: c.startPosition.row + 1,
        });
      }
    } else if (c.type === "source_block") {
      // Extract NL strings from source blocks (join descriptions)
      // NL strings may be direct children or nested inside source_ref nodes
      for (const sc of c.namedChildren) {
        if (sc.type === "nl_string" || sc.type === "multiline_string") {
          items.push({
            text: stringText(sc) ?? "",
            kind: "note",
            parent,
            line: sc.startPosition.row + 1,
          });
        } else if (sc.type === "source_ref") {
          for (const inner of sc.namedChildren) {
            if (inner.type === "nl_string" || inner.type === "multiline_string") {
              items.push({
                text: stringText(inner) ?? "",
                kind: "note",
                parent,
                line: inner.startPosition.row + 1,
              });
            }
          }
        }
      }
    } else if (c.type === "pipe_step") {
      const inner = c.namedChildren[0];
      if (inner?.type === "pipe_text") {
        // Check if pipe_text contains NL strings
        for (const kid of inner.namedChildren) {
          if (kid.type === "nl_string" || kid.type === "multiline_string") {
            items.push({
              text: stringText(kid) ?? "",
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
        c.type === "fragment_block" ||
        c.type === "transform_block"
      ) {
        newParent = labelText(c);
        // Metric schemas carry their display name as the `metric_name` metadata
        // tag rather than as a note block. Emit it as a note so consumers see
        // the human-readable label alongside body notes (sl-571v).
        if (c.type === "schema_block") {
          const metaBlock = child(c, "metadata_block");
          if (isMetricSchema(metaBlock)) {
            const metricNameText = extractMetricNameTag(metaBlock!);
            if (metricNameText) {
              items.push({
                text: metricNameText,
                kind: "note",
                parent: newParent,
                line: c.startPosition.row + 1,
              });
            }
          }
        }
      } else if (c.type === "field_decl") {
        // Use schema-qualified path (e.g. "alpha.email") so field-level NL
        // items are unambiguous across schemas in JSON output (sl-prsy).
        const fname = getFieldName(c);
        newParent = fname && parent ? `${parent}.${fname}` : (fname ?? parent);
      }
      walkNL(c, newParent, items);
    }
  }
}

/**
 * Extract the value of the `metric_name` tag from a metadata_block node.
 *
 * The `metric_name` tag_with_value carries the human-readable display name for
 * a metric schema. Its value child is a metadata_value containing an nl_string.
 * Returns null if no metric_name tag is present.
 */
function extractMetricNameTag(metaBlock: SyntaxNode): string | null {
  for (const entry of metaBlock.namedChildren) {
    if (entry.type === "tag_with_value") {
      const key = entry.namedChildren[0];
      const val = entry.namedChildren[1];
      if (key?.text === "metric_name" && val) {
        // The metadata_value child contains an nl_string
        const strNode = val.namedChildren.find(
          (c) => c.type === "nl_string" || c.type === "multiline_string",
        );
        if (strNode) return stringText(strNode) ?? null;
      }
    }
  }
  return null;
}

function getFieldName(node: SyntaxNode): string | null {
  const nameNode = node.namedChildren.find((c) => c.type === "field_name");
  const inner = nameNode?.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text;
}
