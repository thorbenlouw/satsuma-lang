/**
 * extract.test.js — Unit tests for src/extract.js
 *
 * Tests use lightweight mock CST nodes that mirror the tree-sitter node
 * structure (type, text, namedChildren, startPosition) so no native binary
 * is required.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractSchemas,
  extractMetrics,
  extractMappings,
  extractFragments,
  extractTransforms,
  extractWarnings,
  extractQuestions,
  extractNamespaces,
  extractImports,
} from "#src/extract.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

/** Build a mock CST node. */
function n(type, namedChildren = [], text = "", row = 0) {
  return { type, text, startPosition: { row, column: 0 }, namedChildren };
}

/** Convenience: build an identifier node. */
function ident(text, row = 0) {
  return n("identifier", [], text, row);
}

/** Convenience: build a quoted_name node. */
function quoted(inner, row = 0) {
  return n("quoted_name", [], `'${inner}'`, row);
}

/** Convenience: build an nl_string node. */
function str(inner) {
  return n("nl_string", [], `"${inner}"`);
}

/** Convenience: build a block_label node (identifier child). */
function blockLabel(name) {
  const inner = name.startsWith("'") ? quoted(name.slice(1, -1)) : ident(name);
  return n("block_label", [inner]);
}

/** Convenience: build a type_expr node. */
function typeExpr(text) {
  return n("type_expr", [], text);
}

/** Convenience: build a field_name node wrapping an identifier. */
function fieldName(name) {
  return n("field_name", [ident(name)]);
}

/** Convenience: build a field_decl node. */
function fieldDecl(name, type, row = 0) {
  return n("field_decl", [fieldName(name), typeExpr(type)], "", row);
}

// ── extractSchemas ────────────────────────────────────────────────────────────

describe("extractSchemas", () => {
  it("extracts a simple schema with identifier name", () => {
    const noteTag = n("note_tag", [str("A note")]);
    const meta = n("metadata_block", [noteTag]);
    const body = n("schema_body", [fieldDecl("id", "INT"), fieldDecl("name", "VARCHAR(100)")]);
    const block = n("schema_block", [blockLabel("orders"), meta, body], "", 5);
    const root = n("source_file", [block]);

    const result = extractSchemas(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "orders");
    assert.equal(result[0].note, "A note");
    assert.equal(result[0].row, 5);
    assert.deepEqual(result[0].fields, [
      { name: "id", type: "INT" },
      { name: "name", type: "VARCHAR(100)" },
    ]);
  });

  it("extracts a schema with quoted name", () => {
    const body = n("schema_body", []);
    const block = n("schema_block", [blockLabel("'my schema'"), body]);
    const root = n("source_file", [block]);

    const result = extractSchemas(root);
    assert.equal(result[0].name, "my schema");
  });

  it("returns note=null when no metadata", () => {
    const body = n("schema_body", []);
    const block = n("schema_block", [blockLabel("t"), body]);
    const root = n("source_file", [block]);

    assert.equal(extractSchemas(root)[0].note, null);
  });

  it("returns empty array when no schemas", () => {
    const root = n("source_file", []);
    assert.deepEqual(extractSchemas(root), []);
  });

  it("extracts multiple schemas", () => {
    const makeBlock = (name) =>
      n("schema_block", [blockLabel(name), n("schema_body", [])]);
    const root = n("source_file", [makeBlock("a"), makeBlock("b"), makeBlock("c")]);
    assert.equal(extractSchemas(root).length, 3);
  });
});

// ── extractFragments ──────────────────────────────────────────────────────────

describe("extractFragments", () => {
  it("extracts a fragment with fields", () => {
    const body = n("schema_body", [
      fieldDecl("line1", "STRING(200)"),
      fieldDecl("city", "STRING(100)"),
    ]);
    const block = n("fragment_block", [blockLabel("'address fields'"), body], "", 3);
    const root = n("source_file", [block]);

    const result = extractFragments(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "address fields");
    assert.equal(result[0].row, 3);
    assert.equal(result[0].fields.length, 2);
  });

  it("returns empty array when no fragments", () => {
    assert.deepEqual(extractFragments(n("source_file", [])), []);
  });
});

// ── extractTransforms ─────────────────────────────────────────────────────────

describe("extractTransforms", () => {
  it("extracts transform name and row", () => {
    const block = n("transform_block", [blockLabel("normalize_phone")], "", 10);
    const root = n("source_file", [block]);

    const result = extractTransforms(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "normalize_phone");
    assert.equal(result[0].row, 10);
  });

  it("returns empty array when no transforms", () => {
    assert.deepEqual(extractTransforms(n("source_file", [])), []);
  });
});

