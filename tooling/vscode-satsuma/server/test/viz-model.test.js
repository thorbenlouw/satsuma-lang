const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { initTestParser, parse } = require("./helper");
const {
  createWorkspaceIndex,
  indexFile,
} = require("../dist/workspace-index");
const { buildVizModel } = require("../dist/viz-model");

before(async () => { await initTestParser(); });

/** Build a VizModel from source text. */
function vizModel(source, uri = "file:///test.stm") {
  const tree = parse(source);
  const idx = createWorkspaceIndex();
  indexFile(idx, uri, tree);
  return buildVizModel(uri, tree, idx);
}

/** Build a VizModel with a workspace index pre-populated from multiple files. */
function vizModelMulti(files, targetUri) {
  const idx = createWorkspaceIndex();
  const trees = {};
  for (const [uri, source] of Object.entries(files)) {
    const tree = parse(source);
    trees[uri] = tree;
    indexFile(idx, uri, tree);
  }
  return buildVizModel(targetUri, trees[targetUri], idx);
}

// ---------- Basic structure ----------

describe("buildVizModel", () => {
  it("returns a model with the given URI", () => {
    const model = vizModel("schema foo { id INT }");
    assert.equal(model.uri, "file:///test.stm");
  });

  it("returns empty namespaces for empty file", () => {
    const model = vizModel("");
    assert.equal(model.namespaces.length, 0);
    assert.equal(model.fileNotes.length, 0);
  });
});

// ---------- File-level notes ----------

describe("file notes", () => {
  it("extracts single-line notes", () => {
    const model = vizModel('note { "A simple note" }');
    assert.equal(model.fileNotes.length, 1);
    assert.equal(model.fileNotes[0].text, "A simple note");
    assert.equal(model.fileNotes[0].isMultiline, false);
  });

  it("extracts multiline notes", () => {
    const model = vizModel('note {\n  """\n  # Title\n  Body text.\n  """\n}');
    assert.equal(model.fileNotes.length, 1);
    assert.equal(model.fileNotes[0].isMultiline, true);
    assert.ok(model.fileNotes[0].text.includes("Title"));
  });
});

// ---------- Schemas ----------

describe("schemas", () => {
  it("extracts a basic schema", () => {
    const model = vizModel("schema customers {\n  id UUID (pk)\n  name VARCHAR\n}");
    assert.equal(model.namespaces.length, 1);
    const ns = model.namespaces[0];
    assert.equal(ns.name, null);
    assert.equal(ns.schemas.length, 1);
    const schema = ns.schemas[0];
    assert.equal(schema.id, "customers");
    assert.equal(schema.qualifiedId, "customers");
    assert.equal(schema.kind, "schema");
  });

  it("extracts fields with types and constraints", () => {
    const model = vizModel(
      "schema users {\n  id UUID (pk, required)\n  email STRING (pii)\n  name VARCHAR\n}",
    );
    const fields = model.namespaces[0].schemas[0].fields;
    assert.equal(fields.length, 3);
    assert.equal(fields[0].name, "id");
    assert.equal(fields[0].type, "UUID");
    assert.deepEqual(fields[0].constraints, ["pk", "required"]);
    assert.equal(fields[1].name, "email");
    assert.deepEqual(fields[1].constraints, ["pii"]);
    assert.equal(fields[2].name, "name");
  });

  it("extracts schema with note metadata", () => {
    const model = vizModel(
      'schema foo (note "My description") {\n  id INT\n}',
    );
    const schema = model.namespaces[0].schemas[0];
    assert.equal(schema.label, "My description");
  });

  it("extracts backtick-named schemas", () => {
    const model = vizModel("schema `my schema` {\n  id INT\n}");
    const schema = model.namespaces[0].schemas[0];
    assert.equal(schema.id, "my schema");
  });

  it("extracts nested record fields", () => {
    const model = vizModel(
      "schema events {\n  data record {\n    id UUID\n    name STRING\n  }\n}",
    );
    const fields = model.namespaces[0].schemas[0].fields;
    assert.equal(fields.length, 1);
    assert.equal(fields[0].name, "data");
    assert.equal(fields[0].type, "record");
    assert.equal(fields[0].children.length, 2);
    assert.equal(fields[0].children[0].name, "id");
  });

  it("extracts list_of fields", () => {
    const model = vizModel(
      "schema events {\n  tags list_of STRING\n  items list_of record {\n    sku STRING\n  }\n}",
    );
    const fields = model.namespaces[0].schemas[0].fields;
    assert.equal(fields[0].type, "list_of STRING");
    assert.equal(fields[1].type, "list_of record");
    assert.equal(fields[1].children.length, 1);
  });
});

