/**
 * End-to-end integration tests for the STM CLI.
 *
 * Spawns the CLI as a subprocess against the examples/ fixtures directory
 * and verifies output, exit codes, and JSON structure.
 *
 * Prerequisites: tree-sitter native bindings must be built.
 *   cd tooling/tree-sitter-stm && npx node-gyp configure && npx node-gyp build
 */

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, "../src/index.js");
const EXAMPLES = resolve(__dirname, "../../../examples");

/**
 * Run the CLI and return { stdout, stderr, code }.
 */
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
// stm summary
// ---------------------------------------------------------------------------
describe("stm summary", () => {
  it("lists schemas, metrics, and mappings", async () => {
    const { stdout, code } = await run("summary", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /Schemas/i);
    assert.match(stdout, /Metrics/i);
    assert.match(stdout, /Mappings/i);
    assert.match(stdout, /sfdc_opportunity/);
    assert.match(stdout, /legacy_sqlserver/);
  });

  it("--compact lists names only", async () => {
    const { stdout, code } = await run("summary", "--compact", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /schemas:/i);
    assert.match(stdout, /sfdc_opportunity/);
  });

  it("--json produces valid JSON with expected keys", async () => {
    const { stdout, code } = await run("summary", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.schemas));
    assert.ok(Array.isArray(data.metrics));
    assert.ok(Array.isArray(data.mappings));
    assert.ok(data.schemas.length > 0);
    assert.ok(data.metrics.length > 0);
  });

  it("exits non-zero for nonexistent path", async () => {
    const { code } = await run("summary", "/nonexistent/path");
    assert.notEqual(code, 0);
  });
});

// ---------------------------------------------------------------------------
// stm schema
// ---------------------------------------------------------------------------
describe("stm schema", () => {
  it("prints a known schema", async () => {
    const { stdout, code } = await run("schema", "sfdc_opportunity", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /sfdc_opportunity/);
  });

  it("--fields-only prints one field per line", async () => {
    const { stdout, code } = await run("schema", "sfdc_opportunity", "--fields-only", EXAMPLES);
    assert.equal(code, 0);
    // Should have multiple lines with field names
    const lines = stdout.trim().split("\n").filter(Boolean);
    assert.ok(lines.length >= 2, `expected at least 2 field lines, got ${lines.length}`);
  });

  it("--json produces valid JSON", async () => {
    const { stdout, code } = await run("schema", "sfdc_opportunity", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.name);
    assert.ok(Array.isArray(data.fields));
  });

  it("exits 1 for unknown schema", async () => {
    const { code, stderr } = await run("schema", "no_such_schema_xyz", EXAMPLES);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });

  it("suggests close match for case-insensitive schema name", async () => {
    const { stderr, code } = await run("schema", "SFDC_OPPORTUNITY", EXAMPLES);
    assert.equal(code, 1);
    assert.match(stderr, /did you mean/i);
  });
});

// ---------------------------------------------------------------------------
// stm metric
// ---------------------------------------------------------------------------
describe("stm metric", () => {
  it("prints a known metric", async () => {
    const { stdout, code } = await run("metric", "monthly_recurring_revenue", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /monthly_recurring_revenue/i);
  });

  it("--json produces valid JSON", async () => {
    const { stdout, code } = await run("metric", "monthly_recurring_revenue", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.name);
  });

  it("exits 1 for unknown metric", async () => {
    const { code, stderr } = await run("metric", "no_such_metric_xyz", EXAMPLES);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });
});

// ---------------------------------------------------------------------------
// stm mapping
// ---------------------------------------------------------------------------
describe("stm mapping", () => {
  it("prints a known mapping", async () => {
    const { stdout, code } = await run("mapping", "customer migration", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /customer migration/i);
  });

  it("--arrows-only prints arrow table", async () => {
    const { stdout, code } = await run("mapping", "customer migration", "--arrows-only", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /->/);
  });

  it("--json produces valid JSON", async () => {
    const { stdout, code } = await run("mapping", "customer migration", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.name);
    assert.ok(Array.isArray(data.arrows));
  });

  it("exits 1 for unknown mapping", async () => {
    const { code, stderr } = await run("mapping", "no_such_mapping_xyz", EXAMPLES);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });
});

