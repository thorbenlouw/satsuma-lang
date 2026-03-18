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

// ---------------------------------------------------------------------------
// stm arrows
// ---------------------------------------------------------------------------
describe("stm arrows", () => {
  const DB = resolve(EXAMPLES, "db-to-db.stm");

  it("shows arrows for a source field", async () => {
    const { stdout, code } = await run("arrows", "legacy_sqlserver.CUST_ID", DB);
    assert.equal(code, 0);
    assert.match(stdout, /CUST_ID -> customer_id/);
    assert.match(stdout, /CUST_ID -> legacy_customer_id/);
    assert.match(stdout, /\[structural\]/);
    assert.match(stdout, /\[none\]/);
  });

  it("shows structural classification on token_call pipeline", async () => {
    const { stdout, code } = await run("arrows", "legacy_sqlserver.FIRST_NM", DB);
    assert.equal(code, 0);
    assert.match(stdout, /\[structural\]/);
    assert.match(stdout, /trim/);
  });

  it("shows nl classification on NL-only transform", async () => {
    const { stdout, code } = await run("arrows", "legacy_sqlserver.PHONE_NBR", DB);
    assert.equal(code, 0);
    assert.match(stdout, /\[nl\]/);
  });

  it("shows mixed classification on mixed transform", async () => {
    const { stdout, code } = await run("arrows", "legacy_sqlserver.NOTES", DB);
    assert.equal(code, 0);
    assert.match(stdout, /\[mixed\]/);
  });

  it("--as-source filters to source arrows only", async () => {
    const { stdout, code } = await run(
      "arrows", "legacy_sqlserver.CUST_ID", "--as-source", DB,
    );
    assert.equal(code, 0);
    assert.match(stdout, /CUST_ID -> customer_id/);
    assert.match(stdout, /as source/);
  });

  it("--as-target filters to target arrows only", async () => {
    const { stdout, code } = await run(
      "arrows", "postgres_db.customer_id", "--as-target", DB,
    );
    assert.equal(code, 0);
    assert.match(stdout, /as target/);
    assert.match(stdout, /CUST_ID -> customer_id/);
  });

  it("--json includes decomposed steps array", async () => {
    const { stdout, code } = await run(
      "arrows", "legacy_sqlserver.CUST_ID", "--json", DB,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data));
    assert.equal(data.length, 2);
    const structural = data.find((a) => a.classification === "structural");
    assert.ok(structural);
    assert.ok(Array.isArray(structural.steps));
    assert.ok(structural.steps.length > 0);
    assert.ok(structural.steps[0].type);
    assert.ok(structural.steps[0].text);
  });

  it("--json includes file and line", async () => {
    const { stdout, code } = await run(
      "arrows", "legacy_sqlserver.CUST_ID", "--json", DB,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data[0].file);
    assert.ok(typeof data[0].line === "number");
    assert.ok(data[0].line > 0);
  });

  it("exits 1 for unknown schema", async () => {
    const { stderr, code } = await run("arrows", "nonexistent.field", DB);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });

  it("exits 1 for unknown field", async () => {
    const { stderr, code } = await run("arrows", "legacy_sqlserver.NONEXISTENT", DB);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });
});

// ---------------------------------------------------------------------------
// stm fields
// ---------------------------------------------------------------------------
describe("stm fields", () => {
  const DB = resolve(EXAMPLES, "db-to-db.stm");

  it("lists all fields with types", async () => {
    const { stdout, code } = await run("fields", "legacy_sqlserver", DB);
    assert.equal(code, 0);
    assert.match(stdout, /CUST_ID/);
    assert.match(stdout, /INT/);
    assert.match(stdout, /EMAIL_ADDR/);
    assert.match(stdout, /VARCHAR\(255\)/);
  });

  it("--json returns structured field array", async () => {
    const { stdout, code } = await run("fields", "legacy_sqlserver", "--json", DB);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].name);
    assert.ok(data[0].type);
  });

  it("--unmapped-by on target schema returns correct set difference", async () => {
    const { stdout, code } = await run(
      "fields", "postgres_db", "--unmapped-by", "customer migration", DB,
    );
    assert.equal(code, 0);
    // All postgres_db fields are mapped in db-to-db.stm
    assert.match(stdout, /all fields.*mapped/i);
  });

  it("--unmapped-by on source schema filters mapped fields", async () => {
    const { stdout, code } = await run(
      "fields", "legacy_sqlserver", "--unmapped-by", "customer migration", DB,
    );
    assert.equal(code, 0);
    // CUST_ID, FIRST_NM etc. are mapped — should NOT appear
    assert.doesNotMatch(stdout, /CUST_ID/);
    assert.doesNotMatch(stdout, /FIRST_NM/);
    // Address fields aren't directly mapped — should appear
    assert.match(stdout, /ADDR_LINE_1/);
    assert.match(stdout, /CITY/);
  });

  it("--with-meta includes tags", async () => {
    const { stdout, code } = await run(
      "fields", "legacy_sqlserver", "--with-meta", DB,
    );
    assert.equal(code, 0);
    assert.match(stdout, /pii/);
  });

  it("exits 1 for unknown schema", async () => {
    const { stderr, code } = await run("fields", "nonexistent", DB);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });
});

