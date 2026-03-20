/**
 * graph.test.js — Unit and integration tests for `satsuma graph` command.
 */

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, "../dist/index.js");
const EXAMPLES = resolve(__dirname, "../../../examples");
const FIXTURES = resolve(__dirname, "fixtures");

function run(...args) {
  return new Promise((resolve) => {
    execFile("node", [CLI, ...args], { timeout: 15_000 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        code: err ? err.code ?? 1 : 0,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// satsuma graph (default text output)
// ---------------------------------------------------------------------------
describe("satsuma graph (text)", () => {
  it("prints node counts and schema topology", async () => {
    const { stdout, code } = await run("graph", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /schemas:/);
    assert.match(stdout, /mappings:/);
    assert.match(stdout, /schema-level:/);
    assert.match(stdout, /field-level:/);
    assert.match(stdout, /Schema topology:/);
  });

  it("prints classification breakdown", async () => {
    const { stdout, code } = await run("graph", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /structural:/);
  });
});

// ---------------------------------------------------------------------------
// satsuma graph --json
// ---------------------------------------------------------------------------
describe("satsuma graph --json", () => {
  it("produces valid JSON with expected top-level keys", async () => {
    const { stdout, code } = await run("graph", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.version, 1);
    assert.ok(data.generated);
    assert.ok(data.workspace);
    assert.ok(data.stats);
    assert.ok(Array.isArray(data.nodes));
    assert.ok(Array.isArray(data.edges));
    assert.ok(Array.isArray(data.schema_edges));
    assert.ok(Array.isArray(data.warnings));
    assert.ok(Array.isArray(data.unresolved_nl));
  });

  it("stats counts match node/edge array lengths", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const nodesByKind = {};
    for (const n of data.nodes) {
      nodesByKind[n.kind] = (nodesByKind[n.kind] ?? 0) + 1;
    }
    assert.equal(data.stats.schemas, nodesByKind.schema ?? 0);
    assert.equal(data.stats.mappings, nodesByKind.mapping ?? 0);
    assert.equal(data.stats.metrics, nodesByKind.metric ?? 0);
    assert.equal(data.stats.fragments, nodesByKind.fragment ?? 0);
    assert.equal(data.stats.transforms, nodesByKind.transform ?? 0);
    assert.equal(data.stats.arrows, data.edges.length);
  });

  it("includes all entity kinds as nodes", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const kinds = new Set(data.nodes.map((n) => n.kind));
    assert.ok(kinds.has("schema"), "should have schema nodes");
    assert.ok(kinds.has("mapping"), "should have mapping nodes");
    assert.ok(kinds.has("metric"), "should have metric nodes");
    assert.ok(kinds.has("fragment"), "should have fragment nodes");
    assert.ok(kinds.has("transform"), "should have transform nodes");
  });

  it("schema nodes include id, kind, file, row, and fields", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const schema = data.nodes.find((n) => n.kind === "schema");
    assert.ok(schema);
    assert.ok("id" in schema);
    assert.equal(schema.kind, "schema");
    assert.ok("file" in schema);
    assert.ok("row" in schema);
    assert.ok(Array.isArray(schema.fields));
    if (schema.fields.length > 0) {
      assert.ok("name" in schema.fields[0]);
      assert.ok("type" in schema.fields[0]);
    }
  });

  it("mapping nodes include sources and targets", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const mapping = data.nodes.find((n) => n.kind === "mapping");
    assert.ok(mapping);
    assert.ok(Array.isArray(mapping.sources));
    assert.ok(Array.isArray(mapping.targets));
  });

  it("metric nodes include sources, grain, and slices", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const metric = data.nodes.find((n) => n.kind === "metric" && n.slices.length > 0);
    assert.ok(metric, "should have a metric with slices");
    assert.ok(Array.isArray(metric.sources));
    assert.ok(typeof metric.grain === "string" || metric.grain === null);
    assert.ok(Array.isArray(metric.slices));
    assert.ok(metric.slices.length > 0);
  });

  it("namespace-qualified names use ns::name convention", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const nsNode = data.nodes.find((n) => n.namespace && n.id.includes("::"));
    assert.ok(nsNode, "should have namespace-qualified node");
    assert.ok(nsNode.id.startsWith(nsNode.namespace + "::"));
  });

  it("field-level edges have expected structure", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    assert.ok(data.edges.length > 0, "should have field-level edges");
    const edge = data.edges[0];
    assert.ok("from" in edge);
    assert.ok("to" in edge);
    assert.ok("mapping" in edge);
    assert.ok("classification" in edge);
    assert.ok("file" in edge);
    assert.ok("row" in edge);
  });

  it("structural edges include transforms array", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const structural = data.edges.find((e) => e.classification === "structural" && e.transforms);
    assert.ok(structural, "should have structural edge with transforms");
    assert.ok(Array.isArray(structural.transforms));
  });

  it("NL edges include nl_text", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const nl = data.edges.find((e) => e.classification === "nl" && e.nl_text);
    assert.ok(nl, "should have NL edge with nl_text");
    assert.ok(typeof nl.nl_text === "string");
  });

  it("derived edges have from=null and derived=true", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const derived = data.edges.find((e) => e.derived === true);
    assert.ok(derived, "should have derived edge");
    assert.equal(derived.from, null);
  });

  it("schema_edges have from, to, and role", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    assert.ok(data.schema_edges.length > 0);
    const roles = new Set(data.schema_edges.map((e) => e.role));
    assert.ok(roles.has("source"));
    assert.ok(roles.has("target"));
    for (const e of data.schema_edges) {
      assert.ok("from" in e);
      assert.ok("to" in e);
      assert.ok("role" in e);
    }
  });

  it("includes metric_source role in schema_edges", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const metricEdge = data.schema_edges.find((e) => e.role === "metric_source");
    assert.ok(metricEdge, "should have metric_source schema edge");
  });
});

