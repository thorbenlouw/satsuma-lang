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
        const path = bfsPath(graph, target, opts.depth);
        if (!path) {
          console.log(`No upstream path found to '${target}'.`);
          process.exit(1);
        }
        if (opts.json) {
          console.log(JSON.stringify({ path }, null, 2));
        } else {
          console.log(path.join(" -> "));
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
 * BFS upstream: find shortest path from any source (no incoming edges) to `target`.
 * Returns the path array or null.
 */
function bfsPath(graph, target, maxDepth) {
  // Build reverse edges
  const reverseEdges = new Map();
  for (const [src, targets] of graph.edges) {
    for (const tgt of targets) {
      if (!reverseEdges.has(tgt)) reverseEdges.set(tgt, new Set());
      reverseEdges.get(tgt).add(src);
    }
  }

  // BFS from target backwards
  const queue = [[target]];
  const visited = new Set([target]);

  while (queue.length > 0) {
    const path = queue.shift();
    if (path.length > maxDepth + 1) break;
    const current = path[path.length - 1];
    const parents = reverseEdges.get(current) ?? new Set();

    if (parents.size === 0) {
      // Reached a root — return reversed path
      return [...path].reverse();
    }

    for (const parent of parents) {
      if (!visited.has(parent)) {
        visited.add(parent);
        queue.push([...path, parent]);
      }
    }
  }

  return null;
}

// ── Formatters ────────────────────────────────────────────────────────────────

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
