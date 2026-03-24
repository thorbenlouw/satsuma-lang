const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { initTestParser, parse } = require("./helper");
const { computeDefinition } = require("../dist/definition");
const { createWorkspaceIndex, indexFile } = require("../dist/workspace-index");

before(async () => { await initTestParser(); });

/** Build an index from { uri: source } and return { index, trees }. */
function buildIndex(files) {
  const idx = createWorkspaceIndex();
  const trees = {};
  for (const [uri, source] of Object.entries(files)) {
    const tree = parse(source);
    trees[uri] = tree;
    indexFile(idx, uri, tree);
  }
  return { index: idx, trees };
}

/** Shorthand: get definition result at a position in a given file. */
function definition(files, uri, line, col) {
  const { index, trees } = buildIndex(files);
  return computeDefinition(trees[uri], line, col, uri, index);
}

describe("computeDefinition", () => {
  it("returns null for empty files", () => {
    const result = definition({ "file:///a.stm": "" }, "file:///a.stm", 0, 0);
    assert.equal(result, null);
  });

  it("jumps from source ref to schema definition", () => {
    const result = definition(
      {
        "file:///a.stm": `schema customers {
  id UUID (pk)
  name VARCHAR
}
mapping 'test' {
  source { customers }
  target { dim }
  id -> id
}`,
      },
      "file:///a.stm",
      5,
      12, // cursor on "customers" in source { customers }
    );
    assert.ok(result);
    // Should point to the schema definition
    if (Array.isArray(result)) {
      assert.equal(result[0].uri, "file:///a.stm");
      assert.equal(result[0].range.start.line, 0); // schema is on line 0
    } else {
      assert.equal(result.uri, "file:///a.stm");
      assert.equal(result.range.start.line, 0);
    }
  });

  it("jumps from target ref to schema definition", () => {
    const result = definition(
      {
        "file:///a.stm": `schema dim {
  id UUID
}
mapping 'test' {
  source { src }
  target { dim }
  id -> id
}`,
      },
      "file:///a.stm",
      5,
      12, // cursor on "dim" in target { dim }
    );
    assert.ok(result);
    const loc = Array.isArray(result) ? result[0] : result;
    assert.equal(loc.range.start.line, 0);
  });

  it("jumps from fragment spread to fragment definition", () => {
    const result = definition(
      {
        "file:///a.stm": `fragment audit_fields {
  created_at TIMESTAMP
  updated_at TIMESTAMP
}
schema customers {
  id UUID
  ...audit_fields
}`,
      },
      "file:///a.stm",
      6,
      6, // cursor on "audit_fields" in ...audit_fields
    );
    assert.ok(result);
    const loc = Array.isArray(result) ? result[0] : result;
    assert.equal(loc.range.start.line, 0); // fragment on line 0
  });

  it("jumps to cross-file definition", () => {
    const result = definition(
      {
        "file:///a.stm": "schema customers {\n  id UUID\n}",
        "file:///b.stm": "mapping 'test' {\n  source { customers }\n  target { dim }\n  id -> id\n}",
      },
      "file:///b.stm",
      1,
      12, // cursor on "customers" in source block
    );
    assert.ok(result);
    const loc = Array.isArray(result) ? result[0] : result;
    assert.equal(loc.uri, "file:///a.stm");
    assert.equal(loc.range.start.line, 0);
  });

  it("jumps to namespaced definition", () => {
    const result = definition(
      {
        "file:///a.stm": `namespace crm {
  schema customers {
    id UUID
  }
}
mapping 'test' {
  source { crm::customers }
  target { dim }
  id -> id
}`,
      },
      "file:///a.stm",
      6,
      14, // cursor on "crm::customers" in source block
    );
    assert.ok(result);
    const loc = Array.isArray(result) ? result[0] : result;
    // Should point to the schema block_label inside namespace
    assert.equal(loc.range.start.line, 1);
  });

  it("jumps from block label to its own definition", () => {
    const result = definition(
      {
        "file:///a.stm": "schema customers {\n  id UUID\n}",
      },
      "file:///a.stm",
      0,
      8, // cursor on "customers" in block label
    );
    assert.ok(result);
    const loc = Array.isArray(result) ? result[0] : result;
    assert.equal(loc.uri, "file:///a.stm");
  });

  it("returns null for unresolvable reference", () => {
    const result = definition(
      {
        "file:///a.stm": "mapping 'test' {\n  source { nonexistent }\n  target { dim }\n  id -> id\n}",
      },
      "file:///a.stm",
      1,
      12,
    );
    assert.equal(result, null);
  });

  it("jumps from import name to definition", () => {
    const result = definition(
      {
        "file:///a.stm": "schema customers {\n  id UUID\n}",
        "file:///b.stm": 'import { customers } from "a.stm"',
      },
      "file:///b.stm",
      0,
      10, // cursor on "customers" in import
    );
    assert.ok(result);
    const loc = Array.isArray(result) ? result[0] : result;
    assert.equal(loc.uri, "file:///a.stm");
  });
});