// ---------------------------------------------------------------------------
// satsuma graph --schema-only
// ---------------------------------------------------------------------------
describe("satsuma graph --schema-only", () => {
  it("aggregates field-level edges to schema-level", async () => {
    const { stdout } = await run("graph", "--json", "--schema-only", EXAMPLES);
    const data = JSON.parse(stdout);
    // --schema-only aggregates field-level arrows into schema-level edges
    assert.ok(data.edges.length > 0, "should have aggregated edges");
    assert.ok(data.schema_edges.length > 0);
    // All edges should be schema-level (no dotted field paths)
    for (const e of data.edges) {
      if (e.from) assert.ok(!e.from.includes("."), `from should be schema-level: ${e.from}`);
      if (e.to) assert.ok(!e.to.includes("."), `to should be schema-level: ${e.to}`);
    }
  });

  it("omits fields from schema nodes", async () => {
    const { stdout } = await run("graph", "--json", "--schema-only", EXAMPLES);
    const data = JSON.parse(stdout);
    const schema = data.nodes.find((n) => n.kind === "schema");
    assert.ok(schema);
    assert.ok(!("fields" in schema));
  });
});

// ---------------------------------------------------------------------------
// satsuma graph --namespace
// ---------------------------------------------------------------------------
describe("satsuma graph --namespace", () => {
  it("filters nodes to specified namespace", async () => {
    const { stdout } = await run("graph", "--json", "--namespace", "warehouse", EXAMPLES);
    const data = JSON.parse(stdout);
    assert.ok(data.nodes.length > 0);
    for (const n of data.nodes) {
      assert.equal(n.namespace, "warehouse");
    }
  });

  it("includes cross-namespace schema_edges", async () => {
    const { stdout } = await run("graph", "--json", "--namespace", "warehouse", EXAMPLES);
    const data = JSON.parse(stdout);
    // warehouse mappings have sources from other namespaces (e.g. pos::stores)
    const crossNs = data.schema_edges.find((e) => e.from.includes("pos::") || e.from.includes("ecom::"));
    assert.ok(crossNs, "should include cross-namespace source edges");
  });

  it("stats reflect filtered counts", async () => {
    const { stdout } = await run("graph", "--json", "--namespace", "warehouse", EXAMPLES);
    const data = JSON.parse(stdout);
    assert.ok(data.stats.schemas > 0);
    assert.ok(data.stats.schemas < 49); // less than full workspace
  });
});

