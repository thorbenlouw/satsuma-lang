const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { initTestParser, parse } = require("./helper");
const { computeCompletions } = require("../dist/completion");
const { createWorkspaceIndex, indexFile } = require("../dist/workspace-index");

before(async () => { await initTestParser(); });

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

/** Get completions at a position. */
function complete(files, uri, line, col) {
  const { index, trees } = buildIndex(files);
  return computeCompletions(trees[uri], line, col, uri, index);
}

describe("computeCompletions", () => {
  it("returns empty for empty files", () => {
    const items = complete({ "file:///a.stm": "" }, "file:///a.stm", 0, 0);
    assert.equal(items.length, 0);
  });

  it("suggests schema names inside source block", () => {
    const items = complete(
      {
        "file:///a.stm": "schema customers {\n  id UUID\n}\nschema orders {\n  id UUID\n}",
        "file:///b.stm": "mapping `test` {\n  source { c }\n  target { dim }\n  id -> id\n}",
      },
      "file:///b.stm",
      1,
      12, // cursor inside source { }
    );
    assert.ok(items.length >= 2);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes("customers"));
    assert.ok(labels.includes("orders"));
    // All should be Class kind
    assert.ok(items.every((i) => i.kind === 7)); // CompletionItemKind.Class = 7
  });

  it("suggests schema names inside target block", () => {
    const items = complete(
      {
        "file:///a.stm": "schema dim_customers {\n  id UUID\n}",
        "file:///b.stm": "mapping `test` {\n  source { src }\n  target { d }\n  id -> id\n}",
      },
      "file:///b.stm",
      2,
      12, // cursor inside target { }
    );
    assert.ok(items.some((i) => i.label === "dim_customers"));
  });

  it("suggests fragments and transforms after spread", () => {
    const items = complete(
      {
        "file:///a.stm": `fragment audit_fields {
  ts TIMESTAMP
}
transform \`clean email\` {
  trim | lowercase
}
schema customers {
  id UUID
  ...a
}`,
      },
      "file:///a.stm",
      8,
      5, // cursor inside the spread
    );
    assert.ok(items.some((i) => i.label === "audit_fields"));
    assert.ok(items.some((i) => i.label === "clean email"));
  });

  it("suggests metadata tokens inside parentheses", () => {
    const items = complete(
      {
        "file:///a.stm": "schema test {\n  id UUID (p)\n}",
      },
      "file:///a.stm",
      1,
      12, // cursor inside (p)
    );
    assert.ok(items.length > 10);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes("pk"));
    assert.ok(labels.includes("required"));
    assert.ok(labels.includes("pii"));
    assert.ok(labels.includes("scd"));
    // All should be Keyword kind
    assert.ok(items.every((i) => i.kind === 14)); // CompletionItemKind.Keyword = 14
  });

  it("suggests transform functions in pipe chain", () => {
    const items = complete(
      {
        "file:///a.stm": "transform `clean` {\n  trim | lowercase\n}",
      },
      "file:///a.stm",
      1,
      10, // cursor on "lowercase" in pipe chain
    );
    assert.ok(items.length > 5);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes("trim"));
    assert.ok(labels.includes("lowercase"));
    assert.ok(labels.includes("coalesce"));
    assert.ok(labels.includes("null_if_empty"));
  });

  it("suggests block names in import declaration", () => {
    const items = complete(
      {
        "file:///a.stm": "schema customers {\n  id UUID\n}\nfragment audit {\n  ts TIMESTAMP\n}",
        "file:///b.stm": 'import { c } from "a.stm"',
      },
      "file:///b.stm",
      0,
      10, // cursor inside import { }
    );
    assert.ok(items.some((i) => i.label === "customers"));
    assert.ok(items.some((i) => i.label === "audit"));
  });

  it("suggests fields from source schemas in arrow paths", () => {
    const items = complete(
      {
        "file:///a.stm": `schema customers {
  id UUID (pk)
  name VARCHAR
  email VARCHAR
}
mapping \`test\` {
  source { customers }
  target { dim }
  name -> name
}`,
      },
      "file:///a.stm",
      8,
      3, // cursor on "name" in src_path of arrow
    );
    // Should suggest fields from customers schema
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes("id"));
    assert.ok(labels.includes("name"));
    assert.ok(labels.includes("email"));
  });

  it("returns empty for comment context", () => {
    const items = complete(
      {
        "file:///a.stm": "// this is a comment\nschema test {\n  id UUID\n}",
      },
      "file:///a.stm",
      0,
      5, // cursor inside comment
    );
    assert.equal(items.length, 0);
  });
});
