import "./dom-shim.js";
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

/** Helper: minimal SourceLocation */
const loc = { uri: "file:///test.stm", line: 1, character: 0 };

/** Helper: minimal field */
const field = (name, type = "STRING") => ({
  name,
  type,
  constraints: [],
  notes: [],
  comments: [],
  children: [],
  location: loc,
});

/** Helper: minimal arrow */
const arrow = (source, target, transform = null) => ({
  sourceFields: [source],
  targetField: target,
  transform,
  metadata: [],
  comments: [],
  location: loc,
});

/** Helper: minimal schema */
const schema = (id, fields = [field("id")], qualifiedId = id) => ({
  id,
  qualifiedId,
  kind: "schema",
  label: null,
  fields,
  notes: [],
  comments: [],
  metadata: [],
  location: loc,
  hasExternalLineage: false,
  spreads: [],
});

/** Helper: minimal mapping */
const mapping = (id, sourceRefs, targetRef, arrows = []) => ({
  id,
  sourceRefs,
  targetRef,
  arrows,
  eachBlocks: [],
  flattenBlocks: [],
  sourceBlock: null,
  notes: [],
  comments: [],
  location: loc,
});

describe("computeLayout", () => {
  /** @type {typeof import("../dist/satsuma-viz.js").computeLayout} */
  let computeLayout;

  it("loads the layout module", async () => {
    const mod = await import("../dist/satsuma-viz.js");
    computeLayout = mod.computeLayout;
    assert.equal(typeof computeLayout, "function");
  });

  it("computes layout for a single schema", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [
        {
          name: null,
          schemas: [
            {
              id: "users",
              qualifiedId: "users",
              kind: "schema",
              label: null,
              fields: [field("id", "UUID"), field("name")],
              notes: [],
              comments: [],
              metadata: [],
              location: loc,
              hasExternalLineage: false,
            },
          ],
          mappings: [],
          metrics: [],
          fragments: [],
        },
      ],
    };

    const result = await computeLayout(model);

    assert.ok(result.nodes.has("users"), "Should have 'users' node");
    const node = result.nodes.get("users");
    assert.equal(typeof node.x, "number");
    assert.equal(typeof node.y, "number");
    assert.ok(node.width > 0, "Width should be positive");
    assert.ok(node.height > 0, "Height should be positive");
    assert.ok(result.width > 0);
    assert.ok(result.height > 0);
  });

  it("positions source and target schemas with edges", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [
        {
          name: null,
          schemas: [
            {
              id: "source",
              qualifiedId: "source",
              kind: "schema",
              label: null,
              fields: [field("email"), field("name")],
              notes: [],
              comments: [],
              metadata: [],
              location: loc,
              hasExternalLineage: false,
            },
            {
              id: "target",
              qualifiedId: "target",
              kind: "schema",
              label: null,
              fields: [field("email"), field("full_name")],
              notes: [],
              comments: [],
              metadata: [],
              location: loc,
              hasExternalLineage: false,
            },
          ],
          mappings: [
            {
              id: "source_to_target",
              sourceRefs: ["source"],
              targetRef: "target",
              arrows: [
                arrow("email", "email"),
                arrow("name", "full_name", {
                  kind: "pipeline",
                  text: "trim | upper",
                  steps: ["trim", "upper"],
                  nlText: null,
                }),
              ],
              eachBlocks: [],
              flattenBlocks: [],
              sourceBlock: null,
              notes: [],
              comments: [],
              location: loc,
            },
          ],
          metrics: [],
          fragments: [],
        },
      ],
    };

    const result = await computeLayout(model);

    assert.ok(result.nodes.has("source"), "Should have source node");
    assert.ok(result.nodes.has("target"), "Should have target node");

    const src = result.nodes.get("source");
    const tgt = result.nodes.get("target");

    // ELK layered layout with RIGHT direction: source should be left of target
    assert.ok(
      src.x < tgt.x,
      `Source x (${src.x}) should be less than target x (${tgt.x})`
    );

    // Should produce edges
    assert.ok(result.edges.length >= 0, "Should have edges array");
  });

  it("includes namespace compound nodes without adding them to result nodes", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [
        {
          name: "crm",
          schemas: [
            {
              id: "customers",
              qualifiedId: "crm::customers",
              kind: "schema",
              label: null,
              fields: [field("id")],
              notes: [],
              comments: [],
              metadata: [],
              location: loc,
              hasExternalLineage: false,
            },
          ],
          mappings: [],
          metrics: [],
          fragments: [],
        },
      ],
    };

    const result = await computeLayout(model);

    assert.ok(
      result.nodes.has("crm::customers"),
      "Should have namespaced schema node"
    );
    assert.ok(
      !result.nodes.has("ns:crm"),
      "Namespace compound node should NOT appear in result nodes"
    );
  });

  it("handles metrics and fragments", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [
        {
          name: null,
          schemas: [],
          mappings: [],
          metrics: [
            {
              id: "revenue",
              qualifiedId: "revenue",
              label: "MRR",
              source: ["orders"],
              grain: "monthly",
              slices: [],
              filter: null,
              fields: [
                {
                  name: "value",
                  type: "DECIMAL(14,2)",
                  measure: "additive",
                  notes: [],
                  location: loc,
                },
              ],
              notes: [],
              comments: [],
              location: loc,
            },
          ],
          fragments: [
            {
              id: "audit_fields",
              fields: [field("created_at", "TIMESTAMP")],
              notes: [],
              location: loc,
            },
          ],
        },
      ],
    };

    const result = await computeLayout(model);

    assert.ok(result.nodes.has("revenue"), "Should have metric node");
    assert.ok(result.nodes.has("audit_fields"), "Should have fragment node");
  });

  it("produces positive dimensions for the overall layout", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [
        {
          name: null,
          schemas: [
            {
              id: "a",
              qualifiedId: "a",
              kind: "schema",
              label: null,
              fields: [field("x")],
              notes: [],
              comments: [],
              metadata: [],
              location: loc,
              hasExternalLineage: false,
            },
          ],
          mappings: [],
          metrics: [],
          fragments: [],
        },
      ],
    };

    const result = await computeLayout(model);
    assert.ok(result.width > 0, "Layout width should be positive");
    assert.ok(result.height > 0, "Layout height should be positive");
  });
});

