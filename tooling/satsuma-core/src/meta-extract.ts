/**
 * meta-extract.ts — Extract structured metadata from Satsuma CST metadata_block nodes
 *
 * Parses metadata into tags (standalone tokens), key-value pairs, enum bodies,
 * and note strings.
 */

import type { SyntaxNode, MetaEntry } from "./types.js";

export type { MetaEntry };

/**
 * Normalize a metadata value CST node into the logical string value.
 *
 * The grammar wraps key/value payloads in `value_text`, so quoted string values
 * often arrive as `value_text.text === "\"INTERNAL\""`. Downstream JSON
 * consumers expect the value without those source delimiters.
 */
function normalizeMetadataValue(valueNode: SyntaxNode | null | undefined): string {
  if (!valueNode) return "";

  if (valueNode.type === "nl_string" || valueNode.type === "backtick_name") {
    return valueNode.text.slice(1, -1);
  }

  const nestedValue = valueNode.namedChildren.find(
    (child) => child.type === "nl_string" || child.type === "backtick_name",
  );
  if (nestedValue) {
    return normalizeMetadataValue(nestedValue);
  }

  const text = valueNode.text;
  if (
    text.length >= 2 &&
    ((text.startsWith("\"") && text.endsWith("\"")) ||
      (text.startsWith("`") && text.endsWith("`")))
  ) {
    return text.slice(1, -1);
  }

  return text;
}

/**
 * Extract structured metadata from a metadata_block CST node.
 */
export function extractMetadata(metaNode: SyntaxNode | null | undefined): MetaEntry[] {
  if (!metaNode) return [];
  const entries: MetaEntry[] = [];

  for (const c of metaNode.namedChildren) {
    if (c.type === "tag_token") {
      entries.push({ kind: "tag", tag: c.text });
    } else if (c.type === "tag_with_value") {
      const key = c.namedChildren[0]; // identifier
      const val = c.namedChildren[1]; // value_text
      const value = normalizeMetadataValue(val);
      entries.push({ kind: "kv", key: key?.text ?? "", value });
    } else if (c.type === "enum_body") {
      const values = c.namedChildren
        .filter((x) => x.type === "identifier" || x.type === "nl_string" || x.type === "number_literal")
        .map((x) =>
          x.type === "nl_string" ? x.text.slice(1, -1) : x.text,
        );
      entries.push({ kind: "enum", values });
    } else if (c.type === "note_tag") {
      const strNode = c.namedChildren.find(
        (x) => x.type === "nl_string" || x.type === "multiline_string",
      );
      if (strNode) {
        const text =
          strNode.type === "multiline_string"
            ? strNode.text.slice(3, -3).trim()
            : strNode.text.slice(1, -1);
        entries.push({ kind: "note", text });
      }
    } else if (c.type === "slice_body") {
      const values = c.namedChildren
        .filter((x) => x.type === "identifier")
        .map((x) => x.text);
      entries.push({ kind: "slice", values });
    }
  }

  return entries;
}
