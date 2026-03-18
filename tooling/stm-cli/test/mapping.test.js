/**
 * mapping.test.js — Unit tests for mapping command helpers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ── Mock CST helpers ──────────────────────────────────────────────────────────

function n(type, namedChildren = [], text = "") {
  return { type, text, startPosition: { row: 0, column: 0 }, namedChildren };
}
function ident(t) { return n("identifier", [], t); }
function blockLabel(name) {
  return n("block_label", [ident(name)]);
}

// ── Inline collectArrows (mirrors mapping.js) ─────────────────────────────────

function pathText(pathNode) {
  if (!pathNode) return "?";
  return pathNode.text;
}

function collectArrows(bodyNode) {
  if (!bodyNode) return [];
  const arrows = [];
  for (const c of bodyNode.namedChildren) {
    if (c.type === "map_arrow") {
      const src = c.namedChildren.find((x) => x.type === "src_path");
      const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
      const hasBody = c.namedChildren.some((x) => x.type === "pipe_chain");
      arrows.push({ kind: "map", src: pathText(src), tgt: pathText(tgt), hasBody });
    } else if (c.type === "computed_arrow") {
      const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
      const hasBody = c.namedChildren.some((x) => x.type === "pipe_chain");
      arrows.push({ kind: "computed", src: null, tgt: pathText(tgt), hasBody });
    } else if (c.type === "nested_arrow") {
      const src = c.namedChildren.find((x) => x.type === "src_path");
      const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
      arrows.push({ kind: "nested", src: pathText(src), tgt: pathText(tgt), hasBody: true });
    }
  }
  return arrows;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("collectArrows", () => {
  it("collects map_arrow with src and tgt", () => {
    const src = n("src_path", [], "CUST_ID");
    const tgt = n("tgt_path", [], "customer_id");
    const arrow = n("map_arrow", [src, tgt]);
    const body = n("mapping_body", [arrow]);

    const arrows = collectArrows(body);
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].kind, "map");
    assert.equal(arrows[0].src, "CUST_ID");
    assert.equal(arrows[0].tgt, "customer_id");
    assert.equal(arrows[0].hasBody, false);
  });

  it("detects transform body on map_arrow", () => {
    const src = n("src_path", [], "FIRST_NM");
    const tgt = n("tgt_path", [], "first_name");
    const pipe = n("pipe_chain", [], "trim | title_case");
    const arrow = n("map_arrow", [src, tgt, pipe]);
    const body = n("mapping_body", [arrow]);

    const arrows = collectArrows(body);
    assert.equal(arrows[0].hasBody, true);
  });

  it("collects computed_arrow with null src", () => {
    const tgt = n("tgt_path", [], "display_name");
    const pipe = n("pipe_chain", [], "concat");
    const arrow = n("computed_arrow", [tgt, pipe]);
    const body = n("mapping_body", [arrow]);

    const arrows = collectArrows(body);
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].kind, "computed");
    assert.equal(arrows[0].src, null);
    assert.equal(arrows[0].tgt, "display_name");
    assert.equal(arrows[0].hasBody, true);
  });

  it("collects nested_arrow", () => {
    const src = n("src_path", [], "addr");
    const tgt = n("tgt_path", [], "address");
    const arrow = n("nested_arrow", [src, tgt]);
    const body = n("mapping_body", [arrow]);

    const arrows = collectArrows(body);
    assert.equal(arrows[0].kind, "nested");
    assert.equal(arrows[0].hasBody, true);
  });

  it("collects multiple arrow types", () => {
    const mapArrow = n("map_arrow", [n("src_path", [], "A"), n("tgt_path", [], "B")]);
    const computed = n("computed_arrow", [n("tgt_path", [], "C")]);
    const body = n("mapping_body", [mapArrow, computed]);

    assert.equal(collectArrows(body).length, 2);
  });

  it("returns empty for null body", () => {
    assert.deepEqual(collectArrows(null), []);
  });

  it("ignores non-arrow children (source_block, note_block)", () => {
    const srcBlock = n("source_block", []);
    const noteBlock = n("note_block", []);
    const body = n("mapping_body", [srcBlock, noteBlock]);
    assert.deepEqual(collectArrows(body), []);
  });
});

describe("findMappingNode", () => {
  function findMappingNode(rootNode, name) {
    for (const c of rootNode.namedChildren) {
      if (c.type !== "mapping_block") continue;
      const lbl = c.namedChildren.find((x) => x.type === "block_label");
      if (!lbl && name === null) return c;
      if (!lbl) continue;
      const inner = lbl.namedChildren[0];
      let nm = inner?.text ?? "";
      if (inner?.type === "quoted_name") nm = nm.slice(1, -1);
      if (nm === name) return c;
    }
    return null;
  }

  it("finds a mapping by name", () => {
    const block = n("mapping_block", [blockLabel("migration")]);
    const root = n("source_file", [block]);
    assert.ok(findMappingNode(root, "migration") !== null);
  });

  it("returns null when not found", () => {
    const root = n("source_file", []);
    assert.equal(findMappingNode(root, "missing"), null);
  });
});