// ── extractMappings ───────────────────────────────────────────────────────────

/** Convenience: build a source_ref node wrapping a name node. */
function sourceRef(nameNode, extraChildren = []) {
  return n("source_ref", [nameNode, ...extraChildren]);
}

describe("extractMappings", () => {
  it("extracts a named mapping with source and target", () => {
    const srcEntry = sourceRef(n("backtick_name", [], "`legacy_sqlserver`"));
    const tgtEntry = sourceRef(n("backtick_name", [], "`postgres_db`"));
    const srcBlock = n("source_block", [srcEntry]);
    const tgtBlock = n("target_block", [tgtEntry]);
    const body = n("mapping_body", [srcBlock, tgtBlock]);
    const block = n("mapping_block", [blockLabel("'customer migration'"), body], "", 20);
    const root = n("source_file", [block]);

    const result = extractMappings(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "customer migration");
    assert.deepEqual(result[0].sources, ["legacy_sqlserver"]);
    assert.deepEqual(result[0].targets, ["postgres_db"]);
    assert.equal(result[0].row, 20);
  });

  it("handles anonymous mapping (no name)", () => {
    const srcBlock = n("source_block", [sourceRef(n("identifier", [], "src"))]);
    const tgtBlock = n("target_block", [sourceRef(n("identifier", [], "tgt"))]);
    const body = n("mapping_body", [srcBlock, tgtBlock]);
    const block = n("mapping_block", [body]);
    const root = n("source_file", [block]);

    const result = extractMappings(root);
    assert.equal(result[0].name, null);
  });

  it("counts arrows", () => {
    const arrow1 = n("map_arrow", []);
    const arrow2 = n("computed_arrow", []);
    const srcBlock = n("source_block", [sourceRef(n("identifier", [], "s"))]);
    const tgtBlock = n("target_block", [sourceRef(n("identifier", [], "t"))]);
    const body = n("mapping_body", [srcBlock, tgtBlock, arrow1, arrow2]);
    const block = n("mapping_block", [blockLabel("m"), body]);
    const root = n("source_file", [block]);

    assert.equal(extractMappings(root)[0].arrowCount, 2);
  });

  it("strips backticks from source and target names", () => {
    const srcEntry = sourceRef(n("backtick_name", [], "`my_source`"));
    const tgtEntry = sourceRef(n("backtick_name", [], "`my_target`"));
    const srcBlock = n("source_block", [srcEntry]);
    const tgtBlock = n("target_block", [tgtEntry]);
    const body = n("mapping_body", [srcBlock, tgtBlock]);
    const block = n("mapping_block", [blockLabel("m"), body]);
    const root = n("source_file", [block]);

    const result = extractMappings(root);
    assert.deepEqual(result[0].sources, ["my_source"]);
    assert.deepEqual(result[0].targets, ["my_target"]);
  });

  it("excludes NL join descriptions from sources", () => {
    const src1 = sourceRef(n("backtick_name", [], "`crm_customers`"));
    const src2 = sourceRef(n("backtick_name", [], "`order_transactions`"));
    const joinDesc = sourceRef(n("nl_string", [], '"Join crm_customers to order_transactions on customer_id"'));
    const srcBlock = n("source_block", [src1, src2, joinDesc]);
    const tgtBlock = n("target_block", [sourceRef(n("backtick_name", [], "`target_schema`"))]);
    const body = n("mapping_body", [srcBlock, tgtBlock]);
    const block = n("mapping_block", [blockLabel("m"), body]);
    const root = n("source_file", [block]);

    const result = extractMappings(root);
    assert.deepEqual(result[0].sources, ["crm_customers", "order_transactions"]);
  });

  it("ignores filter metadata on annotated source entries", () => {
    const meta = n("metadata_block", [], '(filter "status = active")');
    const srcEntry = sourceRef(n("backtick_name", [], "`my_table`"), [meta]);
    const srcBlock = n("source_block", [srcEntry]);
    const tgtBlock = n("target_block", [sourceRef(n("identifier", [], "tgt"))]);
    const body = n("mapping_body", [srcBlock, tgtBlock]);
    const block = n("mapping_block", [blockLabel("m"), body]);
    const root = n("source_file", [block]);

    const result = extractMappings(root);
    assert.deepEqual(result[0].sources, ["my_table"]);
  });
});

// ── extractMetrics ────────────────────────────────────────────────────────────

