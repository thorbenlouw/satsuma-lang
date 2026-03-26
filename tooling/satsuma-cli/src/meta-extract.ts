/**
 * meta-extract.ts — Extract structured metadata from Satsuma CST metadata_block nodes
 *
 * Parses metadata into tags (standalone tokens), key-value pairs, enum bodies,
 * and note strings.
 */

import type { SyntaxNode } from "./types.js";

export interface MetaEntryTag {
  kind: "tag";
  tag: string;
}

export interface MetaEntryKV {
  kind: "kv";
  key: string;
  value: string;
}

export interface MetaEntryEnum {
  kind: "enum";
  values: string[];
}

export interface MetaEntryNote {
  kind: "note";
  text: string;
}

export interface MetaEntrySlice {
  kind: "slice";
  values: string[];
}

export type MetaEntry = MetaEntryTag | MetaEntryKV | MetaEntryEnum | MetaEntryNote | MetaEntrySlice;

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
      let value = val?.text ?? "";
      if (val?.type === "nl_string") value = value.slice(1, -1);
      if (val?.type === "backtick_name") value = value.slice(1, -1);
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
