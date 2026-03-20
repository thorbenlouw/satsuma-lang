/**
 * lineage.js — `satsuma lineage` command
 *
 * Traces data lineage through the workspace reference graph.
 *
 * Usage:
 *   satsuma lineage --from <schema>   downstream: schema → mappings → target schemas → metrics
 *   satsuma lineage --to <schema>     upstream: BFS path from any source to target
 *
 * Flags:
 *   --from <name>   start node for downstream walk
 *   --to <name>     target node for upstream path search
 *   --depth <n>     limit recursion depth (default 10)
 *   --compact       print names only (no file/row info)
 *   --json          emit {nodes, edges} DAG
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { buildFullGraph } from "../graph-builder.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("lineage [path]")
    .description("Trace data lineage through the workspace")
    .option("--from <name>", "start node for downstream walk")
    .option("--to <name>", "target node for upstream BFS")
    .option("--depth <n>", "maximum recursion depth", (v) => parseInt(v, 10), 10)
    .option("--compact", "print names only")
    .option("--json", "emit {nodes, edges} DAG")
    .action(async (pathArg, opts) => {
      if (!opts.from && !opts.to) {
        console.error("Provide --from <name> or --to <name>.");
        process.exit(1);
      }

      const root = pathArg ?? ".";
      let files;
      try {
        files = await resolveInput(root);
      } catch (err) {
        console.error(`Error resolving path: ${err.message}`);
        process.exit(1);
      }

      const parsedFiles = files.map((f) => parseFile(f));
      const index = buildIndex(parsedFiles);
      const graph = buildFullGraph(index);

      if (opts.from) {
        const resolved = resolveIndexKey(opts.from, graph.nodes);
        if (!resolved) {
          console.error(`Node '${opts.from}' not found.`);
          process.exit(1);
        }
        const start = resolved.key;
        const dag = buildDownstream(graph, start, opts.depth);
        if (opts.json) {
          console.log(JSON.stringify(dag, null, 2));
        } else if (opts.compact) {
          printCompact(dag, start);
        } else {
          printTree(dag, start, 0);
        }
      } else {
        const resolvedTo = resolveIndexKey(opts.to, graph.nodes);
        if (!resolvedTo) {
          console.error(`Node '${opts.to}' not found.`);
          process.exit(1);
        }
        const target = resolvedTo.key;
        const dag = buildUpstream(graph, target, opts.depth);
        if (dag.nodes.length === 0) {
          console.log(`No upstream path found to '${target}'.`);
          process.exit(1);
        }
        if (opts.json) {
          console.log(JSON.stringify(dag, null, 2));
        } else if (opts.compact) {
          for (const n of dag.nodes) console.log(n.name);
        } else {
          printUpstreamFlat(dag, target);
        }
      }
    });
}

/**
 * Build a downstream DAG from a start node up to `maxDepth`.
 * Returns {nodes: [...], edges: [{src, tgt}]}.
 */
function buildDownstream(graph, start, maxDepth) {
  const visitedNodes = new Set();
  const dagEdges = [];

  function dfs(node, depth) {
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
    nodes: [...visitedNodes].map((n) => ({ name: n, ...graph.nodes.get(n) })),
    edges: dagEdges,
  };
}

/**
 * Build the full upstream DAG from a target node up to `maxDepth`.
 * Walks reverse edges to collect all reachable upstream nodes and edges.
 * Returns {nodes: [...], edges: [{src, tgt}]}.
 */
function buildUpstream(graph, target, maxDepth) {
  // Build reverse edges
  const reverseEdges = new Map();
  for (const [src, targets] of graph.edges) {
    for (const tgt of targets) {
      if (!reverseEdges.has(tgt)) reverseEdges.set(tgt, new Set());
      reverseEdges.get(tgt).add(src);
    }
  }

  const visitedNodes = new Set();
  const dagEdges = [];

  function dfs(node, depth) {
    if (depth > maxDepth || visitedNodes.has(node)) return;
    visitedNodes.add(node);
    const parents = reverseEdges.get(node) ?? new Set();
    for (const parent of parents) {
      dagEdges.push({ src: parent, tgt: node });
      dfs(parent, depth + 1);
    }
  }

  dfs(target, 0);

  return {
    nodes: [...visitedNodes].map((n) => ({ name: n, ...graph.nodes.get(n) })),
    edges: dagEdges,
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function printUpstreamFlat(dag, target) {
  // Build adjacency (upstream direction: parent → child)
  const adj = new Map();
  for (const { src, tgt } of dag.edges) {
    if (!adj.has(src)) adj.set(src, []);
    adj.get(src).push(tgt);
  }

  // Find roots (nodes with no incoming edges in the dag)
  const hasIncoming = new Set(dag.edges.map((e) => e.tgt));
  const roots = dag.nodes.filter((n) => !hasIncoming.has(n.name)).map((n) => n.name);
  // If no roots found (e.g. target is isolated), just use target
  if (roots.length === 0) roots.push(target);

  // Print each root-to-target path
  const paths = [];
  function findPaths(node, currentPath) {
    currentPath.push(node);
    const children = adj.get(node) ?? [];
    if (children.length === 0 || node === target) {
      if (node === target) paths.push([...currentPath]);
    } else {
      for (const child of children) {
        findPaths(child, currentPath);
      }
    }
    currentPath.pop();
  }

  for (const root of roots) {
    findPaths(root, []);
  }

  if (paths.length === 0) {
    // Fallback: print all nodes
    console.log(dag.nodes.map((n) => n.name).join(" -> "));
    return;
  }

  for (const path of paths) {
    console.log(path.join(" -> "));
  }
}

function printTree(dag, start, _unused) {
  // Build adjacency from dag edges
  const adj = new Map();
  for (const { src, tgt } of dag.edges) {
    if (!adj.has(src)) adj.set(src, []);
    adj.get(src).push(tgt);
  }

  function render(node, depth, visited) {
    const nodeInfo = dag.nodes.find((n) => n.name === node);
    const type = nodeInfo?.type ?? "?";
    const prefix = "  ".repeat(depth);
    const cycleNote = visited.has(node) && depth > 0 ? " (cycle)" : "";
    console.log(`${prefix}${node}  [${type}]${cycleNote}`);
    if (visited.has(node)) return;
    visited.add(node);
    for (const child of adj.get(node) ?? []) {
      render(child, depth + 1, new Set(visited));
    }
  }

  render(start, 0, new Set());
}

function printCompact(dag, start) {
  const adj = new Map();
  for (const { src, tgt } of dag.edges) {
    if (!adj.has(src)) adj.set(src, []);
    adj.get(src).push(tgt);
  }

  const visited = new Set();
  function walk(node) {
    if (visited.has(node)) return;
    visited.add(node);
    console.log(node);
    for (const child of adj.get(node) ?? []) walk(child);
  }
  walk(start);
}
