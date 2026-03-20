import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, "../dist/index.js");
const FIXTURE = resolve(__dirname, "fixtures/namespace-collision.stm");

function run(...args) {
  return new Promise((resolvePromise) => {
    execFile("node", [CLI, ...args], { timeout: 15_000 }, (err, stdout, stderr) => {
      resolvePromise({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        code: err ? err.code ?? 1 : 0,
      });
    });
  });
}

describe("namespace collision regressions", () => {
  it("validate keeps namespace-local mappings isolated", async () => {
    const { stdout, code } = await run("validate", FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /no issues found/i);
    assert.doesNotMatch(stdout, /field-not-in-schema/i);
  });

  it("schema renders the correct namespaced field body", async () => {
    const { stdout, code } = await run("schema", "beta::customer", FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /beta_score/);
    assert.doesNotMatch(stdout, /alpha_flag/);
  });

  it("mapping renders the correct namespaced arrows", async () => {
    const { stdout, code } = await run("mapping", "beta::load_customer", FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /beta_score\s+->\s+beta_score/);
    assert.match(stdout, /round\(0\)/);
    assert.doesNotMatch(stdout, /alpha_flag/);
  });

  it("metric renders the correct namespaced metadata and body", async () => {
    const { stdout, code } = await run("metric", "beta::customer_health", FIXTURE);
    assert.equal(code, 0);
    assert.match(stdout, /grain weekly/);
    assert.match(stdout, /measure non_additive/);
    assert.doesNotMatch(stdout, /grain daily/);
    assert.doesNotMatch(stdout, /measure additive/);
  });

  it("nl returns only the requested namespaced mapping notes", async () => {
    const { stdout, code } = await run("nl", "beta::load_customer", FIXTURE, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.length, 1);
    assert.match(data[0].text, /Beta mapping/);
  });

  it("find reports namespaced field matches on the correct rows", async () => {
    const { stdout, code } = await run("find", "--tag", "default", FIXTURE, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const alpha = data.find((m) => m.block === "alpha::customer" && m.field === "alpha_flag");
    const beta = data.find((m) => m.block === "beta::customer" && m.field === "beta_score");
    assert.ok(alpha);
    assert.ok(beta);
    assert.equal(alpha.row, 3);
    assert.equal(beta.row, 27);
  });

  it("lineage follows namespace-qualified downstream edges", async () => {
    const { stdout, code } = await run("lineage", "--from", "beta::customer", FIXTURE, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    const nodeNames = new Set(data.nodes.map((n) => n.name));
    assert.ok(nodeNames.has("beta::customer"));
    assert.ok(nodeNames.has("beta::load_customer"));
    assert.ok(nodeNames.has("beta::customer_out"));
  });

  it("graph exports namespace-qualified schema edges", async () => {
    const { stdout, code } = await run("graph", FIXTURE, "--json");
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(
      data.schema_edges.some((e) => e.from === "beta::customer" && e.to === "beta::load_customer" && e.role === "source"),
    );
    assert.ok(
      data.schema_edges.some((e) => e.from === "beta::load_customer" && e.to === "beta::customer_out" && e.role === "target"),
    );
    assert.ok(
      data.schema_edges.some((e) => e.from === "beta::customer_out" && e.to === "beta::customer_health" && e.role === "metric_source"),
    );
  });
});