// ---------------------------------------------------------------------------
// satsuma graph --no-nl
// ---------------------------------------------------------------------------
describe("satsuma graph --no-nl", () => {
  it("strips nl_text from edges but preserves classification", async () => {
    const { stdout } = await run("graph", "--json", "--no-nl", EXAMPLES);
    const data = JSON.parse(stdout);
    const nlEdge = data.edges.find((e) => e.classification === "nl");
    assert.ok(nlEdge, "should still have NL-classified edges");
    assert.ok(!("nl_text" in nlEdge), "should not have nl_text");
  });
});

// ---------------------------------------------------------------------------
// satsuma graph --compact
// ---------------------------------------------------------------------------
describe("satsuma graph --compact", () => {
  it("prints flat adjacency list", async () => {
    const { stdout, code } = await run("graph", "--compact", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /->/);
    assert.match(stdout, /\[source\]/);
    assert.match(stdout, /\[target\]/);
  });
});

// ---------------------------------------------------------------------------
// satsuma graph (namespace fixture)
// ---------------------------------------------------------------------------
describe("satsuma graph (namespace fixture)", () => {
  it("produces correct graph for namespace fixture", async () => {
    const { stdout, code } = await run("graph", "--json", resolve(FIXTURES, "namespaces.stm"));
    assert.equal(code, 0);
    const data = JSON.parse(stdout);

    // Should have nodes from multiple namespaces
    const namespaces = new Set(data.nodes.map((n) => n.namespace).filter(Boolean));
    assert.ok(namespaces.has("pos"));
    assert.ok(namespaces.has("ecom"));
    assert.ok(namespaces.has("warehouse"));
    assert.ok(namespaces.has("analytics"));

    // Should have warehouse::load hub_store mapping
    const mapping = data.nodes.find((n) => n.id === "warehouse::load hub_store");
    assert.ok(mapping);
    assert.deepEqual(mapping.sources, ["pos::stores"]);
    assert.deepEqual(mapping.targets, ["warehouse::hub_store"]);

    // Should have schema_edges for that mapping
    const sourceEdge = data.schema_edges.find(
      (e) => e.from === "pos::stores" && e.to === "warehouse::load hub_store",
    );
    assert.ok(sourceEdge);
    assert.equal(sourceEdge.role, "source");
  });
});

// ---------------------------------------------------------------------------
// satsuma graph (empty workspace)
// ---------------------------------------------------------------------------
describe("satsuma graph (empty workspace)", () => {
  it("produces valid empty graph JSON for empty directory", async () => {
    // Use a temp directory with no .stm files
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const emptyDir = mkdtempSync(resolve(tmpdir(), "stm-graph-test-"));
    const { stdout, code } = await run("graph", "--json", emptyDir);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.version, 1);
    assert.equal(data.stats.schemas, 0);
    assert.equal(data.stats.arrows, 0);
    assert.deepEqual(data.nodes, []);
    assert.deepEqual(data.edges, []);
    assert.deepEqual(data.schema_edges, []);
  });
});

// ---------------------------------------------------------------------------
// satsuma graph (parse errors)
// ---------------------------------------------------------------------------
describe("satsuma graph (parse errors)", () => {
  it("produces partial graph with error count for files with parse errors", async () => {
    const { stdout, code } = await run("graph", "--json", resolve(FIXTURES, "parse-error.stm"));
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.stats.errors > 0, "should report parse errors");
  });
});

// ---------------------------------------------------------------------------
// slices extraction
// ---------------------------------------------------------------------------
describe("satsuma graph (slices)", () => {
  it("extracts slices for metrics with slice declarations", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const mrr = data.nodes.find((n) => n.id === "monthly_recurring_revenue");
    assert.ok(mrr, "should have monthly_recurring_revenue metric");
    assert.deepEqual(mrr.slices, ["customer_segment", "product_line", "region"]);
  });

  it("returns empty slices for metrics without slice declarations", async () => {
    const { stdout } = await run("graph", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    const metric = data.nodes.find((n) => n.kind === "metric" && n.slices.length === 0);
    assert.ok(metric, "should have a metric with empty slices");
  });
});
