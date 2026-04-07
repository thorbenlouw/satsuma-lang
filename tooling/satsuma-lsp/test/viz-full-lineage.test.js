/**
 * viz-full-lineage.test.js — Unit tests for satsuma/vizFullLineage.
 *
 * The handler walks the import graph from the requested file and merges per-
 * file VizModels into one. These tests verify the *merge* contract: schemas
 * from imported files appear, the result is anchored to the primary URI, and
 * stub schemas are deduplicated against full upstream definitions.
 */

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { initTestParser, parse } = require("./helper");
const {
  createWorkspaceIndex,
  indexFile,
  getImportReachableUris,
  buildVizModel,
  mergeVizModels,
} = require("@satsuma/viz-backend");

before(async () => { await initTestParser(); });

/** Mirror the satsuma/vizFullLineage handler: walk imports, build & merge models. */
function fullLineage(files, primaryUri) {
  const index = createWorkspaceIndex();
  const trees = {};
  for (const [uri, source] of Object.entries(files)) {
    const tree = parse(source);
    trees[uri] = tree;
    indexFile(index, uri, tree);
  }
  const reachable = getImportReachableUris(primaryUri, index);
  const models = [];
  for (const uri of reachable) {
    if (trees[uri]) models.push(buildVizModel(uri, trees[uri], index));
  }
  return mergeVizModels(primaryUri, models);
}

describe("satsuma/vizFullLineage — import graph traversal", () => {
  // Two-file workspace: the entry file imports a schema from a defining file.
  // The merged model must contain the upstream schema, otherwise the viz would
  // be unable to render cross-file lineage.
  const FILES = {
    "file:///defs.stm": "schema customers { id UUID name VARCHAR }",
    "file:///entry.stm": 'import { customers } from "defs.stm"\nschema orders { customer_id UUID }',
  };

  it("anchors the merged model to the primary uri", () => {
    const model = fullLineage(FILES, "file:///entry.stm");
    assert.equal(model.uri, "file:///entry.stm");
  });

  it("includes schemas from import-reachable files", () => {
    const model = fullLineage(FILES, "file:///entry.stm");
    const ids = model.namespaces.flatMap((g) => g.schemas.map((s) => s.id));
    assert.ok(ids.includes("customers"), "imported schema 'customers' should appear in merged model");
    assert.ok(ids.includes("orders"), "local schema 'orders' should still appear");
  });
});

describe("satsuma/vizFullLineage — stub deduplication", () => {
  // When the entry file imports a schema that is also locally referenced as a
  // bare name, the merged model must not contain two copies of `customers` —
  // the upstream definition supersedes any stub.
  it("deduplicates schemas by qualified id across files", () => {
    const model = fullLineage(
      {
        "file:///defs.stm": "schema customers { id UUID email VARCHAR }",
        "file:///entry.stm":
          'import { customers } from "defs.stm"\n' +
          "mapping `m` {\n  source { customers }\n  target { customers }\n  id -> id\n}",
      },
      "file:///entry.stm",
    );
    const customerCards = model.namespaces
      .flatMap((g) => g.schemas)
      .filter((s) => s.id === "customers");
    assert.equal(customerCards.length, 1, "customers should appear exactly once after merge");
    // The surviving card must be the full definition (has fields), not a stub.
    assert.ok(customerCards[0].fields.length >= 1, "merged card should retain real fields");
  });
});
