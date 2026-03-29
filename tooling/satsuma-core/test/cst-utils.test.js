/**
 * cst-utils.test.js — Unit tests for satsuma-core/src/cst-utils.ts
 *
 * Uses lightweight mock CST nodes that mirror the tree-sitter node structure
 * (type, text, namedChildren). No native binary or WASM required.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  child,
  children,
  allDescendants,
  labelText,
  stringText,
  entryText,
} from "../dist/cst-utils.js";

// ── Mock helpers ──────────────────────────────────────────────────────────────

function n(type, namedChildren = [], text = "") {
  return {
    type,
    text,
    isNamed: true,
    namedChildren,
    children: namedChildren,
    childCount: namedChildren.length,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: text.length },
    startIndex: 0,
    endIndex: text.length,
    isMissing: false,
    parent: null,
    child: (i) => namedChildren[i] ?? null,
  };
}

function ident(text) {
  return n("identifier", [], text);
}

function backtick(inner) {
  return n("backtick_name", [], `\`${inner}\``);
}

function nlStr(inner) {
  return n("nl_string", [], `"${inner}"`);
}

function multilineStr(inner) {
  return n("multiline_string", [], `"""  ${inner}  """`);
}

function blockLabel(nameNode) {
  return n("block_label", [nameNode]);
}

// ── child() ──────────────────────────────────────────────────────────────────

describe("child()", () => {
  it("returns the first named child of the given type", () => {
    const a = ident("a");
    const b = n("block_label", [], "lbl");
    const root = n("schema_block", [a, b]);
    assert.strictEqual(child(root, "block_label"), b);
  });

  it("returns null when no child of the given type exists", () => {
    const root = n("schema_block", [ident("foo")]);
    assert.strictEqual(child(root, "block_label"), null);
  });

  it("skips null entries in namedChildren", () => {
    const b = n("block_label", [], "lbl");
    const root = { ...n("schema_block", []), namedChildren: [null, b] };
    assert.strictEqual(child(root, "block_label"), b);
  });
});

// ── children() ───────────────────────────────────────────────────────────────

describe("children()", () => {
  it("returns all named children of the given type", () => {
    const f1 = n("field_decl", [], "f1");
    const f2 = n("field_decl", [], "f2");
    const other = ident("x");
    const root = n("schema_body", [f1, other, f2]);
    assert.deepEqual(children(root, "field_decl"), [f1, f2]);
  });

  it("returns empty array when no children of the given type", () => {
    const root = n("schema_body", [ident("x")]);
    assert.deepEqual(children(root, "field_decl"), []);
  });

  it("filters null entries", () => {
    const f1 = n("field_decl", [], "f1");
    const root = { ...n("schema_body", []), namedChildren: [null, f1, null] };
    assert.deepEqual(children(root, "field_decl"), [f1]);
  });
});

// ── allDescendants() ─────────────────────────────────────────────────────────

describe("allDescendants()", () => {
  it("collects all descendants of the given type at any depth", () => {
    const w1 = n("warning_comment", [], "//! a");
    const w2 = n("warning_comment", [], "//! b");
    const nested = n("schema_body", [w1]);
    const root = n("source_node", [nested, w2]);
    const result = allDescendants(root, "warning_comment");
    assert.deepEqual(result, [w1, w2]);
  });

  it("returns empty array when type not found", () => {
    const root = n("root", [n("schema_block", [ident("a")])]);
    assert.deepEqual(allDescendants(root, "warning_comment"), []);
  });

  it("skips null children", () => {
    const w = n("warning_comment", [], "//! x");
    const body = { ...n("schema_body", []), namedChildren: [null, w] };
    const root = n("root", [body]);
    assert.deepEqual(allDescendants(root, "warning_comment"), [w]);
  });
});

// ── labelText() ──────────────────────────────────────────────────────────────

describe("labelText()", () => {
  it("returns identifier text from block_label", () => {
    const lbl = blockLabel(ident("customers"));
    const block = n("schema_block", [lbl]);
    assert.equal(labelText(block), "customers");
  });

  it("strips backticks from backtick_name in block_label", () => {
    const lbl = blockLabel(backtick("my entity"));
    const block = n("schema_block", [lbl]);
    assert.equal(labelText(block), "my entity");
  });

  it("returns null when no block_label child", () => {
    const block = n("schema_block", [ident("x")]);
    assert.equal(labelText(block), null);
  });

  it("returns null when block_label has no children", () => {
    const lbl = n("block_label", []);
    const block = n("schema_block", [lbl]);
    assert.equal(labelText(block), null);
  });
});

// ── stringText() ─────────────────────────────────────────────────────────────

describe("stringText()", () => {
  it("strips nl_string delimiters", () => {
    assert.equal(stringText(nlStr("hello world")), "hello world");
  });

  it("strips multiline_string delimiters and trims whitespace", () => {
    const ms = n("multiline_string", [], '"""  trimmed  """');
    assert.equal(stringText(ms), "trimmed");
  });

  it("returns raw text for other node types", () => {
    const id = ident("foo");
    assert.equal(stringText(id), "foo");
  });

  it("returns null for null input", () => {
    assert.equal(stringText(null), null);
  });

  it("returns null for undefined input", () => {
    assert.equal(stringText(undefined), null);
  });
});

// ── entryText() ──────────────────────────────────────────────────────────────

describe("entryText()", () => {
  it("strips backticks from backtick_name", () => {
    assert.equal(entryText(backtick("my field")), "my field");
  });

  it("strips quotes from nl_string", () => {
    assert.equal(entryText(nlStr("some value")), "some value");
  });

  it("returns raw text for identifier", () => {
    assert.equal(entryText(ident("customer_id")), "customer_id");
  });

  it("returns null for null input", () => {
    assert.equal(entryText(null), null);
  });

  it("returns null for undefined input", () => {
    assert.equal(entryText(undefined), null);
  });
});
