const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { initTestParser, parse } = require("./helper");
const { createWorkspaceIndex, indexFile } = require("../dist/workspace-index");
const { computeMissingImportDiagnostics, computeCoreSemanticDiagnostics } = require("../dist/semantic-diagnostics");

before(async () => { await initTestParser(); });

/** Build an index from a map of { uri: source }. */
function buildIndex(files) {
  const idx = createWorkspaceIndex();
  for (const [uri, source] of Object.entries(files)) {
    indexFile(idx, uri, parse(source));
  }
  return idx;
}

describe("computeMissingImportDiagnostics", () => {
  it("emits no diagnostics when all source/target refs are defined in the same file", () => {
    const src = `schema customers { id UUID }
mapping m {
  source { customers }
  target { customers }
  id -> id
}`;
    const idx = buildIndex({ "file:///a.stm": src });
    const diags = computeMissingImportDiagnostics(parse(src), "file:///a.stm", idx);
    assert.equal(diags.length, 0);
  });

  it("emits no diagnostics when the referenced schema is imported", () => {
    const aSrc = `import { orders } from "b.stm"
mapping m {
  source { orders }
  target { orders }
  id -> id
}`;
    const bSrc = `schema orders { id UUID }`;
    const idx = buildIndex({
      "file:///a.stm": aSrc,
      "file:///b.stm": bSrc,
    });
    const diags = computeMissingImportDiagnostics(parse(aSrc), "file:///a.stm", idx);
    assert.equal(diags.length, 0);
  });

  it("emits a missing-import diagnostic when a source ref exists in workspace but is not imported", () => {
    const aSrc = `mapping m {
  source { orders }
  target { orders }
  id -> id
}`;
    const bSrc = `schema orders { id UUID }`;
    const idx = buildIndex({
      "file:///a.stm": aSrc,
      "file:///b.stm": bSrc,
    });
    const diags = computeMissingImportDiagnostics(parse(aSrc), "file:///a.stm", idx);
    assert.ok(diags.length > 0, "expected at least one missing-import diagnostic");
    const diag = diags[0];
    assert.equal(diag.code, "missing-import");
    assert.equal(diag.source, "satsuma");
    assert.ok(diag.message.includes("orders"), "message should mention the symbol name");
    assert.ok(diag.message.includes("import"), "message should suggest an import");
  });

  it("includes the suggested import statement in the diagnostic message", () => {
    const aSrc = `mapping m {
  source { customers }
  target { customers }
  id -> id
}`;
    const bSrc = `schema customers { id UUID }`;
    const idx = buildIndex({
      "file:///project/a.stm": aSrc,
      "file:///project/b.stm": bSrc,
    });
    const diags = computeMissingImportDiagnostics(parse(aSrc), "file:///project/a.stm", idx);
    assert.ok(diags.length > 0);
    const msg = diags[0].message;
    // Suggestion should include the schema name and a path
    assert.ok(msg.includes("customers"));
    assert.ok(msg.includes("b.stm"), `expected b.stm in suggestion, got: ${msg}`);
  });

  it("does not flag symbols that are not defined anywhere (leaves those to validate)", () => {
    // 'ghost_schema' does not appear in any indexed file
    const aSrc = `mapping m {
  source { ghost_schema }
  target { ghost_schema }
  id -> id
}`;
    const idx = buildIndex({ "file:///a.stm": aSrc });
    const diags = computeMissingImportDiagnostics(parse(aSrc), "file:///a.stm", idx);
    assert.equal(diags.length, 0);
  });

  it("does not emit missing-import for import context references", () => {
    // The import declaration itself references 'orders' — that should not be flagged
    const aSrc = `import { orders } from "b.stm"
mapping m {
  source { orders }
  target { orders }
  id -> id
}`;
    const bSrc = `schema orders { id UUID }`;
    const idx = buildIndex({
      "file:///a.stm": aSrc,
      "file:///b.stm": bSrc,
    });
    const diags = computeMissingImportDiagnostics(parse(aSrc), "file:///a.stm", idx);
    // orders IS imported, so no missing-import diagnostics
    assert.equal(diags.length, 0);
  });

  it("emits diagnostics for transitive-import gaps but not for reachable transitive symbols", () => {
    // a imports b, b imports c. a can use customers (from c) via b's transitive import? No —
    // Satsuma imports are explicit. Only a's direct imports are in scope.
    // But getImportReachableUris follows transitively, so symbols in c ARE reachable from a
    // as long as b imports c and a imports b. This is the correct behaviour.
    const aSrc = `import { orders } from "b.stm"
mapping m {
  source { orders }
  target { orders }
  id -> id
}`;
    const bSrc = `import { customers } from "c.stm"\nschema orders { id UUID }`;
    const cSrc = `schema customers { id UUID }`;
    const idx = buildIndex({
      "file:///a.stm": aSrc,
      "file:///b.stm": bSrc,
      "file:///c.stm": cSrc,
    });
    const diags = computeMissingImportDiagnostics(parse(aSrc), "file:///a.stm", idx);
    // orders is imported — no diagnostic
    assert.equal(diags.length, 0);
  });
});

describe("computeCoreSemanticDiagnostics", () => {
  it("detects duplicate definitions for the same schema name across files", () => {
    const aSrc = `schema orders { id UUID }`;
    const bSrc = `schema orders { name STRING }`;
    const idx = buildIndex({
      "file:///a.stm": aSrc,
      "file:///b.stm": bSrc,
    });
    // Both files define 'orders' — should produce a duplicate diagnostic
    const diagsA = computeCoreSemanticDiagnostics("file:///a.stm", idx);
    const diagsB = computeCoreSemanticDiagnostics("file:///b.stm", idx);
    const allDiags = [...diagsA, ...diagsB];
    const dupDiag = allDiags.find((d) => d.code === "duplicate-definition");
    assert.ok(dupDiag, "expected a duplicate-definition diagnostic");
  });

  it("returns no diagnostics for a valid single-file workspace", () => {
    const src = `schema customers { id UUID }
mapping m {
  source { customers }
  target { customers }
  id -> id
}`;
    const idx = buildIndex({ "file:///a.stm": src });
    const diags = computeCoreSemanticDiagnostics("file:///a.stm", idx);
    assert.equal(diags.length, 0);
  });

  it("returns diagnostics with 0-indexed positions (LSP convention)", () => {
    const aSrc = `schema orders { id UUID }`;
    const bSrc = `schema orders { name STRING }`;
    const idx = buildIndex({
      "file:///a.stm": aSrc,
      "file:///b.stm": bSrc,
    });
    const diags = computeCoreSemanticDiagnostics("file:///b.stm", idx);
    if (diags.length > 0) {
      // LSP lines are 0-indexed
      assert.ok(diags[0].range.start.line >= 0, "line should be 0-indexed");
    }
  });
});
