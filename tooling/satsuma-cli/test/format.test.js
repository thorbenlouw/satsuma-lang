/**
 * format.test.js — Unit tests for the core formatter.
 *
 * Phase 1 (scaffolding): verifies that the pass-through CST walk
 * reproduces the original source exactly for various inputs.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "../dist/format.js";
import { parseSource } from "../dist/parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(__dirname, "../../../examples");

// ── Pass-through round-trip tests ────────────────────────────────────────────

describe("format (pass-through)", () => {
  it("reproduces a simple schema block", () => {
    const src = `schema foo {
  id    INT    (pk)
  name  STRING
}
`;
    const { tree } = parseSource(src);
    assert.equal(format(tree, src), src);
  });

  it("reproduces a file with comments", () => {
    const src = `// Header comment
//! Doc comment

schema bar {
  // field comment
  x  INT
}
`;
    const { tree } = parseSource(src);
    assert.equal(format(tree, src), src);
  });

  it("reproduces an empty input", () => {
    const src = "";
    const { tree } = parseSource(src);
    assert.equal(format(tree, src), src);
  });

  it("reproduces a file with multiple blocks and blank lines", () => {
    const src = `schema a {
  x  INT
}


schema b {
  y  STRING
}
`;
    const { tree } = parseSource(src);
    assert.equal(format(tree, src), src);
  });

  it("reproduces a mapping block with arrows", () => {
    const src = `mapping my_map {
  source { src_schema }
  target { tgt_schema }

  src_schema.id -> id
  src_schema.name -> name { trim }
}
`;
    const { tree } = parseSource(src);
    assert.equal(format(tree, src), src);
  });

  it("reproduces a fragment with spreads", () => {
    const src = `fragment 'audit columns' {
  created_at  TIMESTAMPTZ  (required)
  updated_at  TIMESTAMPTZ
}

schema orders {
  id  INT  (pk)
  ...'audit columns'
}
`;
    const { tree } = parseSource(src);
    assert.equal(format(tree, src), src);
  });

  // ── Corpus round-trip tests ──────────────────────────────────────────────

  describe("corpus round-trip", () => {
    const stmFiles = readdirSync(examplesDir).filter(f => f.endsWith(".stm"));

    for (const file of stmFiles) {
      it(`round-trips examples/${file}`, () => {
        const src = readFileSync(join(examplesDir, file), "utf8");
        const { tree } = parseSource(src);
        assert.equal(format(tree, src), src);
      });
    }
  });
});
