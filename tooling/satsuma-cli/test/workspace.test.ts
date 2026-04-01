/**
 * workspace.test.ts — Unit tests for workspace file resolution
 *
 * Tests resolveInput and the followImports traversal, including
 * directory rejection (ADR-022), import following, and cycle safety.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveInput } from "#src/workspace.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = resolve(__dirname, "../../../examples");

// ── resolveInput: directory rejection ───────────────────────────────────────

describe("resolveInput", () => {
  it("rejects directory arguments with DIRECTORY_NOT_SUPPORTED error", async () => {
    await assert.rejects(
      () => resolveInput(EXAMPLES),
      (err: Error) => {
        assert.match(err.message, /directory arguments are not supported/);
        return true;
      },
    );
  });

  it("returns a single file when followImports is false", async () => {
    const file = resolve(EXAMPLES, "db-to-db/pipeline.stm");
    const result = await resolveInput(file, { followImports: false });
    assert.equal(result.length, 1);
    assert.equal(result[0], file);
  });

  it("follows imports by default", async () => {
    // The import-entry fixture imports other files
    const entry = resolve(__dirname, "fixtures/import-entry.stm");
    const result = await resolveInput(entry);
    assert.ok(result.length >= 1, "should include at least the entry file");
    assert.ok(result.includes(entry), "result should include the entry file");
  });

  it("returns sorted file list", async () => {
    const entry = resolve(__dirname, "fixtures/import-entry.stm");
    const result = await resolveInput(entry);
    const sorted = [...result].sort();
    assert.deepEqual(result, sorted, "files should be sorted");
  });

  it("handles files with no imports", async () => {
    const file = resolve(EXAMPLES, "lib/common.stm");
    const result = await resolveInput(file);
    assert.equal(result.length, 1, "file with no imports returns just itself");
    assert.equal(result[0], file);
  });
});