describe("extractMetrics", () => {
  it("extracts a metric with fields", () => {
    const kvKey = n("kv_key", [], "grain");
    const kvVal = n("identifier", [], "monthly");
    const kv = n("key_value_pair", [kvKey, kvVal]);
    const meta = n("metadata_block", [kv]);
    const body = n("metric_body", [fieldDecl("value", "DECIMAL(14,2)")]);
    const block = n("metric_block", [blockLabel("mrr"), meta, body], "", 7);
    const root = n("source_file", [block]);

    const result = extractMetrics(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "mrr");
    assert.equal(result[0].grain, "monthly");
    assert.equal(result[0].row, 7);
    assert.equal(result[0].fields.length, 1);
    assert.equal(result[0].fields[0].name, "value");
  });
});

// ── extractWarnings ───────────────────────────────────────────────────────────

describe("extractWarnings", () => {
  it("extracts warning_comment text and row", () => {
    const w = n("warning_comment", [], "//! some records have NULL", 12);
    const root = n("source_file", [w]);

    const result = extractWarnings(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, "some records have NULL");
    assert.equal(result[0].row, 12);
  });

  it("extracts warnings nested inside other nodes", () => {
    const w = n("warning_comment", [], "//! nested warning", 5);
    const field = n("field_decl", [w]);
    const body = n("schema_body", [field]);
    const block = n("schema_block", [blockLabel("t"), body]);
    const root = n("source_file", [block]);

    assert.equal(extractWarnings(root).length, 1);
  });

  it("strips //! prefix", () => {
    const w = n("warning_comment", [], "//!no space after bang", 0);
    const root = n("source_file", [w]);
    assert.equal(extractWarnings(root)[0].text, "no space after bang");
  });
});

// ── extractQuestions ──────────────────────────────────────────────────────────

describe("extractQuestions", () => {
  it("extracts question_comment text and row", () => {
    const q = n("question_comment", [], "//? is this field PII?", 8);
    const root = n("source_file", [q]);

    const result = extractQuestions(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, "is this field PII?");
    assert.equal(result[0].row, 8);
  });

  it("returns empty when no question comments", () => {
    assert.deepEqual(extractQuestions(n("source_file", [])), []);
  });
});

// ── Namespace extraction ──────────────────────────────────────────────────────

/** Build a namespace_block mock node. */
function namespaceBlock(name, childNodes = [], metaNode = null, row = 0) {
  const kids = [ident(name), ...(metaNode ? [metaNode] : []), ...childNodes];
  return n("namespace_block", kids, "", row);
}

describe("extractNamespaces", () => {
  it("extracts namespace names and rows", () => {
    const ns = namespaceBlock("pos", [], null, 5);
    const root = n("source_file", [ns]);
    const result = extractNamespaces(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "pos");
    assert.equal(result[0].row, 5);
    assert.equal(result[0].note, null);
  });

  it("extracts namespace note from metadata", () => {
    const noteTag = n("note_tag", [str("POS system")]);
    const meta = n("metadata_block", [noteTag]);
    const ns = namespaceBlock("pos", [], meta, 0);
    const root = n("source_file", [ns]);
    const result = extractNamespaces(root);
    assert.equal(result[0].note, "POS system");
  });

  it("extracts multiple namespaces", () => {
    const root = n("source_file", [
      namespaceBlock("pos"),
      namespaceBlock("ecom"),
    ]);
    assert.equal(extractNamespaces(root).length, 2);
  });
});

describe("extractSchemas with namespaces", () => {
  it("sets namespace=null for top-level schemas", () => {
    const body = n("schema_body", [fieldDecl("id", "INT")]);
    const block = n("schema_block", [blockLabel("orders"), body]);
    const root = n("source_file", [block]);
    const result = extractSchemas(root);
    assert.equal(result[0].namespace, null);
  });

  it("extracts schemas inside namespace blocks with namespace field", () => {
    const body = n("schema_body", [fieldDecl("STORE_ID", "VARCHAR(20)")]);
    const schemaNode = n("schema_block", [blockLabel("stores"), body], "", 3);
    const ns = namespaceBlock("pos", [schemaNode], null, 0);
    const root = n("source_file", [ns]);

    const result = extractSchemas(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "stores");
    assert.equal(result[0].namespace, "pos");
    assert.equal(result[0].fields[0].name, "STORE_ID");
  });

  it("extracts both global and namespaced schemas", () => {
    const globalSchema = n("schema_block", [blockLabel("dim_date"), n("schema_body", [])]);
    const nsSchema = n("schema_block", [blockLabel("stores"), n("schema_body", [])], "", 5);
    const ns = namespaceBlock("pos", [nsSchema]);
    const root = n("source_file", [globalSchema, ns]);

    const result = extractSchemas(root);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, "dim_date");
    assert.equal(result[0].namespace, null);
    assert.equal(result[1].name, "stores");
    assert.equal(result[1].namespace, "pos");
  });
});

