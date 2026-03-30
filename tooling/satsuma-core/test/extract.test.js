/**
 * extract.test.js — Unit tests for satsuma-core extract module
 *
 * These tests verify the core extraction API using lightweight mock CST nodes.
 * The full CLI test suite (satsuma-cli/test/extract.test.js and integration
 * tests) provides deeper coverage via the re-export shim.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractSchemas,
  extractMappings,
  extractFragments,
  extractImports,
  extractWarnings,
  extractQuestions,
  extractFieldTree,
} from "../dist/extract.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

function n(type, namedChildren = [], text = "", row = 0, anonymousChildren = [], column = 0) {
  const allChildren = [
    ...anonymousChildren.map(t => ({ type: t, text: t, isNamed: false, namedChildren: [], children: [] })),
    ...namedChildren.map(c => ({ ...c, isNamed: true })),
  ];
  return {
    type,
    text,
    isNamed: true,
    startPosition: { row, column },
    endPosition: { row, column: column + text.length },
    namedChildren,
    children: allChildren,
    parent: null,
    child: (i) => namedChildren[i] ?? null,
  };
}

function ident(text, row = 0) {
  return n("identifier", [], text, row);
}

function blockLabel(name) {
  return n("block_label", [n("identifier", [], name)]);
}

function schemaBody(fields = []) {
  return n("schema_body", fields);
}

function fieldDecl(name, type, row = 0, column = 0) {
  const nameNode = n("field_name", [ident(name)]);
  const typeNode = n("type_expr", [], type);
  return n("field_decl", [nameNode, typeNode], `${name} ${type}`, row, [], column);
}

// ── extractSchemas ────────────────────────────────────────────────────────────

describe("extractSchemas()", () => {
  it("extracts a basic schema with fields", () => {
    const fd = fieldDecl("id", "INT");
    const body = schemaBody([fd]);
    const schemaBlock = n("schema_block", [blockLabel("customers"), body]);
    const root = n("program", [schemaBlock]);

    const result = extractSchemas(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "customers");
    assert.equal(result[0].namespace, null);
    assert.equal(result[0].fields.length, 1);
    assert.equal(result[0].fields[0].name, "id");
  });

  it("returns empty array for empty root", () => {
    const root = n("program", []);
    assert.deepEqual(extractSchemas(root), []);
  });

  it("extracts schemas inside namespace blocks", () => {
    const body = schemaBody([fieldDecl("x", "INT")]);
    const schemaBlock = n("schema_block", [blockLabel("orders"), body]);
    const nsBlock = n("namespace_block", [ident("crm"), schemaBlock]);
    const root = n("program", [nsBlock]);

    const result = extractSchemas(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "orders");
    assert.equal(result[0].namespace, "crm");
  });
});

// ── extractMappings ───────────────────────────────────────────────────────────

describe("extractMappings()", () => {
  it("extracts a mapping with source and target", () => {
    const srcRef = n("source_ref", [ident("customers")], "customers");
    const srcBlock = n("source_block", [srcRef]);
    const tgtRef = n("source_ref", [ident("dim_customer")], "dim_customer");
    const tgtBlock = n("target_block", [tgtRef]);
    const body = n("mapping_body", [srcBlock, tgtBlock]);
    const mappingBlock = n("mapping_block", [blockLabel("crm_to_dw"), body]);
    const root = n("program", [mappingBlock]);

    const result = extractMappings(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "crm_to_dw");
    assert.deepEqual(result[0].sources, ["customers"]);
    assert.deepEqual(result[0].targets, ["dim_customer"]);
  });
});

// ── extractFragments ──────────────────────────────────────────────────────────

describe("extractFragments()", () => {
  it("extracts a fragment with fields", () => {
    const body = schemaBody([fieldDecl("created_at", "TIMESTAMP")]);
    const fragBlock = n("fragment_block", [blockLabel("audit_fields"), body]);
    const root = n("program", [fragBlock]);

    const result = extractFragments(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "audit_fields");
    assert.equal(result[0].fields.length, 1);
    assert.equal(result[0].fields[0].name, "created_at");
  });
});

// ── extractImports ────────────────────────────────────────────────────────────

describe("extractImports()", () => {
  it("extracts an import declaration", () => {
    const importName = n("import_name", [ident("customers")]);
    const strNode = n("nl_string", [], '"./platform.stm"');
    const pathNode = n("import_path", [strNode]);
    const importDecl = n("import_decl", [importName, pathNode]);
    const root = n("program", [importDecl]);

    const result = extractImports(root);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0].names, ["customers"]);
    assert.equal(result[0].path, "./platform.stm");
  });
});

// ── extractFieldTree ──────────────────────────────────────────────────────────

describe("extractFieldTree()", () => {
  it("extracts scalar fields", () => {
    const body = schemaBody([fieldDecl("id", "INT"), fieldDecl("name", "STRING")]);
    const result = extractFieldTree(body);
    assert.equal(result.fields.length, 2);
    assert.equal(result.fields[0].name, "id");
    assert.equal(result.fields[0].type, "INT");
    assert.equal(result.hasSpreads, false);
  });

  it("tracks fragment spreads", () => {
    const spreadLabel = n("spread_label", [ident("audit_fields")], "audit_fields");
    const fragSpread = n("fragment_spread", [spreadLabel]);
    const body = n("schema_body", [fieldDecl("id", "INT"), fragSpread]);
    const result = extractFieldTree(body);
    assert.equal(result.hasSpreads, true);
    assert.deepEqual(result.spreads, ["audit_fields"]);
  });
});

// ── Position data on FieldDecl ───────────────────────────────────────────────

describe("FieldDecl position data", () => {
  it("populates startRow and startColumn from the field_decl CST node", () => {
    const body = schemaBody([fieldDecl("id", "INT", 3, 4), fieldDecl("name", "STRING", 4, 4)]);
    const result = extractFieldTree(body);
    assert.equal(result.fields[0].startRow, 3);
    assert.equal(result.fields[0].startColumn, 4);
    assert.equal(result.fields[1].startRow, 4);
    assert.equal(result.fields[1].startColumn, 4);
  });

  it("defaults position to row 0 column 0 when mock uses defaults", () => {
    const body = schemaBody([fieldDecl("x", "INT")]);
    const result = extractFieldTree(body);
    assert.equal(result.fields[0].startRow, 0);
    assert.equal(result.fields[0].startColumn, 0);
  });
});

// ── startColumn on Extracted* types ─────────────────────────────────────────

describe("startColumn on Extracted types", () => {
  it("extractSchemas includes startColumn from the schema_block node", () => {
    const body = schemaBody([fieldDecl("id", "INT")]);
    const schemaBlock = n("schema_block", [blockLabel("orders"), body], "", 5, [], 2);
    const root = n("program", [schemaBlock]);

    const result = extractSchemas(root);
    assert.equal(result[0].row, 5);
    assert.equal(result[0].startColumn, 2);
  });

  it("extractFragments includes startColumn from the fragment_block node", () => {
    const body = schemaBody([fieldDecl("ts", "TIMESTAMP")]);
    const fragBlock = n("fragment_block", [blockLabel("audit"), body], "", 10, [], 4);
    const root = n("program", [fragBlock]);

    const result = extractFragments(root);
    assert.equal(result[0].row, 10);
    assert.equal(result[0].startColumn, 4);
  });

  it("extractMappings includes startColumn from the mapping_block node", () => {
    const srcRef = n("source_ref", [ident("src")], "src");
    const srcBlock = n("source_block", [srcRef]);
    const body = n("mapping_body", [srcBlock]);
    const mappingBlock = n("mapping_block", [blockLabel("m"), body], "", 7, [], 6);
    const root = n("program", [mappingBlock]);

    const result = extractMappings(root);
    assert.equal(result[0].row, 7);
    assert.equal(result[0].startColumn, 6);
  });

  it("extractWarnings includes startColumn from the warning_comment node", () => {
    const warning = n("warning_comment", [], "//! caution", 2, [], 8);
    warning.parent = null;
    const root = n("program", [warning]);
    const result = extractWarnings(root);
    assert.equal(result[0].row, 2);
    assert.equal(result[0].startColumn, 8);
  });

  it("extractQuestions includes startColumn from the question_comment node", () => {
    const question = n("question_comment", [], "//? why", 3, [], 4);
    question.parent = null;
    const root = n("program", [question]);
    const result = extractQuestions(root);
    assert.equal(result[0].row, 3);
    assert.equal(result[0].startColumn, 4);
  });

  it("extractImports includes startColumn from the import_decl node", () => {
    const importName = n("import_name", [ident("foo")]);
    const strNode = n("nl_string", [], '"./bar.stm"');
    const pathNode = n("import_path", [strNode]);
    const importDecl = n("import_decl", [importName, pathNode], "", 0, [], 0);
    const root = n("program", [importDecl]);

    const result = extractImports(root);
    assert.equal(result[0].startColumn, 0);
  });
});

// ── extractWarnings and extractQuestions ─────────────────────────────────────

describe("extractWarnings()", () => {
  it("extracts warning comments", () => {
    const warning = n("warning_comment", [], "//! watch out");
    warning.parent = null;
    const root = n("program", [warning]);
    const result = extractWarnings(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, "watch out");
  });
});

describe("extractQuestions()", () => {
  it("extracts question comments", () => {
    const question = n("question_comment", [], "//? is this right");
    question.parent = null;
    const root = n("program", [question]);
    const result = extractQuestions(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, "is this right");
  });
});
