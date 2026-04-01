/**
 * extract.test.js — Unit tests for src/extract.js
 *
 * Tests use lightweight mock CST nodes that mirror the tree-sitter node
 * structure (type, text, namedChildren, startPosition) so no native binary
 * is required.
 */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
} from "@satsuma/core";
import { MockNode, mockNode as n } from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = resolve(__dirname, "../../../examples");

// ── Mock helpers ─────────────────────────────────────────────────────────────

/** Convenience: build an identifier node. */
function ident(text: string, row = 0): MockNode {
  return n("identifier", [], text, row);
}

/** Convenience: build a backtick_name node. */
function quoted(inner: string, row = 0): MockNode {
  return n("backtick_name", [], `'${inner}'`, row);
}

/** Convenience: build an nl_string node. */
function str(inner: string): MockNode {
  return n("nl_string", [], `"${inner}"`);
}

/** Convenience: build a block_label node (identifier child). */
function blockLabel(name: string): MockNode {
  const inner = name.startsWith("'") ? quoted(name.slice(1, -1)) : ident(name);
  return n("block_label", [inner]);
}

/** Convenience: build a type_expr node. */
function typeExpr(text: string): MockNode {
  return n("type_expr", [], text);
}

/** Convenience: build a field_name node wrapping an identifier. */
function fieldName(name: string): MockNode {
  return n("field_name", [ident(name)]);
}

/** Convenience: build a field_decl node. */
function fieldDecl(name: string, type: string, row = 0): MockNode {
  return n("field_decl", [fieldName(name), typeExpr(type)], "", row);
}

/** Build a record field_decl: name record (metadata)? { schema_body } */
function recordFieldDecl(name: string, bodyChildren: MockNode[] = [], metaNode: MockNode | null = null): MockNode {
  const named: MockNode[] = [fieldName(name)];
  if (metaNode) named.push(metaNode);
  if (bodyChildren.length > 0) named.push(n("schema_body", bodyChildren));
  return n("field_decl", named, "", 0, ["record"]);
}

/** Build a list_of record field_decl: name list_of record (metadata)? { schema_body } */
function _listOfRecordFieldDecl(name: string, bodyChildren: MockNode[] = [], metaNode: MockNode | null = null): MockNode {
  const named: MockNode[] = [fieldName(name)];
  if (metaNode) named.push(metaNode);
  if (bodyChildren.length > 0) named.push(n("schema_body", bodyChildren));
  return n("field_decl", named, "", 0, ["list_of", "record"]);
}

// ── extractSchemas ────────────────────────────────────────────────────────────

describe("extractSchemas", () => {
  it("extracts a simple schema with identifier name", () => {
    const noteTag = n("note_tag", [str("A note")]);
    const meta = n("metadata_block", [noteTag]);
    const body = n("schema_body", [fieldDecl("id", "INT"), fieldDecl("name", "VARCHAR(100)")]);
    const block = n("schema_block", [blockLabel("orders"), meta, body], "", 5);
    const root = n("source_file", [block]);

    const result = extractSchemas(root as any);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "orders");
    assert.equal(result[0].note, "A note");
    assert.equal(result[0].row, 5);
    assert.deepEqual(result[0].fields, [
      { name: "id", type: "INT", startRow: 0, startColumn: 0 },
      { name: "name", type: "VARCHAR(100)", startRow: 0, startColumn: 0 },
    ]);
  });

  it("extracts a schema with quoted name", () => {
    const body = n("schema_body", []);
    const block = n("schema_block", [blockLabel("'my schema'"), body]);
    const root = n("source_file", [block]);

    const result = extractSchemas(root as any);
    assert.equal(result[0].name, "my schema");
  });

  it("returns note=null when no metadata", () => {
    const body = n("schema_body", []);
    const block = n("schema_block", [blockLabel("t"), body]);
    const root = n("source_file", [block]);

    assert.equal(extractSchemas(root as any)[0].note, null);
  });

  it("returns empty array when no schemas", () => {
    const root = n("source_file", []);
    assert.deepEqual(extractSchemas(root as any), []);
  });

  it("extracts multiple schemas", () => {
    const makeBlock = (name: string) =>
      n("schema_block", [blockLabel(name), n("schema_body", [])]);
    const root = n("source_file", [makeBlock("a"), makeBlock("b"), makeBlock("c")]);
    assert.equal(extractSchemas(root as any).length, 3);
  });
});

// ── FieldDecl metadata enrichment (sl-cdvp) ──────────────────────────────────

