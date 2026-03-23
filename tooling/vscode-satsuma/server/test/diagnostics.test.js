const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Parser = require("tree-sitter");
const Satsuma = require("tree-sitter-satsuma");
const { computeDiagnostics } = require("../dist/diagnostics");

const parser = new Parser();
parser.setLanguage(Satsuma);

function parse(source) {
  return parser.parse(source);
}

describe("computeDiagnostics", () => {
  it("returns empty diagnostics for valid input", () => {
    const tree = parse(`schema customers {
  customer_id UUID (pk)
  name VARCHAR(200)
}`);
    const diags = computeDiagnostics(tree);
    const errors = diags.filter((d) => d.severity === 1); // Error
    assert.equal(errors.length, 0);
  });

  it("reports syntax errors for invalid input", () => {
    const tree = parse("schema { }"); // missing block label
    const diags = computeDiagnostics(tree);
    const errors = diags.filter((d) => d.severity === 1); // Error
    assert.ok(errors.length > 0, "Expected at least one error diagnostic");
  });

  it("reports warning comments as Warning severity", () => {
    const tree = parse(`schema foo {
  bar STRING //! known issue with this field
}`);
    const diags = computeDiagnostics(tree);
    const warnings = diags.filter((d) => d.severity === 2); // Warning
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, /known issue/);
  });

  it("reports question comments as Information severity", () => {
    const tree = parse(`schema foo {
  bar STRING //? should this be INT?
}`);
    const diags = computeDiagnostics(tree);
    const infos = diags.filter((d) => d.severity === 3); // Information
    assert.equal(infos.length, 1);
    assert.match(infos[0].message, /should this be INT/);
  });

  it("sets source to 'satsuma' on all diagnostics", () => {
    const tree = parse(`schema { }
//! warning
//? question`);
    const diags = computeDiagnostics(tree);
    assert.ok(diags.length > 0);
    for (const d of diags) {
      assert.equal(d.source, "satsuma");
    }
  });

  it("handles files with no blocks gracefully", () => {
    const tree = parse("");
    const diags = computeDiagnostics(tree);
    assert.deepEqual(diags, []);
  });

  it("includes correct line/column range for errors", () => {
    const tree = parse("schema { }");
    const diags = computeDiagnostics(tree);
    const errors = diags.filter((d) => d.severity === 1);
    assert.ok(errors.length > 0);
    // Error should be on line 0
    assert.equal(errors[0].range.start.line, 0);
  });
});
