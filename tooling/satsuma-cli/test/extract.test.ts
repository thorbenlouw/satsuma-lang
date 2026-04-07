/**
 * extract.test.ts — CLI-side integration tests for the extraction pipeline.
 *
 * Per ARCHITECTURE.md, consumer packages must not duplicate core's unit
 * coverage. The mock-CST extraction tests that used to live here were
 * migrated to satsuma-core/test/extract.test.js under sl-cvs2 — that is the
 * single source of truth for extractor behaviour.
 *
 * What remains here is genuine CLI-only territory: end-to-end checks that
 * exercise parser → extractFileData → buildIndex against real example files.
 * These cases test the CLI's stitching of core APIs against the wasm parser
 * and the real example corpus, not the extractors themselves.
 */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = resolve(__dirname, "../../../examples");

describe("extraction against real files", () => {
  let parseFile: (filePath: string) => any;
  let extractFileData: (parsed: any) => any;
  let buildIndex: (data: any[]) => any;

  before(async () => {
    const parser = await import("#src/parser.js");
    parseFile = parser.parseFile;
    const ib = await import("#src/index-builder.js");
    extractFileData = ib.extractFileData;
    buildIndex = ib.buildIndex;
  });

  it("schema row is 0-indexed in extracted data, CLI converts to 1-indexed (sl-2usp)", () => {
    // Validates the CLI's row-indexing contract against a real file. The tree-sitter
    // row is 0-indexed; CLI commands add +1 for human output. Regression for sl-2usp.
    const parsed = parseFile(resolve(EXAMPLES, "lib/common.stm"));
    const data = extractFileData(parsed);
    const index = buildIndex([data]);
    const schema = index.schemas.get("country_codes");
    assert.ok(schema, "should find country_codes");
    assert.equal(schema.row, 3, "country_codes starts on row 3 (0-indexed) = line 4 (1-indexed)");
  });

  it("spread-expanded fieldCount includes direct + fragment fields (sl-vlsh)", async () => {
    // Validates the spread-expansion path used by the summary command end-to-end:
    // direct field count plus fragment-spread expansion produces the correct total.
    const { expandEntityFields } = await import("#src/spread-expand.js");
    const fixture = resolve(__dirname, "fixtures", "spread-fields-meta.stm");
    const parsed = parseFile(fixture);
    const data = extractFileData(parsed);
    const index = buildIndex([data]);
    const schema = index.schemas.get("with_spreads");
    assert.ok(schema, "should find with_spreads schema");
    const expanded = expandEntityFields(schema as any, schema.namespace ?? null, index);
    const totalCount = schema.fields.length + expanded.length;
    assert.equal(totalCount, 4, "should count 1 direct + 3 spread fields");
  });

  it("field metadata includes pk, ref, and enum entries (sl-rbvk)", () => {
    // Validates that the metadata extraction pipeline correctly distinguishes
    // tag, key-value, and enum metadata kinds against a real example file.
    const parsed = parseFile(resolve(EXAMPLES, "sfdc-to-snowflake/pipeline.stm"));
    const data = extractFileData(parsed);
    const schemas = data.schemas;
    const opp = schemas.find((s: any) => s.name === "sfdc_opportunity");
    assert.ok(opp, "should find sfdc_opportunity schema");
    const idField = opp.fields.find((f: any) => f.name === "Id");
    assert.ok(idField.metadata, "Id field should have metadata");
    assert.deepEqual(idField.metadata[0], { kind: "tag", tag: "pk" });
    const accField = opp.fields.find((f: any) => f.name === "AccountId");
    assert.ok(accField.metadata, "AccountId should have metadata");
    assert.equal(accField.metadata[0].kind, "kv");
    assert.equal(accField.metadata[0].key, "ref");
    const stageField = opp.fields.find((f: any) => f.name === "StageName");
    assert.ok(stageField.metadata, "StageName should have metadata");
    const enumEntry = stageField.metadata.find((m: any) => m.kind === "enum");
    assert.ok(enumEntry, "StageName should have enum metadata");
    assert.ok(enumEntry.values.length > 0, "enum should have values");
  });
});