describe("FieldDecl metadata enrichment", () => {
  it("extracts pk tag from field metadata", () => {
    const metaBlock = n("metadata_block", [n("tag_token", [], "pk")]);
    const fd = n("field_decl", [fieldName("id"), typeExpr("INT"), metaBlock]);
    const body = n("schema_body", [fd]);
    const block = n("schema_block", [blockLabel("test"), body]);
    const root = n("source_file", [block]);
    const result = extractSchemas(root as any);
    assert.equal(result[0].fields[0].metadata!.length, 1);
    assert.deepEqual(result[0].fields[0].metadata![0], { kind: "tag", tag: "pk" });
  });

  it("extracts ref key-value from field metadata", () => {
    const kvVal = n("value_text", [n("dotted_name", [], "dim_customer.customer_id")], "dim_customer.customer_id");
    const kvPair = n("tag_with_value", [ident("ref"), kvVal]);
    const metaBlock = n("metadata_block", [kvPair]);
    const fd = n("field_decl", [fieldName("customer_id"), typeExpr("STRING(36)"), metaBlock]);
    const body = n("schema_body", [fd]);
    const block = n("schema_block", [blockLabel("test"), body]);
    const root = n("source_file", [block]);
    const result = extractSchemas(root as any);
    assert.equal(result[0].fields[0].metadata!.length, 1);
    assert.deepEqual(result[0].fields[0].metadata![0], { kind: "kv", key: "ref", value: "dim_customer.customer_id" });
  });

  it("extracts enum metadata from field", () => {
    const enumBody = n("enum_body", [ident("monthly"), ident("quarterly"), ident("annual")]);
    const metaBlock = n("metadata_block", [enumBody]);
    const fd = n("field_decl", [fieldName("period"), typeExpr("STRING(10)"), metaBlock]);
    const body = n("schema_body", [fd]);
    const block = n("schema_block", [blockLabel("test"), body]);
    const root = n("source_file", [block]);
    const result = extractSchemas(root as any);
    assert.equal(result[0].fields[0].metadata!.length, 1);
    assert.deepEqual(result[0].fields[0].metadata![0], { kind: "enum", values: ["monthly", "quarterly", "annual"] });
  });

  it("omits metadata when field has no metadata_block", () => {
    const fd = n("field_decl", [fieldName("name"), typeExpr("VARCHAR(100)")]);
    const body = n("schema_body", [fd]);
    const block = n("schema_block", [blockLabel("test"), body]);
    const root = n("source_file", [block]);
    const result = extractSchemas(root as any);
    assert.equal(result[0].fields[0].metadata, undefined);
  });

  it("extracts metadata from record field children", () => {
    const metaBlock = n("metadata_block", [n("tag_token", [], "required")]);
    const innerFd = n("field_decl", [fieldName("street"), typeExpr("VARCHAR(200)"), metaBlock]);
    const recField = recordFieldDecl("address", [innerFd]);
    const body = n("schema_body", [recField]);
    const block = n("schema_block", [blockLabel("test"), body]);
    const root = n("source_file", [block]);
    const result = extractSchemas(root as any);
    const rec = result[0].fields[0];
    assert.equal(rec.name, "address");
    assert.equal(rec.children![0].metadata!.length, 1);
    assert.deepEqual(rec.children![0].metadata![0], { kind: "tag", tag: "required" });
  });

  it("extracts metadata on record field itself", () => {
    const blockMeta = n("metadata_block", [n("tag_token", [], "required")]);
    const innerFd = n("field_decl", [fieldName("id"), typeExpr("INT")]);
    const recField = recordFieldDecl("address", [innerFd], blockMeta);
    const body = n("schema_body", [recField]);
    const block = n("schema_block", [blockLabel("test"), body]);
    const root = n("source_file", [block]);
    const result = extractSchemas(root as any);
    const rec = result[0].fields[0];
    assert.equal(rec.metadata!.length, 1);
    assert.deepEqual(rec.metadata![0], { kind: "tag", tag: "required" });
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

    const result = extractFragments(root as any);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "address fields");
    assert.equal(result[0].row, 3);
    assert.equal(result[0].fields.length, 2);
  });

  it("returns empty array when no fragments", () => {
    assert.deepEqual(extractFragments(n("source_file", []) as any), []);
  });
});

// ── extractTransforms ─────────────────────────────────────────────────────────

describe("extractTransforms", () => {
  it("extracts transform name and row", () => {
    const block = n("transform_block", [blockLabel("normalize_phone")], "", 10);
    const root = n("source_file", [block]);

    const result = extractTransforms(root as any);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "normalize_phone");
    assert.equal(result[0].row, 10);
  });

  it("returns empty array when no transforms", () => {
    assert.deepEqual(extractTransforms(n("source_file", []) as any), []);
  });
});

// ── extractMappings ───────────────────────────────────────────────────────────