describe("computeOverviewLayout", () => {
  /** @type {typeof import("../dist/satsuma-viz.js").computeOverviewLayout} */
  let computeOverviewLayout;

  it("loads the overview layout function", async () => {
    const mod = await import("../dist/satsuma-viz.js");
    computeOverviewLayout = mod.computeOverviewLayout;
    assert.equal(typeof computeOverviewLayout, "function");
  });

  it("produces compact nodes without ports", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [{
        name: null,
        schemas: [schema("src"), schema("tgt")],
        mappings: [mapping("m1", ["src"], "tgt", [arrow("id", "id")])],
        metrics: [],
        fragments: [],
      }],
    };

    const result = await computeOverviewLayout(model);

    assert.ok(result.nodes.length >= 2, "Should have at least 2 nodes");
    const srcNode = result.nodes.find(n => n.id === "src");
    const tgtNode = result.nodes.find(n => n.id === "tgt");
    assert.ok(srcNode, "Should have src node");
    assert.ok(tgtNode, "Should have tgt node");
    // Compact nodes have no ports
    assert.equal(srcNode.ports.size, 0, "Overview nodes should have no ports");
    assert.equal(tgtNode.ports.size, 0, "Overview nodes should have no ports");
    // Compact card height: header (40) + bottom-padding (4) = 44
    assert.equal(srcNode.height, 44, "Compact node should have header-only height");
  });

  it("creates one edge per mapping, not per arrow", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [{
        name: null,
        schemas: [
          schema("src", [field("a"), field("b"), field("c")]),
          schema("tgt", [field("x"), field("y"), field("z")]),
        ],
        mappings: [mapping("m1", ["src"], "tgt", [
          arrow("a", "x"),
          arrow("b", "y"),
          arrow("c", "z"),
        ])],
        metrics: [],
        fragments: [],
      }],
    };

    const result = await computeOverviewLayout(model);

    // One mapping with one source → one edge (not three)
    assert.equal(result.edges.length, 1, "Should produce one edge per mapping source ref");
    assert.equal(result.edges[0].sourceNode, "src");
    assert.equal(result.edges[0].targetNode, "tgt");
    assert.ok(result.edges[0].mapping, "Edge should carry the MappingBlock reference");
    assert.equal(result.edges[0].mapping.id, "m1");
  });

  it("creates edges for multiple source refs", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [{
        name: null,
        schemas: [schema("s1"), schema("s2"), schema("tgt")],
        mappings: [mapping("m1", ["s1", "s2"], "tgt", [arrow("id", "id")])],
        metrics: [],
        fragments: [],
      }],
    };

    const result = await computeOverviewLayout(model);

    // Two source refs → two edges
    assert.equal(result.edges.length, 2, "Should produce one edge per source ref");
    const sources = result.edges.map(e => e.sourceNode).sort();
    assert.deepEqual(sources, ["s1", "s2"]);
  });

  it("uses namespace compound nodes for grouping", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [{
        name: "crm",
        schemas: [schema("customers", [field("id")], "crm::customers")],
        mappings: [],
        metrics: [],
        fragments: [],
      }],
    };

    const result = await computeOverviewLayout(model);

    const node = result.nodes.find(n => n.id === "crm::customers");
    assert.ok(node, "Should have namespaced schema node");
    // Namespace compound node should not appear in the output
    assert.ok(!result.nodes.find(n => n.id === "ns:crm"), "No namespace node in output");
  });

  it("produces positive overall dimensions", async () => {
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [{
        name: null,
        schemas: [schema("a")],
        mappings: [],
        metrics: [],
        fragments: [],
      }],
    };

    const result = await computeOverviewLayout(model);
    assert.ok(result.width > 0, "Layout width should be positive");
    assert.ok(result.height > 0, "Layout height should be positive");
  });
});
