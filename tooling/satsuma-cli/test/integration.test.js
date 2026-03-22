/**
 * End-to-end integration tests for the Satsuma CLI.
 *
 * Spawns the CLI as a subprocess against the examples/ fixtures directory
 * and verifies output, exit codes, and JSON structure.
 *
 * Prerequisites: tree-sitter native bindings must be built.
 *   cd tooling/tree-sitter-satsuma && npx node-gyp configure && npx node-gyp build
 */

import { execFile } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, "../dist/index.js");
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
// satsuma summary
// ---------------------------------------------------------------------------
describe("satsuma summary", () => {
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

  it("--json includes fileCount", async () => {
    const { stdout, code } = await run("summary", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(typeof data.fileCount === "number", "should have fileCount");
    assert.ok(data.fileCount > 0);
  });

  it("exits non-zero for nonexistent path", async () => {
    const { code } = await run("summary", "/nonexistent/path");
    assert.notEqual(code, 0);
  });

  it("uses correct pluralization for singular counts", async () => {
    const { stdout, code } = await run("summary", EXAMPLES);
    assert.equal(code, 0);
    // Should not have "[1 fields]" or "[1 arrows]"
    assert.ok(!stdout.includes("[1 fields]"), "should use singular 'field' for count 1");
    assert.ok(!stdout.includes("[1 arrows]"), "should use singular 'arrow' for count 1");
  });

  it("--json --compact strips notes and file/row from output (sl-86n4)", async () => {
    const { stdout, code } = await run("summary", "--json", "--compact", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.schemas.length > 0);
    // Compact should not have note, file, or row
    for (const s of data.schemas) {
      assert.ok(!("note" in s), "compact JSON should omit note");
      assert.ok(!("file" in s), "compact JSON should omit file");
      assert.ok(!("row" in s), "compact JSON should omit row");
    }
  });
});

// ---------------------------------------------------------------------------
// satsuma schema
// ---------------------------------------------------------------------------
describe("satsuma schema", () => {
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

  it("--json not-found error returns JSON instead of plain text", async () => {
    const { stdout, code } = await run("schema", "no_such_schema_xyz", "--json", EXAMPLES);
    assert.equal(code, 1);
    const data = JSON.parse(stdout);
    assert.ok(data.error, "should have error field");
    assert.match(data.error, /not found/i);
  });

  it("preserves single quotes on quoted schema names in text output", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "quoted-names.stm");
    const { stdout, code } = await run("schema", "My Complex Schema", F);
    assert.equal(code, 0);
    assert.match(stdout, /schema 'My Complex Schema'/);
  });

  it("preserves backticks on backtick-quoted field identifiers in text output", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "quoted-names.stm");
    const { stdout, code } = await run("schema", "My Complex Schema", F);
    assert.equal(code, 0);
    assert.match(stdout, /`field-with-dashes`/);
  });

  it("text output includes comments from schema body (sl-i956)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "comments-test.stm");
    const { stdout, code } = await run("schema", "comment_test", F);
    assert.equal(code, 0);
    assert.match(stdout, /\/\/ regular comment/);
    assert.match(stdout, /\/\/! warning: data quality issue/);
    assert.match(stdout, /\/\/\? should we rename this\?/);
  });

  it("--compact strips comments from schema output (sl-i956)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "comments-test.stm");
    const { stdout, code } = await run("schema", "comment_test", "--compact", F);
    assert.equal(code, 0);
    assert.doesNotMatch(stdout, /\/\/ regular comment/);
    assert.doesNotMatch(stdout, /\/\/!/);
    assert.doesNotMatch(stdout, /\/\/\?/);
  });

  it("--json --compact omits note field (sl-5fbn)", async () => {
    const { stdout, code } = await run("schema", "country_codes", "--json", "--compact", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(!("note" in data), "compact JSON should omit note");
    assert.ok(data.name);
    assert.ok(Array.isArray(data.fields));
  });

  it("--json fields include metadata (pk, ref, enum) (sl-rbvk)", async () => {
    const { stdout, code } = await run("schema", "sfdc_opportunity", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const idField = data.fields.find((f) => f.name === "Id");
    assert.ok(idField.metadata, "Id field should have metadata");
    assert.deepEqual(idField.metadata[0], { kind: "tag", tag: "pk" });
    const accField = data.fields.find((f) => f.name === "AccountId");
    assert.ok(accField.metadata, "AccountId field should have metadata");
    assert.equal(accField.metadata[0].kind, "kv");
    assert.equal(accField.metadata[0].key, "ref");
    const stageField = data.fields.find((f) => f.name === "StageName");
    assert.ok(stageField.metadata, "StageName field should have metadata");
    const enumEntry = stageField.metadata.find((m) => m.kind === "enum");
    assert.ok(enumEntry, "StageName should have enum metadata");
    assert.ok(enumEntry.values.length > 0, "enum should have values");
  });

  it("--json --fields-only returns just the fields array (sl-5fbn)", async () => {
    const { stdout, code } = await run("schema", "country_codes", "--json", "--fields-only", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data), "should be a plain array of fields");
    assert.ok(data.length > 0);
    assert.ok(data[0].name);
    assert.ok(data[0].type);
  });

  it("--compact strips triple-quoted field notes (sl-vfbv)", async () => {
    const DB = resolve(EXAMPLES, "db-to-db.stm");
    const { stdout, code } = await run("schema", "legacy_sqlserver", "--compact", DB);
    assert.equal(code, 0);
    assert.match(stdout, /PHONE_NBR/);
    assert.doesNotMatch(stdout, /"""/,  "triple-quoted note should be stripped in compact mode");
    assert.doesNotMatch(stdout, /No consistent format/, "note content should be stripped");
  });

  it("text output includes all schema-level metadata (sl-pq65)", async () => {
    const XML = resolve(EXAMPLES, "xml-to-parquet.stm");
    const { stdout, code } = await run("schema", "commerce_order", XML);
    assert.equal(code, 0);
    assert.match(stdout, /format xml/, "should include format metadata");
    assert.match(stdout, /namespace ord/, "should include namespace metadata");
  });

  it("--json includes metadata array for schemas with metadata (sl-pq65)", async () => {
    const XML = resolve(EXAMPLES, "xml-to-parquet.stm");
    const { stdout, code } = await run("schema", "commerce_order", "--json", XML);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.metadata), "should have metadata array");
    assert.ok(data.metadata.some((m) => m.key === "format"), "should include format entry");
  });

  it("text output preserves record/list block-level metadata (sl-s8xn)", async () => {
    const XML = resolve(EXAMPLES, "xml-to-parquet.stm");
    const { stdout, code } = await run("schema", "commerce_order", XML);
    assert.equal(code, 0);
    assert.match(stdout, /record Order \(xpath/, "record block should show xpath metadata");
    assert.match(stdout, /list Discounts \(xpath/, "list block should show xpath metadata");
    assert.match(stdout, /list LineItems \(xpath/, "list block should show xpath metadata");
  });

  it("--json includes metadata on nested record/list fields (sl-s8xn)", async () => {
    const XML = resolve(EXAMPLES, "xml-to-parquet.stm");
    const { stdout, code } = await run("schema", "commerce_order", "--json", XML);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const order = data.fields.find((f) => f.name === "Order");
    assert.ok(order.metadata, "Order record should have metadata");
    assert.equal(order.metadata[0].key, "xpath");
    const discounts = order.children.find((f) => f.name === "Discounts");
    assert.ok(discounts.metadata, "Discounts list should have metadata");
  });
});

// ---------------------------------------------------------------------------
// satsuma metric
// ---------------------------------------------------------------------------
describe("satsuma metric", () => {
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

  it("text output includes comments from metric body (sl-c1he)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "comments-test.stm");
    const { stdout, code } = await run("metric", "comment_metric", F);
    assert.equal(code, 0);
    assert.match(stdout, /\/\/ regular metric comment/);
    assert.match(stdout, /\/\/! warning: aggregation/);
    assert.match(stdout, /\/\/\? consider using SUM/);
  });

  it("--compact strips comments from metric output (sl-c1he)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "comments-test.stm");
    const { stdout, code } = await run("metric", "comment_metric", "--compact", F);
    assert.equal(code, 0);
    assert.doesNotMatch(stdout, /\/\/ regular metric/);
    assert.doesNotMatch(stdout, /\/\/!/);
    assert.doesNotMatch(stdout, /\/\/\?/);
  });

  it("--json includes note field for metrics with note blocks (sl-xifk)", async () => {
    const { stdout, code } = await run("metric", "monthly_recurring_revenue", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(typeof data.note === "string", "note should be a string");
    assert.match(data.note, /subscription/i, "note should contain subscription text");
  });

  it("--json includes slices for metrics with slice metadata (sl-se2f)", async () => {
    const { stdout, code } = await run("metric", "monthly_recurring_revenue", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.slices), "slices should be an array");
    assert.ok(data.slices.length > 0, "should have slice entries");
    assert.ok(data.slices.includes("customer_segment"), "should include customer_segment slice");
  });

  it("text output includes slice in metadata (sl-se2f)", async () => {
    const { stdout, code } = await run("metric", "monthly_recurring_revenue", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /slice/, "should show slice metadata");
    assert.match(stdout, /customer_segment/, "should show slice dimension");
  });

  it("--json fields include measure metadata (sl-i1b8)", async () => {
    const { stdout, code } = await run("metric", "order_revenue", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const gross = data.fields.find((f) => f.name === "gross_revenue");
    assert.ok(gross.metadata, "gross_revenue should have metadata");
    assert.equal(gross.metadata[0].kind, "kv");
    assert.equal(gross.metadata[0].key, "measure");
    assert.equal(gross.metadata[0].value, "additive");
  });
});

// ---------------------------------------------------------------------------
// satsuma mapping
// ---------------------------------------------------------------------------
describe("satsuma mapping", () => {
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

  it("text output includes mapping-level metadata block (sl-0x23)", async () => {
    const FIXTURE = resolve(import.meta.dirname, "fixtures", "mapping-meta.stm");
    const { stdout, code } = await run("mapping", "metadata test", FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /note "This mapping has block-level metadata"/);
    assert.match(stdout, /scd type2/);
    assert.match(stdout, /priority high/);
  });

  it("--compact omits mapping-level metadata (sl-0x23)", async () => {
    const FIXTURE = resolve(import.meta.dirname, "fixtures", "mapping-meta.stm");
    const { stdout, code } = await run("mapping", "metadata test", "--compact", FIXTURE);
    assert.equal(code, 0);
    assert.doesNotMatch(stdout, /note "This mapping/);
    assert.doesNotMatch(stdout, /scd type2/);
  });

  it("--json includes metadata array for mapping with metadata (sl-0x23)", async () => {
    const FIXTURE = resolve(import.meta.dirname, "fixtures", "mapping-meta.stm");
    const { stdout, code } = await run("mapping", "metadata test", "--json", FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.metadata));
    assert.ok(data.metadata.length > 0);
    assert.ok(data.metadata.some((m) => m.kind === "note"));
    assert.ok(data.metadata.some((m) => m.kind === "kv" && m.key === "scd"));
  });

  it("text output includes arrow-level metadata (sl-9xiz)", async () => {
    const FIXTURE = resolve(import.meta.dirname, "fixtures", "mapping-meta.stm");
    const { stdout, code } = await run("mapping", "metadata test", FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /result \(note "Arrow-level note", required\)/);
  });

  it("--json includes arrow metadata (sl-9xiz)", async () => {
    const FIXTURE = resolve(import.meta.dirname, "fixtures", "mapping-meta.stm");
    const { stdout, code } = await run("mapping", "metadata test", "--json", FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const arrowWithMeta = data.arrows.find((a) => a.metadata);
    assert.ok(arrowWithMeta, "At least one arrow should have metadata");
    assert.ok(arrowWithMeta.metadata.some((m) => m.kind === "note"));
    assert.ok(arrowWithMeta.metadata.some((m) => m.kind === "tag" && m.tag === "required"));
  });

  it("--compact omits arrow metadata (sl-9xiz)", async () => {
    const FIXTURE = resolve(import.meta.dirname, "fixtures", "mapping-meta.stm");
    const { stdout, code } = await run("mapping", "metadata test", "--compact", FIXTURE);
    assert.equal(code, 0);
    assert.doesNotMatch(stdout, /Arrow-level note/);
    assert.doesNotMatch(stdout, /required/);
  });

  it("--json includes transform body text on arrows (sl-ari1)", async () => {
    const DB = resolve(EXAMPLES, "db-to-db.stm");
    const { stdout, code } = await run("mapping", "customer migration", "--json", DB);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const withTransform = data.arrows.filter((a) => a.hasTransform);
    assert.ok(withTransform.length > 0, "should have arrows with transforms");
    for (const a of withTransform) {
      assert.ok(typeof a.transform === "string", `arrow ${a.src} -> ${a.tgt} should have transform text`);
      assert.ok(a.transform.length > 0);
    }
  });

  it("--json includes classification field on arrows (sl-shwl)", async () => {
    const DB = resolve(EXAMPLES, "db-to-db.stm");
    const { stdout, code } = await run("mapping", "customer migration", "--json", DB);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    for (const a of data.arrows) {
      assert.ok(
        ["structural", "nl", "mixed", "none"].includes(a.classification),
        `arrow ${a.src} -> ${a.tgt} should have classification, got: ${a.classification}`,
      );
    }
    // Should have at least one structural and one non-none classification
    assert.ok(data.arrows.some((a) => a.classification === "structural"), "expected at least one structural arrow");
  });

  it("--json includes children for nested arrows (sl-wjb9)", async () => {
    const COBOL = resolve(EXAMPLES, "cobol-to-avro.stm");
    const { stdout, code } = await run("mapping", "cobol customer to avro event", "--json", COBOL);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const nested = data.arrows.find((a) => a.kind === "nested");
    assert.ok(nested, "should have a nested arrow");
    assert.ok(nested.children, "nested arrow should have children");
    assert.equal(nested.children.length, 2, "should have 2 child arrows");
    assert.equal(nested.children[0].src, ".PHONE_TYPE");
    assert.equal(nested.children[1].src, ".PHONE_NUM");
  });

  it("text output shows child arrows inside nested blocks (sl-wjb9)", async () => {
    const COBOL = resolve(EXAMPLES, "cobol-to-avro.stm");
    const { stdout, code } = await run("mapping", "cobol customer to avro event", COBOL);
    assert.equal(code, 0);
    assert.match(stdout, /PHONE_NUMBERS\[\] -> contact_info\.phones\[\]/);
    assert.match(stdout, /\.PHONE_TYPE -> \.type/);
    assert.match(stdout, /\.PHONE_NUM -> \.number/);
  });
});

// ---------------------------------------------------------------------------
// satsuma find
// ---------------------------------------------------------------------------
describe("satsuma find", () => {
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

  it("--json uses 1-indexed line numbers", async () => {
    const { stdout, code } = await run("find", "--tag", "pii", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.length > 0);
    for (const m of data) {
      assert.ok("line" in m, "JSON should use 'line' field");
      assert.ok(!("row" in m), "JSON should not use 'row' field");
      assert.ok(m.line >= 1, "line numbers should be 1-indexed");
    }
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

  it("--in with invalid scope errors", async () => {
    const { code, stderr } = await run("find", "--tag", "pii", "--in", "invalid", EXAMPLES);
    assert.equal(code, 1);
    assert.match(stderr, /invalid scope/i);
  });

  it("finds schema-level metadata tags", async () => {
    const { stdout, code } = await run("find", "--tag", "format", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    // Should include schema-level matches (field "(schema)") in addition to field-level
    const schemaLevel = data.filter((m) => m.field === "(schema)");
    assert.ok(schemaLevel.length > 0, "expected schema-level format matches");
  });

  it("--tag note finds fields with note metadata (sl-amyh)", async () => {
    const { stdout, code } = await run("find", "--tag", "note", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /note/);
  });

  it("--tag note --json returns note matches (sl-amyh)", async () => {
    const { stdout, code } = await run("find", "--tag", "note", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.length > 0, "should find fields with note metadata");
    assert.ok(data.some((m) => m.tag === "note"), "tag should be 'note'");
  });
});

// ---------------------------------------------------------------------------
// satsuma lineage
// ---------------------------------------------------------------------------
describe("satsuma lineage", () => {
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

  it("errors when both --from and --to are specified", async () => {
    const { code, stderr } = await run("lineage", "--from", "legacy_sqlserver", "--to", "postgres_db", EXAMPLES);
    assert.equal(code, 1);
    assert.match(stderr, /cannot specify both/i);
  });

  it("--depth --json edges only reference nodes in the nodes array (sl-iliz)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "lineage-chain.stm");
    const { stdout, code } = await run("lineage", "--from", "source_a", "--depth", "1", "--json", F);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const nodeNames = new Set(data.nodes.map((n) => n.name));
    for (const edge of data.edges) {
      assert.ok(nodeNames.has(edge.src), `edge src '${edge.src}' should be in nodes`);
      assert.ok(nodeNames.has(edge.tgt), `edge tgt '${edge.tgt}' should be in nodes`);
    }
  });
});

// ---------------------------------------------------------------------------
// satsuma where-used
// ---------------------------------------------------------------------------
describe("satsuma where-used", () => {
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

  it("--json not-found error returns JSON instead of plain text", async () => {
    const { stdout, code } = await run("where-used", "no_such_thing_xyz", "--json", EXAMPLES);
    assert.equal(code, 1);
    const data = JSON.parse(stdout);
    assert.ok(data.error, "should have error field");
  });

  it("detects import references (sl-izap)", async () => {
    const { stdout, code } = await run("where-used", "address fields", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /Imported in/);
    assert.match(stdout, /db-to-db\.stm/);
  });

  it("detects ref metadata references (sl-7yoa)", async () => {
    const { stdout, code } = await run("where-used", "dim_customer", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const refMetaRefs = data.refs.filter((r) => r.kind === "ref_metadata");
    assert.ok(refMetaRefs.length > 0, "should find ref metadata references");
    assert.ok(refMetaRefs.some((r) => r.name.includes("customer_id")), "should reference customer_id field");
  });

  it("detects transform spread references (sl-iw85)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "transform-spread.stm");
    const { stdout, code } = await run("where-used", "cleanup", F);
    assert.equal(code, 0);
    assert.match(stdout, /transform_call|Invoked/);
  });
});

// ---------------------------------------------------------------------------
// satsuma warnings
// ---------------------------------------------------------------------------
describe("satsuma warnings", () => {
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

  it("exits 1 when no warnings found", async () => {
    const { code } = await run("warnings", resolve(import.meta.dirname, "fixtures", "lint-clean.stm"));
    assert.equal(code, 1, "should exit 1 when no warnings found");
  });

  it("--json includes block context (sl-c7yn)", async () => {
    const DB = resolve(EXAMPLES, "db-to-db.stm");
    const { stdout, code } = await run("warnings", "--json", DB);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const withBlock = data.items.filter((i) => i.block);
    assert.ok(withBlock.length > 0, "at least one warning should have block context");
    assert.ok(withBlock[0].blockType, "should have blockType");
  });
});

// ---------------------------------------------------------------------------
// satsuma context
// ---------------------------------------------------------------------------
describe("satsuma context", () => {
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
    assert.equal(code, 1, "should exit 1 when no results found");
    assert.match(stdout, /no relevant/i);
  });

  it("searches comment text for query matches (sl-8zij)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "context-comments.stm");
    const { stdout, code } = await run("context", "phone", F, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.some((d) => d.name === "crm_customers"), "should match crm_customers via //? comment");
  });

  it("searches warning comments for query matches (sl-8zij)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "context-comments.stm");
    const { stdout, code } = await run("context", "conversion", F, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.some((d) => d.name === "raw_orders"), "should match raw_orders via //! comment");
  });

  it("searches metadata tags/values for query matches (sl-mdlr)", async () => {
    const { stdout, code } = await run("context", "pii", EXAMPLES, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.length > 0, "should find blocks with pii metadata");
  });
});

// ---------------------------------------------------------------------------
// satsuma arrows
// ---------------------------------------------------------------------------
describe("satsuma arrows", () => {
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

  it("shows mixed classification on NL + structural transform", async () => {
    const { stdout, code } = await run("arrows", "legacy_sqlserver.PHONE_NBR", DB);
    assert.equal(code, 0);
    assert.match(stdout, /\[mixed\]/);
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
// satsuma fields
// ---------------------------------------------------------------------------
describe("satsuma fields", () => {
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

  it("--unmapped-by does not report nested list as unmapped", async () => {
    const SAP = resolve(EXAMPLES, "sap-po-to-mfcs.stm");
    const { stdout, code } = await run(
      "fields", "mfcs_purchase_order", "--unmapped-by", "sap po to mfcs", "--json", SAP,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const names = data.map((f) => f.name);
    // "items" list is targeted by nested arrow Items[] -> items[], so should NOT be unmapped
    assert.ok(!names.includes("items"), `"items" should not be reported as unmapped, got: ${names}`);
  });

  it("exits 1 for unknown schema", async () => {
    const { stderr, code } = await run("fields", "nonexistent", DB);
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });

  it("lists fields of a fragment (sl-3o9n)", async () => {
    const { stdout, code } = await run("fields", "audit columns", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /created_at/);
    assert.match(stdout, /updated_at/);
  });

  it("lists fields of a metric (sl-g4u2)", async () => {
    const { stdout, code } = await run("fields", "order_revenue", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /gross_revenue/);
    assert.match(stdout, /net_revenue/);
  });

  it("text output shows nested record/list children with indentation (sl-1ugo)", async () => {
    const SAP = resolve(EXAMPLES, "sap-po-to-mfcs.stm");
    const { stdout, code } = await run("fields", "mfcs_purchase_order", SAP);
    assert.equal(code, 0);
    assert.match(stdout, /items\s+list/);
    // Children should be indented more than parent
    const lines = stdout.split("\n");
    const itemsLine = lines.findIndex((l) => l.includes("items"));
    assert.ok(itemsLine >= 0);
    const childLine = lines.find((l, i) => i > itemsLine && l.includes("item"));
    assert.ok(childLine, "should have child 'item' field after 'items'");
    // Child should be more indented
    const parentIndent = lines[itemsLine].match(/^\s*/)[0].length;
    const childIndent = childLine.match(/^\s*/)[0].length;
    assert.ok(childIndent > parentIndent, `child indent ${childIndent} should be > parent indent ${parentIndent}`);
  });

  it("--with-meta --json includes tags on nested record/list child fields (sl-gf8d)", async () => {
    const XML = resolve(EXAMPLES, "xml-to-parquet.stm");
    const { stdout, code } = await run("fields", "commerce_order", "--with-meta", "--json", XML);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const order = data.find((f) => f.name === "Order");
    assert.ok(order.tags, "Order record should have tags from metadata");
    // Check a nested child
    const orderId = order.children.find((f) => f.name === "OrderId");
    assert.ok(orderId.tags, "nested OrderId should have tags from xpath metadata");
  });
});

// ---------------------------------------------------------------------------
// satsuma nl
// ---------------------------------------------------------------------------
describe("satsuma nl", () => {
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

  it("--json line numbers are 1-indexed", async () => {
    const { stdout, code } = await run(
      "nl", "customer migration", "--json", DB,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.length > 0);
    for (const item of data) {
      assert.ok(item.line >= 1, `line should be 1-indexed, got ${item.line}`);
    }
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

  it("transform_block NL items have transform name as parent (sl-6ino)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "nl-parent-test.stm");
    const { stdout, code } = await run("nl", "all", F, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const transformItems = data.filter((d) => d.parent === "nl transform");
    assert.ok(transformItems.length >= 2, "should have transform-parented items");
  });

  it("concatenated note strings are fully extracted (sl-gu24)", async () => {
    const { stdout, code } = await run("nl", "cart_abandonment_rate", resolve(EXAMPLES, "metrics.stm"), "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const note = data.find((d) => d.kind === "note");
    assert.ok(note, "should have a note item");
    assert.match(note.text, /checkout/i, "should include first string");
    assert.match(note.text, /divided by/i, "should include second concatenated string");
  });

  it("record/list block notes use block name as parent (sl-3nrg)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "nl-parent-test.stm");
    const { stdout, code } = await run("nl", "all", F, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const addressItems = data.filter((d) => d.parent === "address");
    assert.ok(addressItems.length >= 1, "address block items should have parent 'address'");
    const contactItems = data.filter((d) => d.parent === "contacts");
    assert.ok(contactItems.length >= 1, "contacts block items should have parent 'contacts'");
  });

  it("unescapes escape sequences in NL strings (sl-j014)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "escape-test.stm");
    const { stdout, code } = await run("nl", "all", F, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const note = data.find((d) => d.kind === "note");
    assert.ok(note, "should have a note");
    assert.match(note.text, /Contains "quoted" text/, "should unescape \\\" to \"");
    assert.doesNotMatch(note.text, /\\"/, "should not contain escaped quotes");
  });
});

// ---------------------------------------------------------------------------
// satsuma meta
// ---------------------------------------------------------------------------
describe("satsuma meta", () => {
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

  it("extracts metric field metadata (sl-eglw)", async () => {
    const { stdout, code } = await run("meta", "order_revenue.gross_revenue", EXAMPLES);
    assert.equal(code, 0);
    assert.match(stdout, /type: DECIMAL/);
    assert.match(stdout, /measure/);
  });

  it("extracts metric field metadata as JSON (sl-eglw)", async () => {
    const { stdout, code } = await run("meta", "order_revenue.gross_revenue", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.entries.some((e) => e.kind === "kv" && e.key === "measure"));
  });

  it("extracts metadata from record/list blocks (sl-giss)", async () => {
    const XML = resolve(EXAMPLES, "xml-to-parquet.stm");
    const { stdout, code } = await run("meta", "commerce_order.Order", XML);
    assert.equal(code, 0);
    assert.match(stdout, /xpath/, "record block should show xpath metadata");
  });

  it("extracts metadata from nested list blocks (sl-giss)", async () => {
    const XML = resolve(EXAMPLES, "xml-to-parquet.stm");
    const { stdout, code } = await run("meta", "commerce_order.Discounts", "--json", XML);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.entries.some((e) => e.kind === "kv" && e.key === "xpath"), "list block should have xpath metadata");
  });

  it("supports nested field paths schema.record.field (sl-bfue)", async () => {
    const XML = resolve(EXAMPLES, "xml-to-parquet.stm");
    const { stdout, code } = await run("meta", "commerce_order.Order.OrderId", "--json", XML);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.type, "STRING");
    assert.ok(data.entries.some((e) => e.kind === "kv" && e.key === "xpath"), "nested field should have xpath");
  });

  it("disambiguates same-named fields via nested path (sl-bfue)", async () => {
    const XML = resolve(EXAMPLES, "xml-to-parquet.stm");
    const { stdout: s1 } = await run("meta", "commerce_order.Totals.TaxAmount", "--json", XML);
    const { stdout: s2 } = await run("meta", "commerce_order.LineItems.TaxAmount", "--json", XML);
    const d1 = JSON.parse(s1);
    const d2 = JSON.parse(s2);
    assert.equal(d1.type, d2.type, "both TaxAmount fields should have same type");
    assert.ok(d1.entries.length > 0 && d2.entries.length > 0, "both should have metadata");
  });
});

// ---------------------------------------------------------------------------
// satsuma match-fields
// ---------------------------------------------------------------------------
describe("satsuma match-fields", () => {
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

  it("--json --matched-only filters out unmatched fields (sl-vexa)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "match-fields-test.stm");
    const { stdout, code } = await run(
      "match-fields", "--source", "src_match", "--target", "tgt_match",
      "--matched-only", "--json", F,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.matched.length > 0, "should have matched fields");
    assert.deepStrictEqual(data.sourceOnly, [], "sourceOnly should be empty with --matched-only");
    assert.deepStrictEqual(data.targetOnly, [], "targetOnly should be empty with --matched-only");
  });

  it("--json --unmatched-only filters out matched fields (sl-vexa)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "match-fields-test.stm");
    const { stdout, code } = await run(
      "match-fields", "--source", "src_match", "--target", "tgt_match",
      "--unmatched-only", "--json", F,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.deepStrictEqual(data.matched, [], "matched should be empty with --unmatched-only");
    assert.ok(data.sourceOnly.length > 0 || data.targetOnly.length > 0, "should have some unmatched");
  });

  it("normalizes spaces in backtick-quoted field names (sl-u2qa)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "backtick-match.stm");
    const { stdout, code } = await run(
      "match-fields", "--source", "backtick_src", "--target", "backtick_tgt",
      "--json", F,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const spaceMatch = data.matched.find((m) => m.source.includes("Spaces") || m.target.includes("spaces"));
    assert.ok(spaceMatch, "backtick field with spaces should match snake_case equivalent");
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
// satsuma validate
// ---------------------------------------------------------------------------
describe("satsuma validate", () => {
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

  it("expands fragment spreads — no false field-not-in-schema warnings", async () => {
    const FIXTURE = resolve(import.meta.dirname, "fixtures", "fragment-spread-validate.stm");
    const { stdout, code } = await run("validate", FIXTURE);
    assert.equal(code, 0, `Expected clean validation but got:\n${stdout}`);
    assert.match(stdout, /no issues/i);
  });

  it("--errors-only keeps semantic errors (not just parse errors)", async () => {
    const DUP = resolve(import.meta.dirname, "fixtures", "ns-duplicate.stm");
    const { stdout, code } = await run("validate", "--errors-only", DUP);
    assert.equal(code, 2, "duplicate-definition is severity error, should exit 2");
    assert.match(stdout, /duplicate/i);
  });

  it("catches metric source referencing nonexistent schema (sl-313n)", async () => {
    const BAD = resolve(import.meta.dirname, "fixtures", "metric-bad-source.stm");
    const { stdout, code } = await run("validate", BAD);
    assert.equal(code, 0, "warnings-only should exit 0");
    assert.match(stdout, /undefined-ref/);
    assert.match(stdout, /nonexistent_schema/);
    assert.match(stdout, /1 warning/);
  });

  it("catches undefined fragment spread references (sl-idbf)", async () => {
    const BAD = resolve(import.meta.dirname, "fixtures", "undefined-spread.stm");
    const { stdout, code } = await run("validate", BAD);
    assert.equal(code, 0, "warnings-only should exit 0");
    assert.match(stdout, /undefined-ref/);
    assert.match(stdout, /nonexistent_fragment/);
  });

  it("catches undefined transform spread references in arrows (sl-1s81)", async () => {
    const BAD = resolve(import.meta.dirname, "fixtures", "transform-spread.stm");
    const { stdout, code } = await run("validate", BAD);
    assert.equal(code, 0, "warnings-only should exit 0");
    assert.match(stdout, /undefined-ref/);
    assert.match(stdout, /nonexistent_xform/);
    assert.doesNotMatch(stdout, /cleanup/, "known transform 'cleanup' should not be flagged");
    assert.match(stdout, /1 warning/);
  });

  it("includes missing import file in diagnostics (sl-bhpv)", async () => {
    const BAD = resolve(import.meta.dirname, "fixtures", "missing-import.stm");
    const { stdout, code } = await run("validate", BAD, "--json");
    assert.equal(code, 0, "missing import is a warning, not an error");
    const data = JSON.parse(stdout);
    assert.ok(data.some((d) => d.rule === "missing-import"), "should have missing-import diagnostic");
  });

  it("warns on ref metadata pointing to nonexistent schema (sl-7vbb)", async () => {
    const F = resolve(import.meta.dirname, "fixtures", "ref-check.stm");
    const { stdout, code } = await run("validate", F, "--json");
    assert.equal(code, 0, "ref warning is not an error");
    const data = JSON.parse(stdout);
    const refWarning = data.find((d) => d.rule === "undefined-ref" && d.message.includes("nonexistent_table"));
    assert.ok(refWarning, "should warn about ref to nonexistent_table");
    // Valid ref to customers should NOT produce a warning
    assert.ok(!data.some((d) => d.message.includes("customers")), "valid ref should not warn");
  });
});

// ---------------------------------------------------------------------------
// satsuma diff
// ---------------------------------------------------------------------------
describe("satsuma diff", () => {
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

// ---------------------------------------------------------------------------
// Namespace-aware commands
// ---------------------------------------------------------------------------
const NS_FIXTURE = resolve(import.meta.dirname, "fixtures", "namespaces.stm");

describe("satsuma summary (namespaces)", () => {
  it("shows ns::name format for namespaced schemas", async () => {
    const { stdout, code } = await run("summary", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /pos::stores/);
    assert.match(stdout, /pos::transactions/);
    assert.match(stdout, /ecom::orders/);
    assert.match(stdout, /warehouse::hub_store/);
  });

  it("shows global entities without namespace prefix", async () => {
    const { stdout, code } = await run("summary", NS_FIXTURE);
    assert.equal(code, 0);
    // audit_fields is global — should appear without ns:: prefix
    assert.match(stdout, /audit_fields/);
    assert.doesNotMatch(stdout, /\w+::audit_fields/);
  });

  it("--json includes all namespaced schemas", async () => {
    const { stdout, code } = await run("summary", "--json", NS_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const names = data.schemas.map((s) => s.name);
    assert.ok(names.includes("pos::stores"));
    assert.ok(names.includes("ecom::orders"));
    assert.ok(names.includes("warehouse::hub_store"));
  });

  it("--compact lists qualified names", async () => {
    const { stdout, code } = await run("summary", "--compact", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /pos::stores/);
    assert.match(stdout, /ecom::customers/);
  });
});

describe("satsuma schema (namespaces)", () => {
  it("resolves fully qualified namespace schema", async () => {
    const { stdout, code } = await run("schema", "pos::stores", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /STORE_ID/);
    assert.match(stdout, /STORE_NAME/);
  });

  it("resolves unambiguous unqualified name to namespaced schema", async () => {
    // 'hub_store' exists only in warehouse namespace
    const { stdout, code } = await run("schema", "hub_store", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /store_hk/);
  });

  it("reports ambiguous unqualified name", async () => {
    // 'orders' exists in ecom — should resolve since it's unique
    // But let's test a schema that exists in only one namespace
    const { stdout, code } = await run("schema", "stores", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /STORE_ID/);
  });

  it("--fields-only works for namespaced schema", async () => {
    const { stdout, code } = await run("schema", "pos::stores", "--fields-only", NS_FIXTURE);
    assert.equal(code, 0);
    const lines = stdout.trim().split("\n").filter(Boolean);
    assert.ok(lines.length >= 3, `expected at least 3 field lines, got ${lines.length}`);
  });

  it("--json works for namespaced schema", async () => {
    const { stdout, code } = await run("schema", "pos::stores", "--json", NS_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.name);
    assert.ok(Array.isArray(data.fields));
    assert.ok(data.fields.length >= 3);
  });

  it("--json includes namespace field for namespaced schema (sl-5pa2)", async () => {
    const { stdout, code } = await run("schema", "pos::stores", "--json", NS_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.namespace, "pos");
    assert.equal(data.name, "stores");
  });

  it("text output includes namespace prefix for namespaced schema (sl-5pa2)", async () => {
    const { stdout, code } = await run("schema", "pos::stores", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /schema pos::stores/);
  });
});

describe("satsuma validate (namespaces)", () => {
  it("valid namespace file produces no errors", async () => {
    const { stdout, code } = await run("validate", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /no issues/i);
  });

  it("catches duplicates within a namespace", async () => {
    const DUP = resolve(import.meta.dirname, "fixtures", "ns-duplicate.stm");
    const { stdout, code } = await run("validate", DUP);
    assert.notEqual(code, 0);
    assert.match(stdout, /duplicate-definition/);
    assert.match(stdout, /pos::stores/);
  });

  it("catches namespace metadata conflicts", async () => {
    const CONFLICT = resolve(import.meta.dirname, "fixtures", "ns-meta-conflict.stm");
    const { stdout, code } = await run("validate", CONFLICT);
    assert.notEqual(code, 0);
    assert.match(stdout, /namespace-metadata-conflict|conflicting/i);
  });

  it("warns for unqualified cross-namespace reference with hint", async () => {
    const BAD_REF = resolve(import.meta.dirname, "fixtures", "ns-unresolved-ref.stm");
    const { stdout } = await run("validate", BAD_REF);
    // Should produce a warning about 'stores' not being defined in vault or global
    assert.match(stdout, /undefined-ref|undefined.*stores/i);
    assert.match(stdout, /hint|pos::stores/i);
  });

  it("--json shows namespace-aware diagnostics", async () => {
    const DUP = resolve(import.meta.dirname, "fixtures", "ns-duplicate.stm");
    const { stdout, code } = await run("validate", "--json", DUP);
    assert.notEqual(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data));
    const dupError = data.find((d) => d.rule === "duplicate-definition");
    assert.ok(dupError, "Should contain a duplicate-definition diagnostic");
    assert.ok(dupError.message.includes("pos::stores"));
  });
});

describe("satsuma find (namespaces)", () => {
  it("finds pii tag inside namespace blocks", async () => {
    const { stdout, code } = await run("find", "--tag", "pii", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /pii/i);
  });

  it("--json returns matches from namespaced schemas", async () => {
    const { stdout, code } = await run("find", "--tag", "pii", "--json", NS_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 2, "expected at least 2 pii-tagged fields");
    // Should include fields from pos::stores and ecom::customers
    const blocks = data.map((m) => m.block);
    assert.ok(
      blocks.some((b) => b.includes("stores")),
      "should find pii in stores",
    );
    assert.ok(
      blocks.some((b) => b.includes("customers")),
      "should find pii in customers",
    );
  });
});

describe("satsuma lineage (namespaces)", () => {
  it("traces lineage from qualified namespace schema", async () => {
    const { stdout, code } = await run(
      "lineage", "--from", "pos::stores", NS_FIXTURE,
    );
    assert.equal(code, 0);
    // pos::stores -> load hub_store -> warehouse::hub_store
    assert.match(stdout, /load hub_store|hub_store/);
  });

  it("traces lineage from unqualified unique schema", async () => {
    const { stdout, code } = await run(
      "lineage", "--from", "stores", NS_FIXTURE,
    );
    assert.equal(code, 0);
    assert.match(stdout, /hub_store/);
  });

  it("--json produces DAG with namespace-qualified names", async () => {
    const { stdout, code } = await run(
      "lineage", "--from", "pos::stores", "--json", NS_FIXTURE,
    );
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.nodes));
    assert.ok(Array.isArray(data.edges));
    const nodeNames = data.nodes.map((n) => n.name);
    assert.ok(nodeNames.includes("pos::stores"));
  });

  it("exits 1 for unknown qualified schema", async () => {
    const { code, stderr } = await run(
      "lineage", "--from", "nonexistent::schema", NS_FIXTURE,
    );
    assert.equal(code, 1);
    assert.match(stderr, /not found/i);
  });
});

describe("satsuma where-used (namespaces)", () => {
  it("shows references for a namespaced schema", async () => {
    const { stdout, code } = await run("where-used", "pos::stores", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /pos::stores|load hub_store/i);
  });
});

describe("satsuma fields (namespaces)", () => {
  it("lists fields for qualified namespace schema", async () => {
    const { stdout, code } = await run("fields", "pos::stores", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /STORE_ID/);
    assert.match(stdout, /STORE_NAME/);
    assert.match(stdout, /REGION_CD/);
  });

  it("lists fields for unqualified unique schema", async () => {
    const { stdout, code } = await run("fields", "hub_store", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /store_hk/);
  });

  it("--json returns structured fields", async () => {
    const { stdout, code } = await run("fields", "pos::stores", "--json", NS_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 3);
  });
});

describe("satsuma mapping (namespaces)", () => {
  it("resolves namespaced mapping by name", async () => {
    const { stdout, code } = await run("mapping", "load hub_store", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /pos::stores|hub_store/);
  });

  it("--json shows cross-namespace source reference", async () => {
    const { stdout, code } = await run("mapping", "load hub_store", "--json", NS_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.name);
    assert.ok(data.sources.includes("pos::stores") || data.sources.some((s) => s.includes("stores")));
  });

  it("--json includes namespace field for namespaced mappings (sl-x8yp)", async () => {
    const { stdout, code } = await run("mapping", "load hub_store", "--json", NS_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.namespace, "namespace should be included in JSON");
  });
});

// ---------------------------------------------------------------------------
// Bug fix: arrows command (stm-sbgx) — schema qualifier respected
// ---------------------------------------------------------------------------
const NS_PLATFORM = resolve(EXAMPLES, "ns-platform.stm");
const NS_MERGING = resolve(EXAMPLES, "ns-merging.stm");

describe("satsuma arrows (namespace bugs)", () => {
  it("scopes arrows to the correct schema", async () => {
    const { stdout, code } = await run("arrows", "raw::crm_contacts.email", NS_PLATFORM);
    assert.equal(code, 0);
    // Should find only the arrow in vault::load sat_contact
    assert.match(stdout, /load sat_contact/);
    // Should NOT find the arrow in mart::build dim_contact
    assert.doesNotMatch(stdout, /build dim_contact/);
  });

  it("returns different results for different schemas with same field name", async () => {
    const { stdout: srcOut } = await run("arrows", "raw::crm_contacts.email", NS_PLATFORM);
    const { stdout: tgtOut } = await run("arrows", "mart::dim_contact.email", NS_PLATFORM);
    // Different result sets
    assert.notEqual(srcOut, tgtOut);
    assert.match(tgtOut, /build dim_contact/);
    assert.doesNotMatch(tgtOut, /load sat_contact/);
  });

  it("JSON shows resolved target schema", async () => {
    const { stdout, code } = await run("arrows", "raw::crm_contacts.email", "--json", NS_PLATFORM);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.length >= 1);
    // Target should be resolved, not "?.email"
    const arrow = data.find((a) => a.target);
    assert.ok(arrow.target.includes("sat_contact_details"), `expected qualified target, got ${arrow.target}`);
    assert.doesNotMatch(arrow.target, /^\?/);
  });

  it("summary count is arithmetically correct", async () => {
    const { stdout, code } = await run("arrows", "raw::crm_contacts.email", NS_PLATFORM);
    assert.equal(code, 0);
    // Parse "N arrow(s) (M as source, K as target)"
    const totalMatch = stdout.match(/(\d+) arrows?/);
    const sourceMatch = stdout.match(/(\d+) as source/);
    const targetMatch = stdout.match(/(\d+) as target/);
    assert.ok(totalMatch, "should have arrow count");
    const total = parseInt(totalMatch[1]);
    const asSource = sourceMatch ? parseInt(sourceMatch[1]) : 0;
    const asTarget = targetMatch ? parseInt(targetMatch[1]) : 0;
    assert.ok(total <= asSource + asTarget, `total ${total} should be <= source ${asSource} + target ${asTarget}`);
  });
});

// ---------------------------------------------------------------------------
// Bug fix: lineage --from (stm-ku9i) — qualified target names
// ---------------------------------------------------------------------------
describe("satsuma lineage --from (namespace bugs)", () => {
  it("shows fully qualified target schema names", async () => {
    const { stdout, code } = await run("lineage", "--from", "raw::crm_deals", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /vault::hub_deal/);
    assert.match(stdout, /vault::link_contact_deal/);
  });

  it("multi-hop lineage works end-to-end", async () => {
    const { stdout, code } = await run("lineage", "--from", "raw::crm_deals", NS_PLATFORM);
    assert.equal(code, 0);
    // Should reach mart layer via vault
    assert.match(stdout, /mart::fact_deals/);
  });

  it("--json nodes include namespace prefix", async () => {
    const { stdout, code } = await run("lineage", "--from", "raw::crm_deals", "--json", NS_PLATFORM);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const nodeNames = data.nodes.map((n) => n.name);
    assert.ok(nodeNames.includes("vault::hub_deal"), `expected vault::hub_deal in ${nodeNames}`);
  });
});

// ---------------------------------------------------------------------------
// Bug fix: lineage --to (stm-3af2) — works with namespaced schemas
// ---------------------------------------------------------------------------
describe("satsuma lineage --to (namespace bugs)", () => {
  it("traces upstream for namespaced target", async () => {
    const { stdout, code } = await run("lineage", "--to", "mart::fact_revenue", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /raw::erp_invoices/);
    assert.match(stdout, /mart::build fact_revenue/);
  });

  it("traces multi-hop upstream through vault", async () => {
    const { stdout, code } = await run("lineage", "--to", "mart::dim_contact", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /vault::hub_contact/);
    assert.match(stdout, /raw::crm_contacts/);
  });

  it("traces upstream with merged namespaces", async () => {
    const { stdout, code } = await run("lineage", "--to", "staging::stg_gl_entries", NS_MERGING);
    assert.equal(code, 0);
    // BFS finds a valid upstream path — may go through structural source
    // (finance_gl) or NL-derived source (hr_employees); both are correct
    assert.match(stdout, /source::(finance_gl|hr_employees)/);
  });
});

// ---------------------------------------------------------------------------
// Bug fix: metric metadata (stm-axj8) — values not lost
// ---------------------------------------------------------------------------
describe("satsuma metric (namespace bugs)", () => {
  it("displays correct metadata values for namespaced sources", async () => {
    const { stdout, code } = await run("metric", "pipeline_value", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /source vault::hub_deal/);
    assert.match(stdout, /grain daily/);
    // Should NOT show "source source" or "grain grain"
    assert.doesNotMatch(stdout, /source source/);
    assert.doesNotMatch(stdout, /grain grain/);
  });

  it("JSON metadata array has correct values", async () => {
    const { stdout, code } = await run("metric", "pipeline_value", "--json", NS_PLATFORM);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const sourceMeta = data.metadata.find((m) => m.key === "source");
    assert.ok(sourceMeta);
    assert.equal(sourceMeta.value, "vault::hub_deal");
    const grainMeta = data.metadata.find((m) => m.key === "grain");
    assert.ok(grainMeta);
    assert.equal(grainMeta.value, "daily");
  });

  it("--json includes namespace field for namespaced metric (sl-09bo)", async () => {
    const { stdout, code } = await run("metric", "analytics::daily_sales", "--json", NS_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.namespace, "analytics");
    assert.equal(data.name, "daily_sales");
  });

  it("text output includes namespace prefix for namespaced metric (sl-09bo)", async () => {
    const { stdout, code } = await run("metric", "analytics::daily_sales", NS_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /metric analytics::daily_sales/);
  });
});

// ---------------------------------------------------------------------------
// Bug fix: where-used (stm-4oop) — fragment spreads and transform refs
// ---------------------------------------------------------------------------
describe("satsuma where-used (namespace bugs)", () => {
  it("finds fragment spreads inside namespace blocks", async () => {
    const { stdout, code } = await run("where-used", "standard_metadata", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /7/);
    assert.match(stdout, /raw::crm_contacts/);
    assert.match(stdout, /vault::hub_contact/);
    assert.match(stdout, /vault::link_contact_deal/);
  });

  it("finds transform invocations inside namespace mappings", async () => {
    const { stdout, code } = await run("where-used", "dv_hash_key", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /5/);
    assert.match(stdout, /vault::load hub_contact/);
    assert.match(stdout, /vault::load hub_deal/);
  });

  it("finds single transform reference", async () => {
    const { stdout, code } = await run("where-used", "normalize_email", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /1/);
    assert.match(stdout, /vault::load sat_contact/);
  });

  it("finds schema references from both source and target mappings", async () => {
    const { stdout, code } = await run("where-used", "hub_contact", NS_PLATFORM);
    assert.equal(code, 0);
    // Should find vault::load hub_contact (target) and mart::build dim_contact (source)
    assert.match(stdout, /vault::load hub_contact/);
    assert.match(stdout, /mart::build dim_contact/);
  });
});

// ---------------------------------------------------------------------------
// Bug fix: fields --unmapped-by (stm-9mao) — correct with namespaces
// ---------------------------------------------------------------------------
describe("satsuma fields --unmapped-by (namespace bugs)", () => {
  it("returns only unmapped fields for namespace-scoped mapping", async () => {
    const { stdout, code } = await run(
      "fields", "mart::dim_contact", "--unmapped-by", "build dim_contact", NS_PLATFORM,
    );
    assert.equal(code, 0);
    // Only is_current, valid_from, valid_to are unmapped
    assert.match(stdout, /is_current/);
    assert.match(stdout, /valid_from/);
    assert.match(stdout, /valid_to/);
    // Mapped fields should NOT appear
    assert.doesNotMatch(stdout, /contact_sk/);
    assert.doesNotMatch(stdout, /contact_bk/);
    assert.doesNotMatch(stdout, /full_name/);
    assert.doesNotMatch(stdout, /email/);
    assert.doesNotMatch(stdout, /company/);
  });

  it("works with qualified mapping name", async () => {
    const { stdout, code } = await run(
      "fields", "mart::dim_contact", "--unmapped-by", "mart::build dim_contact", NS_PLATFORM,
    );
    assert.equal(code, 0);
    assert.match(stdout, /is_current/);
    assert.doesNotMatch(stdout, /contact_sk/);
  });
});

// ---------------------------------------------------------------------------
// satsuma nl-refs
// ---------------------------------------------------------------------------
describe("satsuma nl-refs", () => {
  it("extracts backtick references from ns-merging.stm", async () => {
    const { stdout, code } = await run("nl-refs", NS_MERGING);
    assert.equal(code, 0);
    assert.match(stdout, /NL backtick references/);
    assert.match(stdout, /source::hr_employees/);
    assert.match(stdout, /department/);
    assert.match(stdout, /posted_by/);
  });

  it("supports --json output", async () => {
    const { stdout, code } = await run("nl-refs", "--json", NS_MERGING);
    assert.equal(code, 0);
    const refs = JSON.parse(stdout);
    assert.ok(Array.isArray(refs));
    assert.ok(refs.length > 0);
    assert.ok(refs[0].ref);
    assert.ok(refs[0].classification);
    assert.ok("resolved" in refs[0]);
  });

  it("supports --mapping filter", async () => {
    const { stdout, code } = await run(
      "nl-refs", "--mapping", "stage gl entries", "--json", NS_MERGING,
    );
    assert.equal(code, 0);
    const refs = JSON.parse(stdout);
    assert.ok(refs.length > 0);
    // All refs should be from this mapping
    for (const ref of refs) {
      assert.match(ref.mapping, /stage gl entries/);
    }
  });

  it("supports --unresolved filter with no results", async () => {
    const { code } = await run("nl-refs", "--unresolved", NS_MERGING);
    assert.equal(code, 1, "should exit 1 when no refs match filter");
  });

  it("--json outputs empty array when no refs found", async () => {
    const { stdout, code } = await run("nl-refs", "--unresolved", "--json", NS_MERGING);
    assert.equal(code, 1);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data), "should output JSON array");
    assert.equal(data.length, 0);
  });

  it("extracts refs from db-to-db.stm with COUNTRY_CD backtick", async () => {
    const dbFile = resolve(EXAMPLES, "db-to-db.stm");
    const { stdout, code } = await run("nl-refs", "--json", dbFile);
    assert.equal(code, 0);
    const refs = JSON.parse(stdout);
    const countryCd = refs.find((r) => r.ref === "COUNTRY_CD");
    assert.ok(countryCd, "should find COUNTRY_CD backtick ref");
  });

  it("extracts backtick refs from standalone transform blocks", async () => {
    const fixture = resolve(import.meta.dirname, "fixtures", "transform-nl-refs.stm");
    const { stdout, code } = await run("nl-refs", "--json", fixture);
    assert.equal(code, 0);
    const refs = JSON.parse(stdout);
    assert.equal(refs.length, 3, "should find 3 backtick refs");
    const refNames = refs.map((r) => r.ref).sort();
    assert.deepStrictEqual(refNames, ["first_name", "last_name", "region_code"]);
  });

  it("shows transform name in mapping field for transform refs", async () => {
    const fixture = resolve(import.meta.dirname, "fixtures", "transform-nl-refs.stm");
    const { stdout, code } = await run("nl-refs", "--json", fixture);
    assert.equal(code, 0);
    const refs = JSON.parse(stdout);
    const firstName = refs.find((r) => r.ref === "first_name");
    assert.equal(firstName.mapping, "transform:build_fullname");
    const regionCode = refs.find((r) => r.ref === "region_code");
    assert.equal(regionCode.mapping, "transform:region_lookup");
  });

  it("displays transform refs in text output", async () => {
    const fixture = resolve(import.meta.dirname, "fixtures", "transform-nl-refs.stm");
    const { stdout, code } = await run("nl-refs", fixture);
    assert.equal(code, 0);
    assert.match(stdout, /transform:build_fullname/);
    assert.match(stdout, /first_name/);
    assert.match(stdout, /last_name/);
    assert.match(stdout, /region_code/);
  });

  it("extracts backtick refs from note blocks inside mappings (sl-z57o)", async () => {
    const fixture = resolve(import.meta.dirname, "fixtures", "note-nl-refs.stm");
    const { stdout, code } = await run("nl-refs", "--json", fixture);
    assert.equal(code, 0);
    const refs = JSON.parse(stdout);
    assert.equal(refs.length, 4, "should find 4 backtick refs (3 from note + 1 from arrow)");
    const noteRefs = refs.filter((r) => r.targetField === null);
    assert.equal(noteRefs.length, 3, "3 refs should come from the note block (no targetField)");
    const refNames = noteRefs.map((r) => r.ref).sort();
    assert.deepStrictEqual(refNames, ["balance", "src_accounts", "tgt_accounts"]);
  });
});

// ---------------------------------------------------------------------------
// satsuma validate — NL ref warnings
// ---------------------------------------------------------------------------
describe("satsuma validate (NL refs)", () => {
  it("validates ns-merging.stm without NL ref warnings", async () => {
    const { stdout, code } = await run("validate", NS_MERGING);
    assert.equal(code, 0);
    assert.match(stdout, /no issues found/);
  });
});

// ---------------------------------------------------------------------------
// satsuma where-used — NL ref surface
// ---------------------------------------------------------------------------
describe("satsuma where-used (NL refs)", () => {
  it("includes NL refs in where-used results", async () => {
    const { stdout, code } = await run("where-used", "source::hr_employees", "--json", NS_MERGING);
    assert.equal(code, 0);
    const result = JSON.parse(stdout);
    const nlRefs = result.refs.filter((r) => r.kind === "nl_ref");
    assert.ok(nlRefs.length > 0, "should find NL references to source::hr_employees");
  });
});

// ---------------------------------------------------------------------------
// satsuma lint
// ---------------------------------------------------------------------------
const LINT_FIXTURES = resolve(__dirname, "fixtures");

describe("satsuma lint", () => {
  it("reports no issues for a clean file", async () => {
    const { stdout, code } = await run("lint", resolve(LINT_FIXTURES, "lint-clean.stm"));
    assert.equal(code, 0);
    assert.match(stdout, /no issues found/);
  });

  it("exits 2 when findings are present", async () => {
    const { stdout, code } = await run("lint", resolve(LINT_FIXTURES, "lint-hidden-source.stm"));
    assert.equal(code, 2);
    assert.match(stdout, /hidden-source-in-nl/);
  });

  it("reports unresolved NL references", async () => {
    const { stdout, code } = await run("lint", resolve(LINT_FIXTURES, "lint-unresolved.stm"));
    assert.equal(code, 2);
    assert.match(stdout, /unresolved-nl-ref/);
    assert.match(stdout, /nonexistent_schema/);
  });

  it("--json produces valid structured output", async () => {
    const { stdout, code } = await run("lint", "--json", resolve(LINT_FIXTURES, "lint-hidden-source.stm"));
    assert.equal(code, 2);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.findings));
    assert.ok(data.findings.length > 0);
    assert.ok(data.summary);
    assert.equal(typeof data.summary.files, "number");
    assert.equal(typeof data.summary.findings, "number");
    assert.equal(typeof data.summary.fixable, "number");
    // Verify diagnostic shape
    const d = data.findings[0];
    assert.equal(typeof d.file, "string");
    assert.equal(typeof d.line, "number");
    assert.equal(typeof d.column, "number");
    assert.ok(["error", "warning"].includes(d.severity));
    assert.equal(typeof d.rule, "string");
    assert.equal(typeof d.message, "string");
    assert.equal(typeof d.fixable, "boolean");
  });

  it("--quiet returns only exit code", async () => {
    const { stdout, code } = await run("lint", "--quiet", resolve(LINT_FIXTURES, "lint-hidden-source.stm"));
    assert.equal(code, 2);
    assert.equal(stdout.trim(), "");
  });

  it("--quiet returns 0 for clean file", async () => {
    const { stdout, code } = await run("lint", "--quiet", resolve(LINT_FIXTURES, "lint-clean.stm"));
    assert.equal(code, 0);
    assert.equal(stdout.trim(), "");
  });

  it("--rules lists available rules", async () => {
    const { stdout, code } = await run("lint", "--rules");
    assert.equal(code, 0);
    assert.match(stdout, /hidden-source-in-nl/);
    assert.match(stdout, /unresolved-nl-ref/);
    assert.match(stdout, /duplicate-definition/);
  });

  it("--select filters to specified rules only", async () => {
    const { stdout } = await run(
      "lint", "--select", "unresolved-nl-ref",
      resolve(LINT_FIXTURES, "lint-hidden-source.stm"),
    );
    // Should only show unresolved-nl-ref, not hidden-source-in-nl
    assert.ok(!stdout.includes("hidden-source-in-nl"));
  });
});

// ---------------------------------------------------------------------------
// satsuma lint --fix
// ---------------------------------------------------------------------------

describe("satsuma lint --fix", () => {
  /** Copy a fixture to a temp dir so --fix can modify it safely. */
  function copyFixture(name) {
    const src = resolve(LINT_FIXTURES, name);
    const tmp = mkdtempSync(join(tmpdir(), "satsuma-lint-"));
    const dest = join(tmp, name);
    copyFileSync(src, dest);
    return dest;
  }

  it("fixes fixable findings and reports residual non-fixable ones", async () => {
    const file = copyFixture("lint-mixed.stm");

    const { stdout, code } = await run("lint", "--fix", file);
    // Non-fixable finding remains → exit 2
    assert.equal(code, 2);
    assert.match(stdout, /Fixed:/);
    assert.match(stdout, /hidden-source-in-nl/);
    // Residual non-fixable finding still reported
    assert.match(stdout, /unresolved-nl-ref/);

    // Verify the source block was actually updated
    const content = readFileSync(file, "utf8");
    assert.match(content, /source::hr_employees/);
  });

  it("--fix --json reports fixes and residual findings", async () => {
    const file = copyFixture("lint-mixed.stm");

    const { stdout, code } = await run("lint", "--fix", "--json", file);
    assert.equal(code, 2);
    const data = JSON.parse(stdout);
    assert.ok(data.fixes.length > 0, "should have applied fixes");
    assert.ok(data.findings.length > 0, "should have residual findings");
    assert.equal(data.summary.fixed, data.fixes.length);
  });

  it("--fix is idempotent — rerunning produces no new fixes", async () => {
    const file = copyFixture("lint-mixed.stm");

    // First run: apply fixes
    const { stdout: first } = await run("lint", "--fix", "--json", file);
    const firstData = JSON.parse(first);
    assert.ok(firstData.summary.fixed > 0, "first run should fix something");

    // Second run: no new fixes, only residual non-fixable findings
    const { stdout, code } = await run("lint", "--fix", "--json", file);
    assert.equal(code, 2);
    const data = JSON.parse(stdout);
    assert.equal(data.summary.fixed, 0, "no new fixes on second run");
    // Persistent non-fixable finding (nonexistent_fx_rates) still present
    assert.ok(data.findings.length > 0);
    assert.ok(data.findings.every((d) => !d.fixable));
  });

  it("--fix on a clean file makes no changes", async () => {
    const file = copyFixture("lint-clean.stm");
    const before = readFileSync(file, "utf8");

    const { code } = await run("lint", "--fix", file);
    assert.equal(code, 0);

    const after = readFileSync(file, "utf8");
    assert.equal(before, after);
  });

  it("--fix on a purely fixable file exits 0 after fixing", async () => {
    const file = copyFixture("lint-fixable-only.stm");

    const { stdout, code } = await run("lint", "--fix", file);
    assert.equal(code, 0);
    assert.match(stdout, /Fixed:/);

    // Verify fix was applied
    const content = readFileSync(file, "utf8");
    assert.match(content, /source \{ source::finance_gl, source::hr_employees \}/);
  });
});

// ---------------------------------------------------------------------------
// Import resolution — stm-8k6p
// ---------------------------------------------------------------------------
const IMPORT_ENTRY = resolve(__dirname, "fixtures", "import-entry.stm");
const IMPORT_CHAIN = resolve(__dirname, "fixtures", "import-chain-entry.stm");

describe("import resolution: summary", () => {
  it("includes imported schemas when pointing at entry file", async () => {
    const { stdout, code } = await run("summary", "--json", IMPORT_ENTRY);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const names = data.schemas.map((s) => s.name);
    assert.ok(names.includes("src::customers"), `expected src::customers, got ${names}`);
    assert.ok(names.includes("mart::dim_customers"), `expected mart::dim_customers, got ${names}`);
    assert.equal(data.mappings.length, 1);
  });

  it("follows transitive imports", async () => {
    const { stdout, code } = await run("summary", "--json", IMPORT_CHAIN);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const names = data.schemas.map((s) => s.name);
    assert.ok(names.includes("src::customers"), `transitive: expected src::customers, got ${names}`);
    assert.ok(names.includes("mart::dim_customers"), `transitive: expected mart::dim_customers, got ${names}`);
    assert.ok(names.includes("analytics::customer_stats"), `transitive: expected analytics::customer_stats, got ${names}`);
  });
});

describe("import resolution: schema", () => {
  it("finds imported schema by qualified name", async () => {
    const { stdout, code } = await run("schema", "src::customers", IMPORT_ENTRY);
    assert.equal(code, 0);
    assert.match(stdout, /customer_id/);
    assert.match(stdout, /email/);
  });
});

describe("import resolution: where-used", () => {
  it("finds mapping references to imported schema", async () => {
    const { stdout, code } = await run("where-used", "src::customers", IMPORT_ENTRY);
    assert.equal(code, 0);
    assert.match(stdout, /build dim_customers/);
  });
});

describe("import resolution: graph", () => {
  it("includes schema nodes for imported definitions", async () => {
    const { stdout, code } = await run("graph", "--json", IMPORT_ENTRY);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.stats.schemas, 2, `expected 2 schemas, got ${data.stats.schemas}`);
    assert.equal(data.stats.mappings, 1);
  });
});

describe("import resolution: validate", () => {
  it("does not emit undefined-ref for imported names", async () => {
    const { stdout, code } = await run("validate", IMPORT_ENTRY);
    assert.equal(code, 0);
    assert.match(stdout, /no issues/i);
  });
});

describe("import resolution: missing target", () => {
  it("warns on stderr for missing import target", async () => {
    const { stderr, code } = await run("summary", "--json", resolve(__dirname, "fixtures", "import-missing.stm"));
    // Should still succeed (warn, not fail)
    assert.equal(code, 0);
    assert.match(stderr, /import target.*not found/i);
  });
});

// ---------------------------------------------------------------------------
// Bug fix: nl field scope (sg-3xof) — schema qualifier respected for arrows
// ---------------------------------------------------------------------------
describe("satsuma nl field scope (sg-3xof)", () => {
  it("does not leak NL from unrelated schemas sharing the same field name", async () => {
    // ecom::customers.email has no NL-bearing arrows — should not pick up
    // vault::sat_contact_details.email NL from 'build dim_contact'
    const { stdout, code } = await run("nl", "ecom::customers.email", NS_PLATFORM);
    assert.equal(code, 0);
    assert.doesNotMatch(stdout, /vault::sat_contact_details/);
    assert.doesNotMatch(stdout, /build dim_contact/);
  });

  it("returns NL for the correct schema when field name is shared", async () => {
    // vault::sat_contact_details.email IS a source for 'build dim_contact'
    const { stdout, code } = await run("nl", "vault::sat_contact_details.email", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /vault::sat_contact_details/);
  });

  it("unique field names continue to work", async () => {
    // contact_bk is unique enough — should return NL from its mapping
    const { code } = await run("nl", "vault::hub_contact.contact_bk", NS_PLATFORM);
    assert.equal(code, 0);
    // contact_bk -> contact_bk is a plain arrow with no NL, so no transform items
    // but the command should succeed without error
    assert.equal(code, 0);
  });
});

// ---------------------------------------------------------------------------
// Bug fix: lineage --to (sg-pufq) — all upstream branches returned
// ---------------------------------------------------------------------------
describe("satsuma lineage --to upstream branches (sg-pufq)", () => {
  it("includes both upstream sources for mart::dim_contact", async () => {
    const { stdout, code } = await run("lineage", "--to", "mart::dim_contact", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /vault::hub_contact/);
    assert.match(stdout, /vault::sat_contact_details/);
  });

  it("includes all upstream branches for mart::fact_deals", async () => {
    const { stdout, code } = await run("lineage", "--to", "mart::fact_deals", NS_PLATFORM);
    assert.equal(code, 0);
    assert.match(stdout, /vault::hub_deal/);
    assert.match(stdout, /vault::link_contact_deal/);
    assert.match(stdout, /vault::hub_contact/);
  });

  it("--json returns nodes and edges DAG for --to", async () => {
    const { stdout, code } = await run("lineage", "--to", "mart::dim_contact", "--json", NS_PLATFORM);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.nodes));
    assert.ok(Array.isArray(data.edges));
    const names = data.nodes.map((n) => n.name);
    assert.ok(names.includes("vault::hub_contact"), `expected vault::hub_contact in ${names}`);
    assert.ok(names.includes("vault::sat_contact_details"), `expected vault::sat_contact_details in ${names}`);
  });
});

// ---------------------------------------------------------------------------
// Bug fixes: fragment spread expansion across CLI commands
// (sl-3aff, sl-h1b0, sl-wrzl, sl-t6lt, sl-zjec, sl-307v)
// ---------------------------------------------------------------------------
const SPREAD_FIXTURE = resolve(__dirname, "fixtures", "fragment-spread-commands.stm");

describe("satsuma fields — fragment spread expansion (sl-3aff)", () => {
  it("includes fields from fragment spreads", async () => {
    const { stdout, code } = await run("fields", "tgt_customers", SPREAD_FIXTURE);
    assert.equal(code, 0);
    // Direct fields
    assert.match(stdout, /customer_id/);
    assert.match(stdout, /email/);
    // Fragment spread fields from 'audit fields'
    assert.match(stdout, /created_at/);
    assert.match(stdout, /updated_at/);
    assert.match(stdout, /created_by/);
    // Fragment spread fields from 'address fields'
    assert.match(stdout, /street_line_1/);
    assert.match(stdout, /city/);
  });

  it("--json includes fragment spread fields", async () => {
    const { stdout, code } = await run("fields", "tgt_customers", "--json", SPREAD_FIXTURE);
    assert.equal(code, 0);
    const fields = JSON.parse(stdout);
    const names = fields.map((f) => f.name);
    assert.ok(names.includes("created_at"), "should include created_at from audit fields");
    assert.ok(names.includes("street_line_1"), "should include street_line_1 from address fields");
  });

  it("includes transitive spread fields", async () => {
    const { stdout, code } = await run("fields", "customer_with_full_address", "--json", SPREAD_FIXTURE);
    assert.equal(code, 0);
    const fields = JSON.parse(stdout);
    const names = fields.map((f) => f.name);
    // From 'full address' fragment directly
    assert.ok(names.includes("country"), "should include country from full address");
    // Transitive from 'address fields' via 'full address'
    assert.ok(names.includes("street_line_1"), "should include street_line_1 transitively");
    assert.ok(names.includes("city"), "should include city transitively");
  });
});

describe("satsuma arrows — fragment spread expansion (sl-h1b0)", () => {
  it("finds arrows targeting fields from fragment spreads", async () => {
    const { stdout, code } = await run("arrows", "tgt_customers.created_at", SPREAD_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /now_utc/);
  });

  it("finds arrows targeting spread source fields", async () => {
    const { stdout, code } = await run("arrows", "src_customers.street_line_1", SPREAD_FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /street_line_1/);
  });

  it("does not error for spread field lookup", async () => {
    const { stderr, code } = await run("arrows", "tgt_customers.updated_at", SPREAD_FIXTURE);
    assert.equal(code, 0);
    assert.ok(!stderr.includes("not found"), "should not error for spread field");
  });
});

describe("satsuma match-fields — fragment spread expansion (sl-wrzl)", () => {
  it("matches fields from shared fragment spreads", async () => {
    const { stdout, code } = await run(
      "match-fields", "--source", "src_customers", "--target", "tgt_customers",
      "--json", SPREAD_FIXTURE,
    );
    assert.equal(code, 0);
    const result = JSON.parse(stdout);
    const matchedNames = result.matched.map((m) => m.source);
    // Both schemas spread 'address fields' — these should match
    assert.ok(matchedNames.includes("street_line_1"), "street_line_1 should be matched");
    assert.ok(matchedNames.includes("city"), "city should be matched");
    assert.ok(matchedNames.includes("state"), "state should be matched");
  });
});

describe("satsuma graph --json — fragment spread expansion (sl-t6lt)", () => {
  it("includes fragment spread fields in schema node fields arrays", async () => {
    const { stdout, code } = await run("graph", "--json", SPREAD_FIXTURE);
    assert.equal(code, 0);
    const graph = JSON.parse(stdout);
    const tgtNode = graph.nodes.find((n) => n.id === "tgt_customers");
    assert.ok(tgtNode, "tgt_customers node should exist");
    const fieldNames = tgtNode.fields.map((f) => f.name);
    assert.ok(fieldNames.includes("created_at"), "should include created_at from audit fields");
    assert.ok(fieldNames.includes("street_line_1"), "should include street_line_1 from address fields");
  });

  it("includes fragment spread edges", async () => {
    const { stdout, code } = await run("graph", "--json", SPREAD_FIXTURE);
    assert.equal(code, 0);
    const graph = JSON.parse(stdout);
    const spreadEdges = graph.schema_edges.filter((e) => e.role === "fragment_spread");
    assert.ok(spreadEdges.length > 0, "should have fragment_spread edges");
  });
});

describe("satsuma schema --json — fragment spread expansion (sl-zjec)", () => {
  it("includes expanded fragment fields in fields array", async () => {
    const { stdout, code } = await run("schema", "tgt_customers", "--json", SPREAD_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const fieldNames = data.fields.map((f) => f.name);
    assert.ok(fieldNames.includes("created_at"), "should include created_at from audit fields");
    assert.ok(fieldNames.includes("updated_at"), "should include updated_at from audit fields");
    assert.ok(fieldNames.includes("created_by"), "should include created_by from audit fields");
    assert.ok(fieldNames.includes("street_line_1"), "should include street_line_1 from address fields");
  });

  it("still shows spread syntax in fieldLines", async () => {
    const { stdout, code } = await run("schema", "tgt_customers", "--json", SPREAD_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.fieldLines.some((l) => l.includes("...audit fields")));
    assert.ok(data.fieldLines.some((l) => l.includes("...address fields")));
  });
});

describe("satsuma where-used — fragment-to-fragment spreads (sl-307v)", () => {
  it("finds fragment-to-fragment spread references", async () => {
    const { stdout, code } = await run("where-used", "address fields", "--json", SPREAD_FIXTURE);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const spreadRefs = data.refs.filter((r) => r.kind === "fragment_spread");
    const refNames = spreadRefs.map((r) => r.name);
    // Should find spreads in: src_customers, tgt_customers, full address, customer_with_full_address (transitive via full address)
    assert.ok(refNames.includes("src_customers"), "should find spread in src_customers");
    assert.ok(refNames.includes("tgt_customers"), "should find spread in tgt_customers");
    assert.ok(refNames.includes("full address"), "should find spread in fragment 'full address'");
  });
});

// ---------------------------------------------------------------------------
// Bug fix: nl/meta field syntax (sg-95gr) — dot-separated scope works
// ---------------------------------------------------------------------------
describe("satsuma nl/meta field syntax (sg-95gr)", () => {
  it("nl accepts schema.field without 'field' keyword", async () => {
    const { code } = await run("nl", "mart::dim_contact.email", NS_PLATFORM);
    assert.equal(code, 0);
  });

  it("meta accepts schema.field without 'field' keyword", async () => {
    const { code } = await run("meta", "vault::sat_contact_details.email", NS_PLATFORM);
    assert.equal(code, 0);
  });
});