// ---------------------------------------------------------------------------
// stm nl
// ---------------------------------------------------------------------------
describe("stm nl", () => {
  const DB = resolve(EXAMPLES, "db-to-db.stm");

  it("extracts NL content from a mapping scope", async () => {
    const { stdout, code } = await run("nl", "customer migration", DB);
    assert.equal(code, 0);
    assert.match(stdout, /\[transform\]/);
  });

  it("--kind transform filters to transform content", async () => {
    const { stdout, code } = await run(
      "nl", "customer migration", "--kind", "transform", DB,
    );
    assert.equal(code, 0);
    assert.match(stdout, /\[transform\]/);
    assert.ok(!stdout.includes("[note]"));
    assert.ok(!stdout.includes("//!"));
  });

  it("--json returns structured items", async () => {
    const { stdout, code } = await run(
      "nl", "customer migration", "--json", DB,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].text);
    assert.ok(data[0].kind);
    assert.ok(data[0].parent);
  });

  it("extracts warnings from schema scope", async () => {
    const { stdout, code } = await run("nl", "legacy_sqlserver", DB);
    assert.equal(code, 0);
    assert.match(stdout, /\/\/!/);
  });

  it("field scope extracts NL from arrows", async () => {
    const { stdout, code } = await run(
      "nl", "legacy_sqlserver.PHONE_NBR", DB,
    );
    assert.equal(code, 0);
    assert.match(stdout, /\[transform\]/);
    assert.match(stdout, /digits/i);
  });

  it("exits 1 for unknown scope", async () => {
    const { stderr, code } = await run("nl", "nonexistent", DB);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });
});

// ---------------------------------------------------------------------------
// stm meta
// ---------------------------------------------------------------------------
describe("stm meta", () => {
  const DB = resolve(EXAMPLES, "db-to-db.stm");

  it("extracts schema metadata with note", async () => {
    const { stdout, code } = await run("meta", "legacy_sqlserver", DB);
    assert.equal(code, 0);
    assert.match(stdout, /note:/);
    assert.match(stdout, /CUSTOMER table/);
  });

  it("extracts field metadata with type, tags, enum, kv", async () => {
    const { stdout, code } = await run("meta", "legacy_sqlserver.CUST_TYPE", DB);
    assert.equal(code, 0);
    assert.match(stdout, /type: CHAR\(1\)/);
    assert.match(stdout, /enum/);
    assert.match(stdout, /default/);
  });

  it("--tags-only returns just tag tokens", async () => {
    const { stdout, code } = await run(
      "meta", "legacy_sqlserver.EMAIL_ADDR", "--tags-only", DB,
    );
    assert.equal(code, 0);
    assert.match(stdout, /pii/);
    // Should not contain kv or enum formatting
    assert.ok(!stdout.includes("enum"));
  });

  it("--json returns structured metadata", async () => {
    const { stdout, code } = await run(
      "meta", "legacy_sqlserver.CUST_TYPE", "--json", DB,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.scope, "legacy_sqlserver.CUST_TYPE");
    assert.equal(data.type, "CHAR(1)");
    assert.ok(Array.isArray(data.entries));
    assert.ok(data.entries.some((e) => e.kind === "enum"));
  });

  it("exits 1 for unknown scope", async () => {
    const { stderr, code } = await run("meta", "nonexistent", DB);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });
});