// ---------- Fragments ----------

describe("fragments", () => {
  it("extracts fragment definitions", () => {
    const model = vizModel(
      "fragment `audit fields` {\n  created_at TIMESTAMP\n  updated_at TIMESTAMP\n}",
    );
    const ns = model.namespaces[0];
    assert.equal(ns.fragments.length, 1);
    assert.equal(ns.fragments[0].id, "audit fields");
    assert.equal(ns.fragments[0].fields.length, 2);
  });
});

// ---------- Mappings ----------

describe("mappings", () => {
  it("extracts a basic mapping with source, target, and arrows", () => {
    const model = vizModel(
      "schema src { id INT\n name STRING }\n" +
      "schema tgt { id INT\n name STRING }\n" +
      "mapping m1 {\n  source { src }\n  target { tgt }\n  id -> id\n  name -> name\n}",
    );
    const mapping = model.namespaces[0].mappings[0];
    assert.equal(mapping.id, "m1");
    assert.deepEqual(mapping.sourceRefs, ["src"]);
    assert.equal(mapping.targetRef, "tgt");
    assert.equal(mapping.arrows.length, 2);
  });

  it("extracts arrow source and target fields", () => {
    const model = vizModel(
      "schema s { a INT }\nschema t { b INT }\n" +
      "mapping m {\n  source { s }\n  target { t }\n  a -> b\n}",
    );
    const arrow = model.namespaces[0].mappings[0].arrows[0];
    assert.deepEqual(arrow.sourceFields, ["a"]);
    assert.equal(arrow.targetField, "b");
    assert.equal(arrow.transform, null);
  });

  it("extracts pipeline transforms", () => {
    const model = vizModel(
      "schema s { a INT }\nschema t { b INT }\n" +
      "mapping m {\n  source { s }\n  target { t }\n  a -> b { trim | lowercase }\n}",
    );
    const tf = model.namespaces[0].mappings[0].arrows[0].transform;
    assert.ok(tf);
    assert.equal(tf.kind, "pipeline");
    assert.equal(tf.nlText, null);
  });

  it("extracts NL transforms", () => {
    const model = vizModel(
      "schema s { a INT }\nschema t { b INT }\n" +
      'mapping m {\n  source { s }\n  target { t }\n  a -> b { "Convert to uppercase" }\n}',
    );
    const tf = model.namespaces[0].mappings[0].arrows[0].transform;
    assert.ok(tf);
    assert.equal(tf.kind, "nl");
    assert.equal(tf.nlText, "Convert to uppercase");
  });

  it("extracts mixed transforms (NL + pipeline)", () => {
    const model = vizModel(
      "schema s { a INT }\nschema t { b INT }\n" +
      'mapping m {\n  source { s }\n  target { t }\n  a -> b {\n    "Do something"\n    | round(2)\n  }\n}',
    );
    const tf = model.namespaces[0].mappings[0].arrows[0].transform;
    assert.ok(tf);
    assert.equal(tf.kind, "mixed");
    assert.ok(tf.nlText);
    assert.ok(tf.steps.length > 0);
  });

  it("extracts map block transforms", () => {
    const model = vizModel(
      "schema s { status STRING }\nschema t { stage STRING }\n" +
      'mapping m {\n  source { s }\n  target { t }\n  status -> stage {\n    map {\n      A: "alpha"\n      B: "beta"\n    }\n  }\n}',
    );
    const tf = model.namespaces[0].mappings[0].arrows[0].transform;
    assert.ok(tf);
    assert.equal(tf.kind, "map");
  });

  it("extracts computed arrows (no source)", () => {
    const model = vizModel(
      "schema s { a INT }\nschema t { b INT }\n" +
      'mapping m {\n  source { s }\n  target { t }\n  -> b { "Compute something" }\n}',
    );
    const arrow = model.namespaces[0].mappings[0].arrows[0];
    assert.deepEqual(arrow.sourceFields, []);
    assert.equal(arrow.targetField, "b");
  });

  it("extracts multi-source arrows", () => {
    const model = vizModel(
      "schema s { a STRING\n  b STRING }\nschema t { c STRING }\n" +
      'mapping m {\n  source { s }\n  target { t }\n  a, b -> c { "Concat" }\n}',
    );
    const arrow = model.namespaces[0].mappings[0].arrows[0];
    assert.equal(arrow.sourceFields.length, 2);
    assert.equal(arrow.sourceFields[0], "a");
    assert.equal(arrow.sourceFields[1], "b");
  });

  it("extracts source block with join description", () => {
    const model = vizModel(
      "schema a { id INT }\nschema b { id INT }\nschema t { id INT }\n" +
      'mapping m {\n  source {\n    a\n    b\n    "Join on a.id = b.id"\n  }\n  target { t }\n  a.id -> id\n}',
    );
    const sb = model.namespaces[0].mappings[0].sourceBlock;
    assert.ok(sb);
    assert.deepEqual(sb.schemas, ["a", "b"]);
    assert.equal(sb.joinDescription, "Join on a.id = b.id");
  });

  it("extracts flatten blocks", () => {
    const model = vizModel(
      "schema s { items list_of record { sku STRING } }\n" +
      "schema t { sku STRING }\n" +
      "mapping m {\n  source { s }\n  target { t }\n  flatten items -> t {\n    .sku -> sku\n  }\n}",
    );
    const mapping = model.namespaces[0].mappings[0];
    assert.equal(mapping.flattenBlocks.length, 1);
    assert.equal(mapping.flattenBlocks[0].sourceField, "items");
    assert.equal(mapping.flattenBlocks[0].arrows.length, 1);
  });

  it("extracts mapping-level notes", () => {
    const model = vizModel(
      "schema s { a INT }\nschema t { b INT }\n" +
      'mapping m {\n  note { "Mapping note" }\n  source { s }\n  target { t }\n  a -> b\n}',
    );
    const mapping = model.namespaces[0].mappings[0];
    assert.equal(mapping.notes.length, 1);
    assert.equal(mapping.notes[0].text, "Mapping note");
  });
});