/** Convenience: build a source_ref node wrapping a name node. */
function sourceRef(nameNode: MockNode, extraChildren: MockNode[] = []): MockNode {
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

    const result = extractMappings(root as any);
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

    const result = extractMappings(root as any);
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

    assert.equal(extractMappings(root as any)[0].arrowCount, 2);
  });

  it("strips backticks from source and target names", () => {
    const srcEntry = sourceRef(n("backtick_name", [], "`my_source`"));
    const tgtEntry = sourceRef(n("backtick_name", [], "`my_target`"));
    const srcBlock = n("source_block", [srcEntry]);
    const tgtBlock = n("target_block", [tgtEntry]);
    const body = n("mapping_body", [srcBlock, tgtBlock]);
    const block = n("mapping_block", [blockLabel("m"), body]);
    const root = n("source_file", [block]);

    const result = extractMappings(root as any);
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

    const result = extractMappings(root as any);
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

    const result = extractMappings(root as any);
    assert.deepEqual(result[0].sources, ["my_table"]);
  });

  it("does not include comment nodes as source or target references (sl-bi92)", () => {
    // Tree-sitter extras (comments) appear as named children inside source/target
    // blocks. They must be silently skipped — not treated as schema references.
    const comment = n("comment", [], "// this is a comment");
    const warnComment = n("warning_comment", [], "//! warning comment");
    const srcEntry = sourceRef(n("identifier", [], "s"));
    const srcBlock = n("source_block", [comment, srcEntry, warnComment]);
    const tgtBlock = n("target_block", [sourceRef(n("identifier", [], "t"))]);
    const body = n("mapping_body", [srcBlock, tgtBlock]);
    const block = n("mapping_block", [body]);
    const root = n("source_file", [block]);

    const result = extractMappings(root as any);
    assert.deepEqual(result[0].sources, ["s"], "only schema ref, not comment text");
    assert.deepEqual(result[0].targets, ["t"]);
  });
});

// ── extractMetrics ────────────────────────────────────────────────────────────

describe("extractMetrics", () => {
  it("extracts a metric with fields", () => {
    const kvVal = n("value_text", [n("identifier", [], "monthly")], "monthly");
    const kv = n("tag_with_value", [ident("grain"), kvVal]);
    const meta = n("metadata_block", [kv]);
    const body = n("metric_body", [fieldDecl("value", "DECIMAL(14,2)")]);
    const block = n("metric_block", [blockLabel("mrr"), meta, body], "", 7);
    const root = n("source_file", [block]);

    const result = extractMetrics(root as any);
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

    const result = extractWarnings(root as any);
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

    assert.equal(extractWarnings(root as any).length, 1);
  });

  it("strips //! prefix", () => {
    const w = n("warning_comment", [], "//!no space after bang", 0);
    const root = n("source_file", [w]);
    assert.equal(extractWarnings(root as any)[0].text, "no space after bang");
  });
});

// ── extractQuestions ──────────────────────────────────────────────────────────

describe("extractQuestions", () => {
  it("extracts question_comment text and row", () => {
    const q = n("question_comment", [], "//? is this field PII?", 8);
    const root = n("source_file", [q]);

    const result = extractQuestions(root as any);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, "is this field PII?");
    assert.equal(result[0].row, 8);
  });

  it("returns empty when no question comments", () => {
    assert.deepEqual(extractQuestions(n("source_file", []) as any), []);
  });
});

// ── Namespace extraction ──────────────────────────────────────────────────────

/** Build a namespace_block mock node. */
function namespaceBlock(name: string, childNodes: MockNode[] = [], metaNode: MockNode | null = null, row = 0): MockNode {
  const kids: MockNode[] = [ident(name), ...(metaNode ? [metaNode] : []), ...childNodes];
  return n("namespace_block", kids, "", row);
}

describe("extractNamespaces", () => {
  it("extracts namespace names and rows", () => {
    const ns = namespaceBlock("pos", [], null, 5);
    const root = n("source_file", [ns]);
    const result = extractNamespaces(root as any);
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
    const result = extractNamespaces(root as any);
    assert.equal(result[0].note, "POS system");
  });

  it("extracts multiple namespaces", () => {
    const root = n("source_file", [
      namespaceBlock("pos"),
      namespaceBlock("ecom"),
    ]);
    assert.equal(extractNamespaces(root as any).length, 2);
  });
});