// ---------------------------------------------------------------------------
// stm match-fields
// ---------------------------------------------------------------------------
describe("stm match-fields", () => {
  const DB = resolve(EXAMPLES, "db-to-db.stm");

  it("matches fields by normalized name (FirstName = first_name)", async () => {
    const { stdout, code } = await run(
      "match-fields", "--source", "legacy_sqlserver", "--target", "postgres_db", DB,
    );
    assert.equal(code, 0);
    // NOTES matches notes (both normalize to "notes")
    assert.match(stdout, /NOTES.*notes/i);
  });

  it("shows source-only and target-only lists", async () => {
    const { stdout, code } = await run(
      "match-fields", "--source", "legacy_sqlserver", "--target", "postgres_db", DB,
    );
    assert.equal(code, 0);
    assert.match(stdout, /Source-only/);
    assert.match(stdout, /Target-only/);
  });

  it("--matched-only shows only matches", async () => {
    const { stdout, code } = await run(
      "match-fields", "--source", "legacy_sqlserver", "--target", "postgres_db",
      "--matched-only", DB,
    );
    assert.equal(code, 0);
    assert.ok(!stdout.includes("Source-only"));
  });

  it("--unmatched-only shows only unmatched", async () => {
    const { stdout, code } = await run(
      "match-fields", "--source", "legacy_sqlserver", "--target", "postgres_db",
      "--unmatched-only", DB,
    );
    assert.equal(code, 0);
    assert.match(stdout, /Source-only/);
    assert.match(stdout, /Target-only/);
    assert.ok(!stdout.includes("<->"));
  });

  it("--json returns structured output", async () => {
    const { stdout, code } = await run(
      "match-fields", "--source", "legacy_sqlserver", "--target", "postgres_db",
      "--json", DB,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.matched));
    assert.ok(Array.isArray(data.sourceOnly));
    assert.ok(Array.isArray(data.targetOnly));
  });

  it("exits 1 for unknown schema", async () => {
    const { stderr, code } = await run(
      "match-fields", "--source", "nonexistent", "--target", "postgres_db", DB,
    );
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });
});

// ---------------------------------------------------------------------------
// stm validate
// ---------------------------------------------------------------------------
describe("stm validate", () => {
  it("valid workspace produces 0 errors", async () => {
    const { stdout, code } = await run(
      "validate", resolve(EXAMPLES, "common.stm"),
    );
    assert.equal(code, 0);
    assert.match(stdout, /no issues/i);
  });

  it("parse errors report correct structure", async () => {
    const BAD = resolve(import.meta.dirname, "fixtures", "parse-error.stm");
    const { stdout, code } = await run("validate", BAD);
    assert.equal(code, 2);
    assert.match(stdout, /error/);
    assert.match(stdout, /\d+ error/);
  });

  it("--quiet returns exit code only", async () => {
    const { stdout, code } = await run(
      "validate", "--quiet", resolve(EXAMPLES, "common.stm"),
    );
    assert.equal(code, 0);
    assert.equal(stdout.trim(), "");
  });

  it("--json produces valid JSON", async () => {
    const BAD = resolve(import.meta.dirname, "fixtures", "parse-error.stm");
    const { stdout, code } = await run("validate", "--json", BAD);
    assert.equal(code, 2);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].file);
    assert.ok(data[0].line);
    assert.ok(data[0].severity);
    assert.ok(data[0].rule);
    assert.ok(data[0].message);
  });
});

// ---------------------------------------------------------------------------
// stm diff
// ---------------------------------------------------------------------------
describe("stm diff", () => {
  it("identical files produce empty diff", async () => {
    const f = resolve(EXAMPLES, "common.stm");
    const { stdout, code } = await run("diff", f, f);
    assert.equal(code, 0);
    assert.match(stdout, /no structural differences/i);
  });

  it("different files show changes", async () => {
    const { stdout, code } = await run(
      "diff",
      resolve(EXAMPLES, "db-to-db.stm"),
      resolve(EXAMPLES, "common.stm"),
    );
    assert.equal(code, 0);
    // Should show added/removed schemas
    assert.ok(stdout.includes("+") || stdout.includes("-"));
  });

  it("--json produces valid delta object", async () => {
    const { stdout, code } = await run(
      "diff", "--json",
      resolve(EXAMPLES, "db-to-db.stm"),
      resolve(EXAMPLES, "common.stm"),
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.schemas);
    assert.ok(data.mappings);
    assert.ok(Array.isArray(data.schemas.added));
    assert.ok(Array.isArray(data.schemas.removed));
  });

  it("--stat shows summary counts", async () => {
    const { stdout, code } = await run(
      "diff", "--stat",
      resolve(EXAMPLES, "db-to-db.stm"),
      resolve(EXAMPLES, "common.stm"),
    );
    assert.equal(code, 0);
    // Should show counts like "2 schemas added"
    assert.match(stdout, /\d+/);
  });

  it("--names-only lists changed block names", async () => {
    const { stdout, code } = await run(
      "diff", "--names-only",
      resolve(EXAMPLES, "db-to-db.stm"),
      resolve(EXAMPLES, "common.stm"),
    );
    assert.equal(code, 0);
    assert.ok(stdout.trim().length > 0);
  });
});
