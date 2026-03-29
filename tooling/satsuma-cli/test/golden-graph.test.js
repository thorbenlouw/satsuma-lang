/**
 * golden-graph.test.js — Regression snapshot test for `satsuma graph --json`
 *
 * Captures the full graph output over examples/ and asserts byte-for-byte
 * equality against a committed snapshot. Any change to extraction logic that
 * silently alters the graph format will fail here.
 *
 * To regenerate the snapshot (after an intentional change):
 *   cd /path/to/satsuma-lang
 *   satsuma graph --json examples/ 2>/dev/null | \
 *     node -e "
 *       const c=[];process.stdin.on('data',d=>c.push(d));
 *       process.stdin.on('end',()=>{
 *         const o=JSON.parse(c.join(''));
 *         delete o.generated;
 *         const ws=o.workspace;o.workspace='<workspace>';
 *         if(o.nodes)o.nodes=o.nodes.map(n=>({...n,file:n.file.startsWith(ws)?n.file.slice(ws.length):n.file}));
 *         if(o.edges)o.edges=o.edges.map(e=>({...e,file:e.file.startsWith(ws)?e.file.slice(ws.length):e.file}));
 *         console.log(JSON.stringify(o,null,2));
 *       });
 *     " > tooling/satsuma-cli/test/fixtures/golden-graph-output.json
 *
 * Baseline test counts (2026-03-29):
 *   CLI tests:        865
 *   LSP server tests: 278
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, "../dist/index.js");
const EXAMPLES = resolve(__dirname, "../../../examples");
const GOLDEN = resolve(__dirname, "fixtures/golden-graph-output.json");

/** Normalize the graph output to make it deterministic across runs. */
function normalizeGraph(raw) {
  const obj = JSON.parse(raw);
  delete obj.generated;
  const ws = typeof obj.workspace === "string" ? obj.workspace : "";
  obj.workspace = "<workspace>";

  function normPath(p) {
    if (typeof p === "string" && ws && p.startsWith(ws)) return p.slice(ws.length);
    return p;
  }

  if (Array.isArray(obj.nodes)) {
    obj.nodes = obj.nodes.map((n) => ({ ...n, file: normPath(n.file) }));
  }
  if (Array.isArray(obj.edges)) {
    obj.edges = obj.edges.map((e) => ({ ...e, file: normPath(e.file) }));
  }
  return JSON.stringify(obj, null, 2);
}

describe("satsuma graph --json golden snapshot", () => {
  it("produces byte-for-byte identical output to committed snapshot", async () => {
    const { stdout, stderr, code } = await new Promise((res) => {
      execFile(
        "node",
        [CLI, "graph", "--json", EXAMPLES],
        { timeout: 30_000 },
        (err, stdout, stderr) => res({ stdout: stdout ?? "", stderr: stderr ?? "", code: err ? (err.code ?? 1) : 0 }),
      );
    });
    assert.equal(code, 0, `CLI exited with code ${code}\nstderr: ${stderr}`);
    const normalized = normalizeGraph(stdout);
    const golden = readFileSync(GOLDEN, "utf8");
    assert.equal(normalized, golden, "graph --json output has changed — update the golden snapshot if intentional");
  });
});
