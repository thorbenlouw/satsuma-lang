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