// ---------- Metrics ----------

describe("metrics", () => {
  it("extracts basic metric", () => {
    const model = vizModel(
      'metric mrr "MRR" (source subs, grain monthly) {\n  value DECIMAL(14,2) (measure additive)\n}',
    );
    const ns = model.namespaces[0];
    assert.equal(ns.metrics.length, 1);
    const metric = ns.metrics[0];
    assert.equal(metric.id, "mrr");
    assert.equal(metric.label, "MRR");
    assert.deepEqual(metric.source, ["subs"]);
    assert.equal(metric.grain, "monthly");
  });

  it("extracts metric fields with measure types", () => {
    const model = vizModel(
      "metric m1 (source s) {\n" +
      "  val DECIMAL (measure additive)\n" +
      "  avg DECIMAL (measure non_additive)\n" +
      "  half DECIMAL (measure semi_additive)\n" +
      "}",
    );
    const fields = model.namespaces[0].metrics[0].fields;
    assert.equal(fields.length, 3);
    assert.equal(fields[0].measure, "additive");
    assert.equal(fields[1].measure, "non_additive");
    assert.equal(fields[2].measure, "semi_additive");
  });

  it("extracts metric with slices", () => {
    const model = vizModel(
      "metric m1 (source s, slice {a, b, c}) {\n  val DECIMAL (measure)\n}",
    );
    const metric = model.namespaces[0].metrics[0];
    assert.deepEqual(metric.slices, ["a", "b", "c"]);
  });

  it("extracts metric with filter", () => {
    const model = vizModel(
      'metric m1 (source s, filter "status = active") {\n  val DECIMAL (measure)\n}',
    );
    const metric = model.namespaces[0].metrics[0];
    assert.equal(metric.filter, "status = active");
  });

  it("extracts bare measure tag as additive", () => {
    const model = vizModel(
      "metric m1 (source s) {\n  count INT (measure)\n}",
    );
    const fields = model.namespaces[0].metrics[0].fields;
    assert.equal(fields[0].measure, "additive");
  });
});

// ---------- Namespaces ----------