describe("extractMappings with namespaces", () => {
  it("extracts namespaced mapping with qualified source ref", () => {
    const qualName = n("qualified_name", [ident("pos"), ident("stores")], "pos::stores");
    const srcEntry = sourceRef(qualName);
    const tgtEntry = sourceRef(n("identifier", [], "hub_store"));
    const srcBlock = n("source_block", [srcEntry]);
    const tgtBlock = n("target_block", [tgtEntry]);
    const body = n("mapping_body", [srcBlock, tgtBlock]);
    const block = n("mapping_block", [blockLabel("load"), body], "", 10);
    const ns = namespaceBlock("vault", [block]);
    const root = n("source_file", [ns]);

    const result = extractMappings(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].namespace, "vault");
    assert.deepEqual(result[0].sources, ["pos::stores"]);
    assert.deepEqual(result[0].targets, ["vault::hub_store"]);
  });
});

describe("extractFragments with namespaces", () => {
  it("extracts namespaced fragments", () => {
    const body = n("schema_body", [fieldDecl("load_ts", "TIMESTAMP")]);
    const frag = n("fragment_block", [blockLabel("audit_cols"), body], "", 2);
    const ns = namespaceBlock("shared", [frag]);
    const root = n("source_file", [ns]);

    const result = extractFragments(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "audit_cols");
    assert.equal(result[0].namespace, "shared");
  });
});

describe("extractTransforms with namespaces", () => {
  it("extracts namespaced transforms", () => {
    const block = n("transform_block", [blockLabel("dv_hash")], "", 4);
    const ns = namespaceBlock("vault", [block]);
    const root = n("source_file", [ns]);

    const result = extractTransforms(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "dv_hash");
    assert.equal(result[0].namespace, "vault");
  });
});

// ── extractImports ──────────────────────────────────────────────────────────

describe("extractImports", () => {
  /** Build a qualified_name node (ns::name). */
  function qualifiedName(ns, name) {
    return n("qualified_name", [ident(ns), ident(name)], `${ns}::${name}`);
  }

  it("extracts a single bare identifier import", () => {
    const imp = n("import_decl", [
      n("import_name", [ident("address_fields")]),
      n("import_path", [str("common.stm")]),
    ], "", 0);
    const root = n("source_file", [imp]);

    const result = extractImports(root);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0].names, ["address_fields"]);
    assert.equal(result[0].path, "common.stm");
  });

  it("extracts qualified name imports (ns::name)", () => {
    const imp = n("import_decl", [
      n("import_name", [qualifiedName("src", "customers")]),
      n("import_name", [qualifiedName("mart", "dim_customers")]),
      n("import_path", [str("source.stm")]),
    ], "", 2);
    const root = n("source_file", [imp]);

    const result = extractImports(root);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0].names, ["src::customers", "mart::dim_customers"]);
    assert.equal(result[0].path, "source.stm");
    assert.equal(result[0].row, 2);
  });

  it("extracts quoted name imports", () => {
    const imp = n("import_decl", [
      n("import_name", [quoted("address fields")]),
      n("import_name", [quoted("audit fields")]),
      n("import_path", [str("lib/common.stm")]),
    ]);
    const root = n("source_file", [imp]);

    const result = extractImports(root);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0].names, ["address fields", "audit fields"]);
    assert.equal(result[0].path, "lib/common.stm");
  });

  it("extracts multiple import declarations", () => {
    const imp1 = n("import_decl", [
      n("import_name", [ident("foo")]),
      n("import_path", [str("a.stm")]),
    ], "", 0);
    const imp2 = n("import_decl", [
      n("import_name", [ident("bar")]),
      n("import_path", [str("b.stm")]),
    ], "", 1);
    const root = n("source_file", [imp1, imp2]);

    const result = extractImports(root);
    assert.equal(result.length, 2);
    assert.equal(result[0].path, "a.stm");
    assert.equal(result[1].path, "b.stm");
  });

  it("returns empty array when no imports", () => {
    const root = n("source_file", []);
    const result = extractImports(root);
    assert.equal(result.length, 0);
  });
});
