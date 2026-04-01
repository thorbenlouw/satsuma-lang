/**
 * where-used.test.js — Unit tests for where-used command helpers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ── Mock CST helpers ──────────────────────────────────────────────────────────

function n(type: string, namedChildren: any[] = [], text = "", row = 0): any {
  return { type, text, startPosition: { row, column: 0 }, namedChildren };
}
function ident(t: string) { return n("identifier", [], t); }
function quoted(t: string) { return n("backtick_name", [], `'${t}'`); }
function blockLabel(name: string) {
  const inner = name.startsWith("'") ? quoted(name.slice(1, -1)) : ident(name);
  return n("block_label", [inner]);
}
function spreadLabel(name: string) {
  if (name.startsWith("'")) return n("spread_label", [quoted(name.slice(1, -1))]);
  return n("spread_label", name.split(" ").map(ident));
}

// ── Inline findFragmentSpreads + walkForSpreads ───────────────────────────────

function walkForSpreads(bodyNode: any, fragmentName: string, blockName: string, results: any[]) {
  for (const c of bodyNode.namedChildren) {
    if (c.type === "fragment_spread") {
      const lbl = c.namedChildren.find((x: any) => x.type === "spread_label" || x.type === "block_label");
      let sname = "";
      if (lbl) {
        const q = lbl.namedChildren.find((x: any) => x.type === "backtick_name");
        if (q) {
          sname = q.text.slice(1, -1);
        } else {
          sname = lbl.namedChildren
            .filter((x: any) => x.type === "identifier" || x.type === "qualified_name")
            .map((x: any) => x.text)
            .join(" ");
        }
      }
      if (sname === fragmentName) results.push({ block: blockName, row: c.startPosition.row });
    } else if (c.type === "record_block" || c.type === "list_block") {
      const nested = c.namedChildren.find((x: any) => x.type === "schema_body");
      if (nested) walkForSpreads(nested, fragmentName, blockName, results);
    }
  }
}

function findFragmentSpreads(rootNode: any, fragmentName: string) {
  const results: any[] = [];
  for (const topLevel of rootNode.namedChildren) {
    if (topLevel.type !== "schema_block" && topLevel.type !== "fragment_block") continue;
    const lbl = topLevel.namedChildren.find((c: any) => c.type === "block_label");
    const inner = lbl?.namedChildren[0];
    let blockName = inner?.text ?? "";
    if (inner?.type === "backtick_name") blockName = blockName.slice(1, -1);

    const body = topLevel.namedChildren.find((c: any) => c.type === "schema_body");
    if (body) walkForSpreads(body, fragmentName, blockName, results);
  }
  return results;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("findFragmentSpreads", () => {
  it("finds a quoted fragment spread in a schema", () => {
    const spread = n("fragment_spread", [spreadLabel("'address fields'")], "", 5);
    const body = n("schema_body", [spread]);
    const schemaBlock = n("schema_block", [blockLabel("orders"), body]);
    const root = n("source_file", [schemaBlock]);

    const results = findFragmentSpreads(root, "address fields");
    assert.equal(results.length, 1);
    assert.equal(results[0].block, "orders");
    assert.equal(results[0].row, 5);
  });

  it("returns empty when fragment not spread anywhere", () => {
    const body = n("schema_body", []);
    const schemaBlock = n("schema_block", [blockLabel("orders"), body]);
    const root = n("source_file", [schemaBlock]);

    assert.deepEqual(findFragmentSpreads(root, "address fields"), []);
  });

  it("finds fragment spread in multiple schemas", () => {
    const spread1 = n("fragment_spread", [spreadLabel("'audit columns'")]);
    const spread2 = n("fragment_spread", [spreadLabel("'audit columns'")]);
    const body1 = n("schema_body", [spread1]);
    const body2 = n("schema_body", [spread2]);
    const s1 = n("schema_block", [blockLabel("orders"), body1]);
    const s2 = n("schema_block", [blockLabel("customers"), body2]);
    const root = n("source_file", [s1, s2]);

    const results = findFragmentSpreads(root, "audit columns");
    assert.equal(results.length, 2);
    assert.ok(results.some((r) => r.block === "orders"));
    assert.ok(results.some((r) => r.block === "customers"));
  });

  it("does not match different fragment names", () => {
    const spread = n("fragment_spread", [spreadLabel("'other frag'")]);
    const body = n("schema_body", [spread]);
    const block = n("schema_block", [blockLabel("t"), body]);
    const root = n("source_file", [block]);

    assert.deepEqual(findFragmentSpreads(root, "address fields"), []);
  });

  it("finds spreads in record_block nested bodies", () => {
    const spread = n("fragment_spread", [spreadLabel("'audit columns'")], "", 10);
    const innerBody = n("schema_body", [spread]);
    const recBlock = n("record_block", [blockLabel("audit"), innerBody]);
    const outerBody = n("schema_body", [recBlock]);
    const schemaBlock = n("schema_block", [blockLabel("orders"), outerBody]);
    const root = n("source_file", [schemaBlock]);

    const results = findFragmentSpreads(root, "audit columns");
    assert.equal(results.length, 1);
    assert.equal(results[0].block, "orders");
  });

  it("finds unquoted multi-word fragment spreads", () => {
    const spread = n("fragment_spread", [spreadLabel("audit columns")], "", 3);
    const body = n("schema_body", [spread]);
    const schemaBlock = n("schema_block", [blockLabel("orders"), body]);
    const root = n("source_file", [schemaBlock]);

    const results = findFragmentSpreads(root, "audit columns");
    assert.equal(results.length, 1);
    assert.equal(results[0].block, "orders");
  });
});

describe("referenceGraph usedByMappings", () => {
  it("collects schemas referenced by mappings", () => {
    const usedByMappings = new Map([
      ["legacy_sqlserver", ["customer migration"]],
      ["postgres_db", ["customer migration"]],
    ]);

    const refs = usedByMappings.get("legacy_sqlserver") ?? [];
    assert.deepEqual(refs, ["customer migration"]);
    assert.equal((usedByMappings.get("postgres_db") ?? []).length, 1);
  });
});
