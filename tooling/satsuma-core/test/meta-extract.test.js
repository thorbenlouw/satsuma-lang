/**
 * meta-extract.test.js — Unit tests for satsuma-core meta-extract module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractMetadata } from "../dist/meta-extract.js";

function n(type, namedChildren = [], text = "") {
  return { type, text, isNamed: true, namedChildren, children: namedChildren };
}

function metaBlock(children) {
  return n("metadata_block", children);
}

describe("extractMetadata()", () => {
  it("returns empty array for null input", () => {
    assert.deepEqual(extractMetadata(null), []);
  });

  it("returns empty array for undefined input", () => {
    assert.deepEqual(extractMetadata(undefined), []);
  });

  it("extracts tag_token entries", () => {
    const meta = metaBlock([n("tag_token", [], "#pii")]);
    assert.deepEqual(extractMetadata(meta), [{ kind: "tag", tag: "#pii" }]);
  });

  it("extracts tag_with_value entries", () => {
    const key = n("identifier", [], "owner");
    const val = n("value_text", [], "data-team");
    const kv = n("tag_with_value", [key, val]);
    const meta = metaBlock([kv]);
    assert.deepEqual(extractMetadata(meta), [{ kind: "kv", key: "owner", value: "data-team" }]);
  });

  it("strips nl_string delimiters from kv value", () => {
    const key = n("identifier", [], "label");
    const val = n("nl_string", [], '"some label"');
    const kv = n("tag_with_value", [key, val]);
    const meta = metaBlock([kv]);
    assert.deepEqual(extractMetadata(meta), [{ kind: "kv", key: "label", value: "some label" }]);
  });

  it("extracts enum_body entries", () => {
    const id1 = n("identifier", [], "open");
    const id2 = n("identifier", [], "closed");
    const enumBody = n("enum_body", [id1, id2]);
    const meta = metaBlock([enumBody]);
    assert.deepEqual(extractMetadata(meta), [{ kind: "enum", values: ["open", "closed"] }]);
  });

  it("extracts note_tag entries", () => {
    const str = n("nl_string", [], '"this is a note"');
    const noteTag = n("note_tag", [str]);
    const meta = metaBlock([noteTag]);
    assert.deepEqual(extractMetadata(meta), [{ kind: "note", text: "this is a note" }]);
  });

  it("extracts slice_body entries", () => {
    const id1 = n("identifier", [], "region");
    const id2 = n("identifier", [], "channel");
    const sliceBody = n("slice_body", [id1, id2]);
    const meta = metaBlock([sliceBody]);
    assert.deepEqual(extractMetadata(meta), [{ kind: "slice", values: ["region", "channel"] }]);
  });

  it("extracts multiple entries in order", () => {
    const tag = n("tag_token", [], "#required");
    const key = n("identifier", [], "owner");
    const val = n("value_text", [], "eng");
    const kv = n("tag_with_value", [key, val]);
    const meta = metaBlock([tag, kv]);
    assert.deepEqual(extractMetadata(meta), [
      { kind: "tag", tag: "#required" },
      { kind: "kv", key: "owner", value: "eng" },
    ]);
  });
});