describe("extractSchemas with namespaces", () => {
  it("sets namespace=null for top-level schemas", () => {
    const body = n("schema_body", [fieldDecl("id", "INT")]);
    const block = n("schema_block", [blockLabel("orders"), body]);
    const root = n("source_file", [block]);
    const result = extractSchemas(root as any);
    assert.equal(result[0].namespace, null);
  });

  it("extracts schemas inside namespace blocks with namespace field", () => {
    const body = n("schema_body", [fieldDecl("STORE_ID", "VARCHAR(20)")]);
    const schemaNode = n("schema_block", [blockLabel("stores"), body], "", 3);
    const ns = namespaceBlock("pos", [schemaNode], null, 0);
    const root = n("source_file", [ns]);

    const result = extractSchemas(root as any);
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

    const result = extractSchemas(root as any);
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

    const result = extractMappings(root as any);
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

    const result = extractFragments(root as any);
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

    const result = extractTransforms(root as any);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "dv_hash");
    assert.equal(result[0].namespace, "vault");
  });
});

// ── extractImports ──────────────────────────────────────────────────────────

describe("extractImports", () => {
  /** Build a qualified_name node (ns::name). */
  function qualifiedName(ns: string, name: string): MockNode {
    return n("qualified_name", [ident(ns), ident(name)], `${ns}::${name}`);
  }

  it("extracts a single bare identifier import", () => {
    const imp = n("import_decl", [
      n("import_name", [ident("address_fields")]),
      n("import_path", [str("common.stm")]),
    ], "", 0);
    const root = n("source_file", [imp]);

    const result = extractImports(root as any);
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

    const result = extractImports(root as any);
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

    const result = extractImports(root as any);
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

    const result = extractImports(root as any);
    assert.equal(result.length, 2);
    assert.equal(result[0].path, "a.stm");
    assert.equal(result[1].path, "b.stm");
  });

  it("returns empty array when no imports", () => {
    const root = n("source_file", []);
    const result = extractImports(root as any);
    assert.equal(result.length, 0);
  });
});

// ── Real-file extraction tests (relocated from integration.test.ts) ─────────

describe("extraction against real files", () => {
  let parseFile: (filePath: string) => any;
  let extractFileData: (parsed: any) => any;
  let buildIndex: (data: any[]) => any;

  before(async () => {
    const parser = await import("#src/parser.js");
    parseFile = parser.parseFile;
    const ib = await import("#src/index-builder.js");
    extractFileData = ib.extractFileData;
    buildIndex = ib.buildIndex;
  });

  it("schema row is 0-indexed in extracted data, CLI converts to 1-indexed (sl-2usp)", () => {
    // The tree-sitter row is 0-indexed. CLI commands add +1 for human output.
    const parsed = parseFile(resolve(EXAMPLES, "lib/common.stm"));
    const data = extractFileData(parsed);
    const index = buildIndex([data]);
    const schema = index.schemas.get("country_codes");
    assert.ok(schema, "should find country_codes");
    assert.equal(schema.row, 3, "country_codes starts on row 3 (0-indexed) = line 4 (1-indexed)");
  });

  it("spread-expanded fieldCount includes direct + fragment fields (sl-vlsh)", async () => {
    // The summary command uses expandEntityFields to include spread fields.
    const { expandEntityFields } = await import("#src/spread-expand.js");
    const fixture = resolve(__dirname, "fixtures", "spread-fields-meta.stm");
    const parsed = parseFile(fixture);
    const data = extractFileData(parsed);
    const index = buildIndex([data]);
    const schema = index.schemas.get("with_spreads");
    assert.ok(schema, "should find with_spreads schema");
    const expanded = expandEntityFields(schema as any, schema.namespace ?? null, index);
    const totalCount = schema.fields.length + expanded.length;
    assert.equal(totalCount, 4, "should count 1 direct + 3 spread fields");
  });

  it("field metadata includes pk, ref, and enum entries (sl-rbvk)", () => {
    // Validates the metadata extraction pipeline for different metadata kinds.
    const parsed = parseFile(resolve(EXAMPLES, "sfdc-to-snowflake/pipeline.stm"));
    const data = extractFileData(parsed);
    const schemas = data.schemas;
    const opp = schemas.find((s: any) => s.name === "sfdc_opportunity");
    assert.ok(opp, "should find sfdc_opportunity schema");
    const idField = opp.fields.find((f: any) => f.name === "Id");
    assert.ok(idField.metadata, "Id field should have metadata");
    assert.deepEqual(idField.metadata[0], { kind: "tag", tag: "pk" });
    const accField = opp.fields.find((f: any) => f.name === "AccountId");
    assert.ok(accField.metadata, "AccountId should have metadata");
    assert.equal(accField.metadata[0].kind, "kv");
    assert.equal(accField.metadata[0].key, "ref");
    const stageField = opp.fields.find((f: any) => f.name === "StageName");
    assert.ok(stageField.metadata, "StageName should have metadata");
    const enumEntry = stageField.metadata.find((m: any) => m.kind === "enum");
    assert.ok(enumEntry, "StageName should have enum metadata");
    assert.ok(enumEntry.values.length > 0, "enum should have values");
  });
});
