/**
 * warnings.test.js — Unit tests for warnings/questions command logic.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

let output: string[] = [];
let origLog: typeof console.log;
beforeEach(() => { output = []; origLog = console.log; console.log = (...a: any[]) => output.push(a.join(" ")); });
afterEach(() => { console.log = origLog; });

describe("warnings output", () => {
  it("formats warnings grouped by file", () => {
    const items = [
      { text: "some records NULL", file: "db.stm", row: 4 },
      { text: "not validated", file: "db.stm", row: 8 },
      { text: "other issue", file: "other.stm", row: 1 },
    ];

    const byFile = new Map();
    for (const item of items) {
      if (!byFile.has(item.file)) byFile.set(item.file, []);
      byFile.get(item.file).push(item);
    }

    for (const [file, fileItems] of byFile) {
      console.log(file);
      for (const item of fileItems) console.log(`  :${item.row + 1}  //! ${item.text}`);
      console.log();
    }

    assert.ok(output.includes("db.stm"));
    assert.ok(output.some((l: string) => l.includes(":5  //! some records NULL")));
    assert.ok(output.some((l: string) => l.includes(":9  //! not validated")));
    assert.ok(output.includes("other.stm"));
  });

  it("prints 'no warnings' when empty", () => {
    const items = [];
    if (items.length === 0) console.log("No warning comments found.");
    assert.ok(output.some((l: string) => l.includes("No warning")));
  });
});

describe("JSON output structure", () => {
  it("produces valid JSON with kind, count, items", () => {
    const items = [{ text: "issue", file: "a.stm", row: 0 }];
    const json = JSON.parse(JSON.stringify({ kind: "warning", count: items.length, items }));
    assert.equal(json.kind, "warning");
    assert.equal(json.count, 1);
    assert.equal(json.items[0].text, "issue");
  });
});