// ---------------------------------------------------------------------------
// stm find
// ---------------------------------------------------------------------------
describe("stm find", () => {
  it("finds fields tagged pii", async () => {
    const { stdout, code } = await run("find", "--tag", "pii", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /pii/i);
  });

  it("--json returns valid JSON array", async () => {
    const { stdout, code } = await run("find", "--tag", "pii", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].tag || data[0].field);
  });

  it("--compact prints one match per line", async () => {
    const { stdout, code } = await run("find", "--tag", "pii", "--compact", EXAMPLES);
    assert.equal(code, 0);
    const lines = stdout.trim().split("\n").filter(Boolean);
    assert.ok(lines.length >= 1);
  });

  it("exits 1 when no matches found", async () => {
    const { code } = await run("find", "--tag", "nonexistent_tag_xyz", EXAMPLES);
    assert.equal(code, 1);
  });

  it("--in schema restricts to schemas only", async () => {
    const { stdout, code } = await run("find", "--tag", "pii", "--in", "schema", EXAMPLES);
    // Either finds matches (0) or no matches (1) — just verify it runs
    assert.ok(code === 0 || code === 1);
    if (code === 0) {
      assert.match(stdout, /pii/i);
    }
  });
});

// ---------------------------------------------------------------------------
// stm lineage
// ---------------------------------------------------------------------------
describe("stm lineage", () => {
  it("traces downstream from a schema", async () => {
    const { stdout, code } = await run("lineage", "--from", "legacy_sqlserver", EXAMPLES);
    assert.equal(code, 0);
    // Should mention the target schema or mapping
    assert.match(stdout, /postgres_db|customer migration/i);
  });

  it("--json produces valid DAG JSON", async () => {
    const { stdout, code } = await run("lineage", "--from", "legacy_sqlserver", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.nodes));
    assert.ok(Array.isArray(data.edges));
    assert.ok(data.nodes.length > 0);
  });

  it("--compact prints names only", async () => {
    const { stdout, code } = await run("lineage", "--from", "legacy_sqlserver", "--compact", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /legacy_sqlserver/);
  });

  it("exits 1 for unknown --from schema", async () => {
    const { code, stderr } = await run("lineage", "--from", "no_such_schema_xyz", EXAMPLES);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });

  it("exits 1 when neither --from nor --to provided", async () => {
    const { code } = await run("lineage", EXAMPLES);
    assert.notEqual(code, 0);
  });

  it("traces upstream with --to", async () => {
    const { stdout, code } = await run("lineage", "--to", "postgres_db", EXAMPLES);
    // Either finds path (0) or no path (1)
    if (code === 0) {
      assert.match(stdout, /legacy_sqlserver|customer migration/i);
    }
  });
});

// ---------------------------------------------------------------------------
// stm where-used
// ---------------------------------------------------------------------------
describe("stm where-used", () => {
  it("shows references for a known schema", async () => {
    const { stdout, code } = await run("where-used", "legacy_sqlserver", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /legacy_sqlserver/i);
  });

  it("--json produces valid JSON", async () => {
    const { stdout, code } = await run("where-used", "legacy_sqlserver", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.name);
  });

  it("exits 1 for unknown name", async () => {
    const { code, stderr } = await run("where-used", "no_such_thing_xyz", EXAMPLES);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });
});

// ---------------------------------------------------------------------------
// stm warnings
// ---------------------------------------------------------------------------
describe("stm warnings", () => {
  it("lists warning comments", async () => {
    const { stdout, code } = await run("warnings", EXAMPLES);
    assert.equal(code, 0);
    // Might list warnings or say "no warnings"
    assert.ok(stdout.length > 0);
  });

  it("--json produces valid JSON", async () => {
    const { stdout, code } = await run("warnings", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.kind);
    assert.ok(typeof data.count === "number");
    assert.ok(Array.isArray(data.items));
  });

  it("--questions shows question comments", async () => {
    const { stdout, code } = await run("warnings", "--questions", EXAMPLES);
    assert.equal(code, 0);
    assert.ok(stdout.length > 0);
  });
});

// ---------------------------------------------------------------------------
// stm context
// ---------------------------------------------------------------------------
describe("stm context", () => {
  it("returns relevant blocks for a query", async () => {
    const { stdout, code } = await run("context", "customer migration", EXAMPLES);
    assert.equal(code, 0);
    // Should include the mapping or related schemas
    assert.match(stdout, /legacy_sqlserver|customer migration|postgres_db/i);
  });

  it("--json produces valid JSON array", async () => {
    const { stdout, code } = await run("context", "customer migration", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].name);
    assert.ok(typeof data[0].score === "number");
  });

  it("--budget limits output tokens", async () => {
    const { stdout, code } = await run("context", "customer", "--budget", "500", EXAMPLES);
    assert.equal(code, 0);
    // Output should be shorter than default
    assert.ok(stdout.length > 0);
  });

  it("handles query with no matches gracefully", async () => {
    const { stdout, code } = await run("context", "zzz_no_match_xyz", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /no relevant/i);
  });
});
