/**
 * find.test.js — Unit tests for find command helpers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ── Mock CST helpers ──────────────────────────────────────────────────────────

function n(type: string, namedChildren: any[] = [], text = "", row = 0): any {
  return { type, text, startPosition: { row, column: 0 }, namedChildren };
}
function ident(t: string) { return n("identifier", [], t); }
function blockLabel(name: string) { return n("block_label", [ident(name)]); }
function fieldName(name: string) { return n("field_name", [ident(name)]); }
function typeExpr(t: string) { return n("type_expr", [], t); }

// ── Inline findTagInMeta ──────────────────────────────────────────────────────

function findTagInMeta(metaNode: any, tag: string) {
  for (const c of metaNode.namedChildren) {
    if (c.type === "tag_token" && c.text.toLowerCase() === tag) return c.text;
    if (c.type === "tag_with_value") {
      const key = c.namedChildren[0];
      if (key && key.text.toLowerCase() === tag) return key.text;
    }
    if (c.type === "enum_body" || c.type === "slice_body") {
      for (const id of c.namedChildren) {
        if (id.type === "identifier" && id.text.toLowerCase() === tag) return id.text;
      }
    }
  }
  return null;
}

// ── Inline collectFieldMatches ────────────────────────────────────────────────

function collectFieldMatches(bodyNode: any, blockType: string, blockName: string, file: string, tag: string, acc: any[] = []) {
  for (const c of bodyNode.namedChildren) {
    if (c.type === "field_decl") {
      const nameNode = c.namedChildren.find((x: any) => x.type === "field_name");
      const meta = c.namedChildren.find((x: any) => x.type === "metadata_block");
      const inner = nameNode?.namedChildren[0];
      let fname = inner?.text ?? "";
      if (inner?.type === "backtick_name") fname = fname.slice(1, -1);
      if (meta) {
        const matched = findTagInMeta(meta, tag);
        if (matched) acc.push({ blockType, block: blockName, field: fname, tag: matched, file, row: c.startPosition.row });
      }
    } else if (c.type === "record_block" || c.type === "list_block") {
      const nested = c.namedChildren.find((x: any) => x.type === "schema_body");
      const lbl = c.namedChildren.find((x: any) => x.type === "block_label");
      const inner = lbl?.namedChildren[0];
      let lname = inner?.text ?? "";
      if (inner?.type === "backtick_name") lname = lname.slice(1, -1);
      if (nested) collectFieldMatches(nested, blockType, `${blockName}.${lname}`, file, tag, acc);
    }
  }
  return acc;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("findTagInMeta", () => {
  it("finds a tag_token match", () => {
    const tag = n("tag_token", [], "pii");
    const meta = n("metadata_block", [tag]);
    assert.equal(findTagInMeta(meta, "pii"), "pii");
  });

  it("is case-insensitive", () => {
    const tag = n("tag_token", [], "PII");
    const meta = n("metadata_block", [tag]);
    assert.equal(findTagInMeta(meta, "pii"), "PII");
  });

  it("finds a tag_with_value key", () => {
    const key = n("identifier", [], "format");
    const val = n("value_text", [n("identifier", [], "email")], "email");
    const kv = n("tag_with_value", [key, val]);
    const meta = n("metadata_block", [kv]);
    assert.equal(findTagInMeta(meta, "format"), "format");
  });

  it("returns null when no match", () => {
    const tag = n("tag_token", [], "required");
    const meta = n("metadata_block", [tag]);
    assert.equal(findTagInMeta(meta, "pii"), null);
  });

  it("finds identifier inside enum_body", () => {
    const id = n("identifier", [], "pk");
    const enumBody = n("enum_body", [id]);
    const meta = n("metadata_block", [enumBody]);
    // pk inside enum_body doesn't match 'pk' via tag_token, but does via enum
    assert.equal(findTagInMeta(meta, "pk"), "pk");
  });
});

describe("collectFieldMatches", () => {
  it("matches fields with pii tag", () => {
    const piiTag = n("tag_token", [], "pii");
    const meta = n("metadata_block", [piiTag]);
    const fd = n("field_decl", [fieldName("email"), typeExpr("VARCHAR(255)"), meta], "", 5);
    const body = n("schema_body", [fd]);

    const matches = collectFieldMatches(body, "schema", "orders", "orders.stm", "pii");
    assert.equal(matches.length, 1);
    assert.equal(matches[0].field, "email");
    assert.equal(matches[0].row, 5);
  });

  it("ignores fields without matching tag", () => {
    const pkTag = n("tag_token", [], "pk");
    const meta = n("metadata_block", [pkTag]);
    const fd = n("field_decl", [fieldName("id"), typeExpr("INT"), meta]);
    const body = n("schema_body", [fd]);

    const matches = collectFieldMatches(body, "schema", "orders", "orders.stm", "pii");
    assert.equal(matches.length, 0);
  });

  it("descends into record_block", () => {
    const piiTag = n("tag_token", [], "pii");
    const meta = n("metadata_block", [piiTag]);
    const fd = n("field_decl", [fieldName("ssn"), typeExpr("VARCHAR(20)"), meta], "", 10);
    const innerBody = n("schema_body", [fd]);
    const recBlock = n("record_block", [blockLabel("personal"), innerBody]);
    const body = n("schema_body", [recBlock]);

    const matches = collectFieldMatches(body, "schema", "customer", "c.stm", "pii");
    assert.equal(matches.length, 1);
    assert.equal(matches[0].block, "customer.personal");
    assert.equal(matches[0].field, "ssn");
  });

  it("collects multiple matches", () => {
    const makeField = (name: string, tagText: string, row: number) => {
      const tag = n("tag_token", [], tagText);
      const meta = n("metadata_block", [tag]);
      return n("field_decl", [fieldName(name), typeExpr("TEXT"), meta], "", row);
    };
    const body = n("schema_body", [
      makeField("email", "pii", 1),
      makeField("phone", "pii", 2),
      makeField("id", "pk", 3),
    ]);

    const matches = collectFieldMatches(body, "schema", "user", "u.stm", "pii");
    assert.equal(matches.length, 2);
  });
});
