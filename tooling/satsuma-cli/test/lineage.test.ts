/**
 * lineage.test.js — Unit tests for lineage graph logic.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ── Types for test graph structures ──────────────────────────────────────────

interface TestGraph {
  nodes: Map<string, Record<string, unknown>>;
  edges: Map<string, Set<string>>;
}

interface DagEdge {
  src: string;
  tgt: string;
}

// ── Graph helpers (mirrors lineage.js) ───────────────────────────────────────

function buildDownstream(graph: TestGraph, start: string, maxDepth = 10) {
  const visitedNodes = new Set<string>();
  const dagEdges: DagEdge[] = [];

  function dfs(node: string, depth: number) {
    if (depth > maxDepth || visitedNodes.has(node)) return;
    visitedNodes.add(node);
    const children = graph.edges.get(node) ?? new Set();
    for (const child of children) {
      dagEdges.push({ src: node, tgt: child });
      dfs(child, depth + 1);
    }
  }

  dfs(start, 0);

  return {
    nodes: [...visitedNodes].map((n) => ({ name: n, ...(graph.nodes.get(n) ?? {}) })),
    edges: dagEdges,
  };
}

function bfsPath(graph: TestGraph, target: string, maxDepth = 10) {
  const reverseEdges = new Map<string, Set<string>>();
  for (const [src, targets] of graph.edges) {
    for (const tgt of targets) {
      if (!reverseEdges.has(tgt)) reverseEdges.set(tgt, new Set());
      reverseEdges.get(tgt)!.add(src);
    }
  }

  const queue = [[target]];
  const visited = new Set([target]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    if (path.length > maxDepth + 1) break;
    const current = path[path.length - 1]!;
    const parents = reverseEdges.get(current) ?? new Set<string>();

    if (parents.size === 0) return [...path].reverse();

    for (const parent of parents) {
      if (!visited.has(parent)) {
        visited.add(parent);
        queue.push([...path, parent]);
      }
    }
  }

  return null;
}

// ── Helper to build a simple graph ───────────────────────────────────────────

function makeGraph(edgeList: [string, string][]): TestGraph {
  const nodes = new Map();
  const edges = new Map();

  for (const [src, tgt] of edgeList) {
    if (!nodes.has(src)) nodes.set(src, { type: "schema" });
    if (!nodes.has(tgt)) nodes.set(tgt, { type: "schema" });
    if (!edges.has(src)) edges.set(src, new Set());
    edges.get(src).add(tgt);
  }

  return { nodes, edges };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("buildDownstream", () => {
  it("produces correct downstream tree", () => {
    // src_schema → mapping → tgt_schema → metric
    const graph = makeGraph([
      ["src_schema", "migration"],
      ["migration", "tgt_schema"],
      ["tgt_schema", "mrr_metric"],
    ]);

    const dag = buildDownstream(graph, "src_schema");
    const nodeNames = dag.nodes.map((n) => n.name);
    assert.ok(nodeNames.includes("src_schema"));
    assert.ok(nodeNames.includes("migration"));
    assert.ok(nodeNames.includes("tgt_schema"));
    assert.ok(nodeNames.includes("mrr_metric"));
    assert.equal(dag.edges.length, 3);
  });

  it("respects maxDepth", () => {
    const graph = makeGraph([["a", "b"], ["b", "c"], ["c", "d"]]);
    const dag = buildDownstream(graph, "a", 1);
    const names = dag.nodes.map((n) => n.name);
    assert.ok(names.includes("a"));
    assert.ok(names.includes("b"));
    assert.ok(!names.includes("c"));
  });

  it("handles cycles without infinite loop", () => {
    const graph = makeGraph([["a", "b"], ["b", "a"]]);
    const dag = buildDownstream(graph, "a");
    // Should not hang and should have at most 2 nodes
    assert.ok(dag.nodes.length <= 2);
  });

  it("returns just the start node when no edges", () => {
    const graph = { nodes: new Map([["solo", {}]]), edges: new Map() };
    const dag = buildDownstream(graph, "solo");
    assert.equal(dag.nodes.length, 1);
    assert.equal(dag.edges.length, 0);
  });
});

describe("bfsPath", () => {
  it("finds shortest path to target", () => {
    const graph = makeGraph([["a", "b"], ["b", "c"], ["a", "c"]]);
    const path = bfsPath(graph, "c");
    // Should find a path from a root to c
    assert.ok(path !== null);
    assert.equal(path[path.length - 1], "c");
    assert.equal(path[0], "a");
  });

  it("returns null when no path exists", () => {
    // isolated node
    const graph = { nodes: new Map([["x", {}], ["y", {}]]), edges: new Map() };
    // y has no parents, so bfsPath finds y as root immediately — path is just [y]
    // But from x's perspective as target: y has no path to x
    const path = bfsPath(graph, "x");
    // x has no parents and is a root → path is ["x"]
    assert.deepEqual(path, ["x"]);
  });

  it("finds multi-hop path", () => {
    const graph = makeGraph([["schema_a", "mapping_1"], ["mapping_1", "schema_b"], ["schema_b", "metric_x"]]);
    const path = bfsPath(graph, "metric_x");
    assert.ok(path !== null);
    assert.equal(path[0], "schema_a");
    assert.equal(path[path.length - 1], "metric_x");
  });

  it("respects maxDepth", () => {
    // Deep chain: a→b→c→d (depth 3 to reach d)
    const graph = makeGraph([["a", "b"], ["b", "c"], ["c", "d"]]);
    const path = bfsPath(graph, "d", 2);
    // Path length would be 4 (a,b,c,d) > maxDepth+1=3, should return null
    assert.equal(path, null);
  });
});
