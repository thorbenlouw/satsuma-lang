const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Parser = require("tree-sitter");
const Satsuma = require("tree-sitter-satsuma");
const { prepareRename, computeRename } = require("../dist/rename");
const { createWorkspaceIndex, indexFile } = require("../dist/workspace-index");

const parser = new Parser();
parser.setLanguage(Satsuma);

function parse(source) {
  return parser.parse(source);
}

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

describe("prepareRename", () => {
  it("returns range for schema block label", () => {
    const { index, trees } = buildIndex({
      "file:///a.stm": "schema customers {\n  id UUID\n}",
    });
    const result = prepareRename(
      trees["file:///a.stm"],
      0,
      8,
      "file:///a.stm",
      index,
    );
    assert.ok(result);
    assert.equal(result.placeholder, "customers");
  });

  it("returns range for source ref", () => {
    const { index, trees } = buildIndex({
      "file:///a.stm":
        "mapping 'test' {\n  source { customers }\n  target { dim }\n  id -> id\n}",
    });
    const result = prepareRename(
      trees["file:///a.stm"],
      1,
      12,
      "file:///a.stm",
      index,
    );
    assert.ok(result);
    assert.equal(result.placeholder, "customers");
  });

  it("returns null for non-renameable positions", () => {
    const { index, trees } = buildIndex({
      "file:///a.stm": "schema customers {\n  id UUID\n}",
    });
    // Cursor on "schema" keyword (not a renameable node)
    const result = prepareRename(
      trees["file:///a.stm"],
      0,
      2,
      "file:///a.stm",
      index,
    );
    assert.equal(result, null);
  });
});

describe("computeRename", () => {
  it("renames schema definition and all references", () => {
    const { index, trees } = buildIndex({
      "file:///a.stm": "schema customers {\n  id UUID\n}",
      "file:///b.stm":
        "mapping 'test' {\n  source { customers }\n  target { dim }\n  id -> id\n}",
    });
    const edit = computeRename(
      trees["file:///a.stm"],
      0,
      8,
      "file:///a.stm",
      index,
      "clients",
    );
    assert.ok(edit);
    assert.ok(edit.changes);
    // Should have edits in both files
    assert.ok(edit.changes["file:///a.stm"]);
    assert.ok(edit.changes["file:///b.stm"]);
    // Definition edit
    assert.ok(
      edit.changes["file:///a.stm"].some(
        (e) => e.newText === "clients",
      ),
    );
    // Reference edit
    assert.ok(
      edit.changes["file:///b.stm"].some(
        (e) => e.newText === "clients",
      ),
    );
  });

  it("renames fragment and all spread sites", () => {
    const { index, trees } = buildIndex({
      "file:///a.stm": `fragment audit_fields {
  ts TIMESTAMP
}
schema customers {
  id UUID
  ...audit_fields
}`,
    });
    const edit = computeRename(
      trees["file:///a.stm"],
      0,
      10,
      "file:///a.stm",
      index,
      "tracking_fields",
    );
    assert.ok(edit);
    const edits = edit.changes["file:///a.stm"];
    assert.ok(edits);
    // Should rename both the definition and the spread
    assert.ok(edits.length >= 2);
    assert.ok(edits.every((e) => e.newText === "tracking_fields"));
  });

  it("refuses rename to existing name", () => {
    const { index, trees } = buildIndex({
      "file:///a.stm":
        "schema customers {\n  id UUID\n}\nschema orders {\n  id UUID\n}",
    });
    const edit = computeRename(
      trees["file:///a.stm"],
      0,
      8,
      "file:///a.stm",
      index,
      "orders", // already exists
    );
    assert.equal(edit, null);
  });

  it("returns null for same name", () => {
    const { index, trees } = buildIndex({
      "file:///a.stm": "schema customers {\n  id UUID\n}",
    });
    const edit = computeRename(
      trees["file:///a.stm"],
      0,
      8,
      "file:///a.stm",
      index,
      "customers",
    );
    assert.equal(edit, null);
  });

  it("renames from a reference site", () => {
    const { index, trees } = buildIndex({
      "file:///a.stm": "schema customers {\n  id UUID\n}",
      "file:///b.stm":
        "mapping 'test' {\n  source { customers }\n  target { dim }\n  id -> id\n}",
    });
    const edit = computeRename(
      trees["file:///b.stm"],
      1,
      12,
      "file:///b.stm",
      index,
      "clients",
    );
    assert.ok(edit);
    // Should still rename in both files
    assert.ok(edit.changes["file:///a.stm"]);
    assert.ok(edit.changes["file:///b.stm"]);
  });
});
