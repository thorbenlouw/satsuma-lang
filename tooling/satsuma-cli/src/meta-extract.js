/**
 * meta-extract.js — Extract structured metadata from Satsuma CST metadata_block nodes
 *
 * Parses metadata into tags (standalone tokens), key-value pairs, enum bodies,
 * and note strings.
 */

/**
 * @typedef {Object} MetaEntry
 * @property {'tag'|'kv'|'enum'|'note'|'slice'} kind
 * @property {string} [key]     for kv entries
 * @property {string} [value]   for kv entries
 * @property {string} [tag]     for tag entries
 * @property {string[]} [values]  for enum entries
 * @property {string} [text]    for note entries
 */

/**
 * Extract structured metadata from a metadata_block CST node.
 *
 * @param {object} metaNode  metadata_block CST node
 * @returns {MetaEntry[]}
 */
export function extractMetadata(metaNode) {
  if (!metaNode) return [];
  const entries = [];

  for (const c of metaNode.namedChildren) {
    if (c.type === "tag_token") {
      entries.push({ kind: "tag", tag: c.text });
    } else if (c.type === "key_value_pair") {
      const key = c.namedChildren.find((x) => x.type === "kv_key");
      const val = c.namedChildren.find((x) => x.type !== "kv_key");
      let value = val?.text ?? "";
      if (val?.type === "nl_string") value = value.slice(1, -1);
      if (val?.type === "backtick_name") value = value.slice(1, -1);
      entries.push({ kind: "kv", key: key?.text ?? "", value });
    } else if (c.type === "enum_body") {
      const values = c.namedChildren
        .filter((x) => x.type === "identifier" || x.type === "nl_string")
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
