const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { initTestParser, parse } = require("./helper");
const { createWorkspaceIndex, indexFile } = require("../dist/workspace-index");
const { computeMappingCoverage } = require("../dist/coverage");

before(async () => { await initTestParser(); });

/** Run computeMappingCoverage on a single-file source text. */
function coverage(source, mappingName, uri = "file:///test.stm") {
  const tree = parse(source);
  const idx = createWorkspaceIndex();
  indexFile(idx, uri, tree);
  return computeMappingCoverage(uri, tree, mappingName, idx);
}

// ---------- Basic structure ----------

describe("computeMappingCoverage — basic", () => {
  const SRC = `
schema src { id INT name STRING }
schema tgt { id INT label STRING }
mapping load {
  source { src }
  target { tgt }
  id -> id
}`;

  it("returns one source schema and one target schema", () => {
    const result = coverage(SRC, "load");
    assert.equal(result.schemas.length, 2);
    assert.equal(result.schemas.find(s => s.role === "source")?.schemaId, "src");
    assert.equal(result.schemas.find(s => s.role === "target")?.schemaId, "tgt");
  });

  it("returns empty schemas for unknown mapping name", () => {
    const result = coverage(SRC, "nonexistent");
    assert.equal(result.schemas.length, 0);
  });
});

// ---------- Target coverage ----------

describe("computeMappingCoverage — target fields", () => {
  const SRC = `
schema src { id INT name STRING extra INT }
schema tgt { id INT label STRING memo STRING }
mapping load {
  source { src }
  target { tgt }
  id -> id
  name -> label
}`;

  it("marks mapped target fields as mapped=true", () => {
    const result = coverage(SRC, "load");
    const tgt = result.schemas.find(s => s.role === "target");
    const id = tgt.fields.find(f => f.path === "id");
    const label = tgt.fields.find(f => f.path === "label");
    assert.equal(id.mapped, true);
    assert.equal(label.mapped, true);
  });

  it("marks unmapped target fields as mapped=false", () => {
    const result = coverage(SRC, "load");
    const tgt = result.schemas.find(s => s.role === "target");
    const memo = tgt.fields.find(f => f.path === "memo");
    assert.ok(memo, `expected "memo" field in ${tgt.fields.map(f => f.path)}`);
    assert.equal(memo.mapped, false);
  });

  it("computed arrows (no source) still mark the target field as mapped", () => {
    const src = `
schema src { id INT }
schema tgt { id INT stamp STRING }
mapping load {
  source { src }
  target { tgt }
  id -> id
  -> stamp { now_utc() }
}`;
    const result = coverage(src, "load");
    const tgt = result.schemas.find(s => s.role === "target");
    const stamp = tgt.fields.find(f => f.path === "stamp");
    assert.equal(stamp.mapped, true);
  });
});

// ---------- Source coverage ----------

describe("computeMappingCoverage — source fields", () => {
  const SRC = `
schema src { id INT name STRING unused INT }
schema tgt { id INT label STRING }
mapping load {
  source { src }
  target { tgt }
  id -> id
  name -> label
}`;

  it("marks used source fields as mapped=true", () => {
    const result = coverage(SRC, "load");
    const src = result.schemas.find(s => s.role === "source");
    assert.equal(src.fields.find(f => f.path === "id").mapped, true);
    assert.equal(src.fields.find(f => f.path === "name").mapped, true);
  });

  it("marks unused source fields as mapped=false", () => {
    const result = coverage(SRC, "load");
    const src = result.schemas.find(s => s.role === "source");
    assert.equal(src.fields.find(f => f.path === "unused").mapped, false);
  });
});

// ---------- Nested fields ----------

describe("computeMappingCoverage — nested fields", () => {
  // nested record fields use "field_name record { ... }" syntax
  it("includes nested fields in the coverage list", () => {
    const src = `
schema src { address record { line1 STRING line2 STRING } name STRING }
schema tgt { addr STRING name STRING }
mapping load {
  source { src }
  target { tgt }
  address.line1 -> addr
  name -> name
}`;
    const result = coverage(src, "load");
    const srcSchema = result.schemas.find(s => s.role === "source");
    const paths = srcSchema.fields.map(f => f.path);
    assert.ok(paths.includes("address"), `expected "address" in ${paths}`);
    assert.ok(paths.includes("address.line1"), `expected "address.line1" in ${paths}`);
    assert.ok(paths.includes("address.line2"), `expected "address.line2" in ${paths}`);
  });

  it("marks referenced nested source path as mapped", () => {
    const src = `
schema src { address record { line1 STRING line2 STRING } name STRING }
schema tgt { addr STRING name STRING }
mapping load {
  source { src }
  target { tgt }
  address.line1 -> addr
  name -> name
}`;
    const result = coverage(src, "load");
    const srcSchema = result.schemas.find(s => s.role === "source");
    const line1 = srcSchema.fields.find(f => f.path === "address.line1");
    const line2 = srcSchema.fields.find(f => f.path === "address.line2");
    assert.ok(line1, `expected address.line1 in ${srcSchema.fields.map(f => f.path)}`);
    assert.ok(line2, `expected address.line2 in ${srcSchema.fields.map(f => f.path)}`);
    assert.equal(line1.mapped, true);
    assert.equal(line2.mapped, false);
  });
});

// ---------- each_block ----------

describe("computeMappingCoverage — each_block", () => {
  // each blocks use "each src -> tgt { ... }" syntax
  it("marks the each iteration field as used on the source schema", () => {
    const src = `
schema src { items list_of record { id INT val STRING } name STRING }
schema tgt { lines list_of record { item_id INT } name STRING }
mapping load {
  source { src }
  target { tgt }
  name -> name
  each items -> lines {
    id -> item_id
  }
}`;
    const result = coverage(src, "load");
    const srcSchema = result.schemas.find(s => s.role === "source");
    const items = srcSchema.fields.find(f => f.path === "items");
    assert.ok(items, `expected "items" in ${srcSchema.fields.map(f => f.path)}`);
    assert.equal(items.mapped, true, "each iteration field should be marked used");
  });

  it("marks arrows inside each_block on the target schema", () => {
    const src = `
schema src { items list_of record { id INT val STRING } name STRING }
schema tgt { lines list_of record { item_id INT } name STRING }
mapping load {
  source { src }
  target { tgt }
  name -> name
  each items -> lines {
    id -> item_id
  }
}`;
    const result = coverage(src, "load");
    const tgtSchema = result.schemas.find(s => s.role === "target");
    const lines = tgtSchema.fields.find(f => f.path === "lines");
    assert.ok(lines, `expected "lines" in ${tgtSchema.fields.map(f => f.path)}`);
    assert.equal(lines.mapped, true, "each target field should be marked mapped");
  });
});

// ---------- Multiple source schemas ----------

describe("computeMappingCoverage — multiple sources", () => {
  it("returns a coverage entry for each source schema", () => {
    const src = `
schema a { id INT }
schema b { rate DECIMAL }
schema tgt { id INT rate DECIMAL }
mapping load {
  source { a b }
  target { tgt }
  id -> id
  rate -> rate
}`;
    const result = coverage(src, "load");
    const sources = result.schemas.filter(s => s.role === "source");
    assert.equal(sources.length, 2);
    const ids = sources.map(s => s.schemaId).sort();
    assert.deepEqual(ids, ["a", "b"]);
  });
});