describe("namespaces", () => {
  it("groups schemas under their namespace", () => {
    const model = vizModel(
      "namespace pos {\n  schema stores { id INT }\n  schema txns { id INT }\n}",
    );
    // No global namespace (no global-level blocks)
    const ns = model.namespaces.find((n) => n.name === "pos");
    assert.ok(ns);
    assert.equal(ns.schemas.length, 2);
    assert.equal(ns.schemas[0].qualifiedId, "pos::stores");
  });

  it("separates global and namespaced blocks", () => {
    const model = vizModel(
      "schema global_s { id INT }\n" +
      "namespace ns1 {\n  schema ns_s { id INT }\n}",
    );
    assert.equal(model.namespaces.length, 2);
    const global = model.namespaces.find((n) => n.name === null);
    assert.ok(global);
    assert.equal(global.schemas.length, 1);
    assert.equal(global.schemas[0].id, "global_s");
    const ns1 = model.namespaces.find((n) => n.name === "ns1");
    assert.ok(ns1);
    assert.equal(ns1.schemas.length, 1);
  });

  it("handles mappings inside namespaces", () => {
    const model = vizModel(
      "namespace wh {\n" +
      "  schema src { id INT }\n" +
      "  schema tgt { id INT }\n" +
      "  mapping load {\n    source { src }\n    target { tgt }\n    id -> id\n  }\n" +
      "}",
    );
    const ns = model.namespaces.find((n) => n.name === "wh");
    assert.ok(ns);
    assert.equal(ns.mappings.length, 1);
    assert.equal(ns.mappings[0].id, "load");
  });
});

// ---------- Comments ----------

describe("comments", () => {
  it("extracts warning comments from fields", () => {
    const model = vizModel(
      "schema s {\n  email STRING //! PII risk\n}",
    );
    const schema = model.namespaces[0].schemas[0];
    // Warning comments appear on the schema or the field
    const allComments = [
      ...schema.comments,
      ...schema.fields.flatMap((f) => f.comments),
    ];
    assert.ok(allComments.some((c) => c.kind === "warning"));
  });

  it("extracts question comments", () => {
    const model = vizModel(
      "schema s {\n  status STRING //? Should this be an enum?\n}",
    );
    const schema = model.namespaces[0].schemas[0];
    const allComments = [
      ...schema.comments,
      ...schema.fields.flatMap((f) => f.comments),
    ];
    assert.ok(allComments.some((c) => c.kind === "question"));
  });
});

// ---------- External lineage ----------

describe("external lineage", () => {
  it("detects external lineage when schema is referenced from another file", () => {
    const model = vizModelMulti(
      {
        "file:///a.stm": "schema customers { id INT }",
        "file:///b.stm": "schema tgt { id INT }\nmapping m {\n  source { customers }\n  target { tgt }\n  id -> id\n}",
      },
      "file:///a.stm",
    );
    const schema = model.namespaces[0].schemas[0];
    assert.equal(schema.hasExternalLineage, true);
  });

  it("reports no external lineage when only referenced within same file", () => {
    const model = vizModel(
      "schema s { id INT }\nschema t { id INT }\nmapping m {\n  source { s }\n  target { t }\n  id -> id\n}",
    );
    const schema = model.namespaces[0].schemas.find((s) => s.id === "s");
    assert.ok(schema);
    assert.equal(schema.hasExternalLineage, false);
  });
});

// ---------- Source locations ----------

describe("source locations", () => {
  it("includes correct line numbers for schemas", () => {
    const model = vizModel("schema foo {\n  id INT\n}");
    const loc = model.namespaces[0].schemas[0].location;
    assert.equal(loc.line, 0);
    assert.equal(loc.character, 0);
    assert.equal(loc.uri, "file:///test.stm");
  });

  it("includes correct line numbers for fields", () => {
    const model = vizModel("schema foo {\n  id INT\n  name STRING\n}");
    const fields = model.namespaces[0].schemas[0].fields;
    assert.equal(fields[0].location.line, 1);
    assert.equal(fields[1].location.line, 2);
  });
});

// ---------- Example file coverage ----------

describe("example file coverage", () => {
  const fs = require("fs");
  const path = require("path");
  const examplesDir = path.resolve(__dirname, "../../../../examples");

  // Only test files that exist and are top-level (not in subdirs)
  let exampleFiles;
  try {
    exampleFiles = fs
      .readdirSync(examplesDir)
      .filter((f) => f.endsWith(".stm"));
  } catch {
    exampleFiles = [];
  }

  for (const filename of exampleFiles) {
    it(`produces a valid VizModel for ${filename}`, () => {
      const source = fs.readFileSync(path.join(examplesDir, filename), "utf-8");
      const uri = `file:///${filename}`;
      // Should not throw
      const model = vizModel(source, uri);
      assert.ok(model);
      assert.equal(model.uri, uri);
      // Every namespace should have valid arrays
      for (const ns of model.namespaces) {
        assert.ok(Array.isArray(ns.schemas));
        assert.ok(Array.isArray(ns.mappings));
        assert.ok(Array.isArray(ns.metrics));
        assert.ok(Array.isArray(ns.fragments));
      }
    });
  }
});
