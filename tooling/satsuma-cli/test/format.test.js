/**
 * format.test.js — Unit tests for the core formatter.
 *
 * Tests cover:
 * - Idempotency: format(format(x)) === format(x) for all corpus files
 * - Structural equivalence: parse tree is preserved after formatting
 * - Specific formatting rules: alignment, comments, blank lines, etc.
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(src) {
  const { tree } = parseSource(src);
  return format(tree, src);
}

function structureOf(node) {
  if (node.childCount === 0) {
    if (node.isNamed) return node.type + "=" + JSON.stringify(node.text);
    return null;
  }
  const kids = [];
  for (const c of node.children) {
    const s = structureOf(c);
    if (s !== null) kids.push(s);
  }
  return node.type + "(" + kids.join(",") + ")";
}

// ── Corpus Round-Trip (Idempotency + Structural Equivalence) ─────────────────

describe("corpus round-trip", () => {
  const stmFiles = readdirSync(examplesDir).filter(f => f.endsWith(".stm"));

  for (const file of stmFiles) {
    describe(`examples/${file}`, () => {
      const src = readFileSync(join(examplesDir, file), "utf8");

      it("is idempotent", () => {
        const out1 = fmt(src);
        const out2 = fmt(out1);
        assert.equal(out1, out2, "format(format(x)) should equal format(x)");
      });

      it("preserves parse tree structure", () => {
        const { tree: tree1 } = parseSource(src);
        const out = fmt(src);
        const { tree: tree2 } = parseSource(out);
        assert.equal(
          structureOf(tree1.rootNode),
          structureOf(tree2.rootNode),
          "parse trees should be structurally identical"
        );
      });
    });
  }
});

// ── Field Alignment ──────────────────────────────────────────────────────────

describe("field alignment", () => {
  it("aligns name and type columns based on max widths", () => {
    const src = `schema test {
  id INT (pk)
  long_name STRING
}`;
    const out = fmt(src);
    const lines = out.split("\n");
    // max_name = 9 ("long_name"), type_col = 11
    assert.match(lines[1], /^ {2}id {9}INT/);
    assert.match(lines[2], /^ {2}long_name {2}STRING/);
  });

  it("aligns metadata column", () => {
    const src = `schema test {
      alpha2 STRING(2) (pk)
      name STRING(100)
    }`;
    const out = fmt(src);
    const lines = out.split("\n");
    assert.match(lines[1], /^ {2}alpha2 {2}STRING\(2\)\s+\(pk\)/);
  });

  it("does not align multi-line record fields", () => {
    const src = `schema test {
  id INT (pk)
  addr record {
    line1 STRING
  }
}`;
    const out = fmt(src);
    assert.ok(out.includes("addr record {"), "record field should use minimal spacing");
  });

  it("handles fragment spreads as non-aligned standalone lines", () => {
    const src = `schema test {
  id INT (pk)
  ...'audit fields'
}`;
    const out = fmt(src);
    assert.ok(out.includes("  ...'audit fields'"), "spread should be at block indent");
  });
});

// ── Comments ─────────────────────────────────────────────────────────────────

describe("comments", () => {
  it("preserves all three comment types", () => {
    const src = `// regular
//! warning
//? question
schema test {
  x INT
}`;
    const out = fmt(src);
    assert.ok(out.includes("// regular"));
    assert.ok(out.includes("//! warning"));
    assert.ok(out.includes("//? question"));
  });

  it("normalizes space after comment marker", () => {
    const src = `//no space
//!no space
//?no space
schema test { x INT }`;
    const out = fmt(src);
    assert.ok(out.includes("// no space"));
    assert.ok(out.includes("//! no space"));
    assert.ok(out.includes("//? no space"));
  });

  it("preserves section-header comments as-is", () => {
    const src = `schema a { x INT }

// --- Section ---

schema b { y STRING }`;
    const out = fmt(src);
    assert.ok(out.includes("// --- Section ---"));
  });

  it("preserves trailing inline comments", () => {
    const src = `schema test {
  x INT  // trailing comment
  y STRING
}`;
    const out = fmt(src);
    assert.ok(out.includes("INT") && out.includes("// trailing comment"));
    // Check 2-space minimum gap
    const line = out.split("\n").find(l => l.includes("trailing comment"));
    assert.ok(line);
    assert.match(line, /\S {2}\/\/ trailing comment/);
  });
});

// ── Blank Lines ──────────────────────────────────────────────────────────────

describe("blank lines", () => {
  it("puts 2 blank lines between top-level blocks", () => {
    const src = `schema a { x INT }
schema b { y STRING }`;
    const out = fmt(src);
    assert.ok(out.includes("}\n\n\nschema b"), "should have 2 blank lines between blocks");
  });

  it("no blank lines between consecutive imports", () => {
    const src = `import { foo } from "a.stm"
import { bar } from "b.stm"`;
    const out = fmt(src);
    assert.ok(out.includes('"a.stm"\nimport'));
  });

  it("file ends with single newline", () => {
    const src = `schema test {
  x INT
}


`;
    const out = fmt(src);
    assert.ok(out.endsWith("}\n"), "should end with single newline");
    assert.ok(!out.endsWith("}\n\n"), "should not have trailing blank lines");
  });

  it("preserves blank lines within blocks (normalized to 1)", () => {
    const src = `mapping test {
  source { s }
  target { t }



  s.x -> t.y
}`;
    const out = fmt(src);
    // Multiple blank lines should normalize to 1
    assert.ok(!out.includes("\n\n\n  s.x"), "should not have 2+ blank lines within block");
    assert.ok(out.includes("}\n\n  s.x"), "should preserve 1 blank line");
  });
});

// ── Mapping Formatting ───────────────────────────────────────────────────────

describe("mapping formatting", () => {
  it("formats simple arrows", () => {
    const src = `mapping test {
  source { s }
  target { t }
  s.id   ->   t.id
}`;
    const out = fmt(src);
    assert.ok(out.includes("s.id -> t.id"), "should normalize arrow spacing");
  });

  it("formats inline transforms", () => {
    const src = `mapping test {
  source { s }
  target { t }
  s.x -> t.x {   trim  |  lowercase  }
}`;
    const out = fmt(src);
    assert.ok(out.includes("{ trim | lowercase }"), "should normalize pipe spacing");
  });

  it("formats computed arrows", () => {
    const src = `mapping test {
  source { s }
  target { t }
  -> t.computed { "NL description." }
}`;
    const out = fmt(src);
    assert.ok(out.includes("-> t.computed"));
  });
});

// ── Transform, Metric, Note, Import ──────────────────────────────────────────

describe("transform formatting", () => {
  it("formats transform block", () => {
    const src = `transform my_transform {
  trim | lowercase
}`;
    const out = fmt(src);
    assert.ok(out.includes("transform my_transform {"));
    assert.ok(out.includes("  trim | lowercase"));
  });
});

describe("import formatting", () => {
  it("formats import declaration", () => {
    const src = `import { foo, bar } from "lib.stm"`;
    const out = fmt(src);
    assert.equal(out.trim(), 'import { foo, bar } from "lib.stm"');
  });
});

describe("note formatting", () => {
  it("formats note with triple-quoted string", () => {
    const src = `note {
  """
  Some content.
  """
}`;
    const out = fmt(src);
    assert.ok(out.includes("note {"));
    assert.ok(out.includes('"""'));
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles empty input", () => {
    assert.equal(fmt(""), "\n");
  });

  it("handles empty blocks", () => {
    const src = `schema empty { }`;
    const out = fmt(src);
    assert.ok(out.includes("schema empty {"));
  });

  it("handles deeply nested records", () => {
    const src = `schema test {
  outer record {
    inner record {
      x INT
    }
  }
}`;
    const out = fmt(src);
    assert.ok(out.includes("    inner record {"));
    assert.ok(out.includes("      x  INT"));
  });

  it("handles arithmetic steps in pipe chains", () => {
    const src = `mapping test {
  source { s }
  target { t }
  s.x -> t.y { coalesce(0) | * 100 | round }
}`;
    const out = fmt(src);
    assert.ok(out.includes("* 100"), "should preserve arithmetic operator");
  });

  it("handles map literals with comparison keys", () => {
    const src = `mapping test {
  source { s }
  target { t }
  s.x -> t.y {
    map {
      < 1000: "low"
      default: "high"
    }
  }
}`;
    const out = fmt(src);
    assert.ok(out.includes("< 1000"), "should preserve comparison key");
    assert.ok(out.includes("default"), "should preserve default key");
  });

  it("handles list_of scalar fields in alignment", () => {
    const src = `schema test {
  id INT (pk)
  tags list_of STRING
  codes list_of INT (required)
}`;
    const out = fmt(src);
    // list_of fields participate in alignment
    assert.ok(out.includes("tags   list_of STRING") || out.includes("tags  list_of STRING"));
    assert.ok(out.includes("codes  list_of INT"));
  });

  it("handles namespace blocks", () => {
    const src = `namespace myns (note "Test namespace") {
  schema inner { x INT }
}`;
    const out = fmt(src);
    assert.ok(out.includes('namespace myns (note "Test namespace") {'));
    assert.ok(out.includes("  schema inner {"));
  });

  it("handles multi-line metadata on blocks", () => {
    const src = `schema test (
  format postgresql,
  note "A long description"
) {
  id INT (pk)
}`;
    const out = fmt(src);
    assert.ok(out.includes("schema test ("));
    assert.ok(out.includes("format postgresql,"));
    assert.ok(out.includes(") {"));
  });

  it("handles each/flatten blocks", () => {
    const src = `mapping test {
  source { s }
  target { t }
  each s.items -> t.items {
    .sku -> .sku { trim }
  }
}`;
    const out = fmt(src);
    assert.ok(out.includes("each s.items -> t.items {"));
    assert.ok(out.includes("  .sku -> .sku { trim }"));
  });

  it("handles metric block with display name and metadata", () => {
    const src = `metric mrr "MRR" (source subs, grain monthly) {
  value DECIMAL(14,2) (measure additive)
}`;
    const out = fmt(src);
    assert.ok(out.includes('metric mrr "MRR"'));
    assert.ok(out.includes("value  DECIMAL(14,2)  (measure additive)"));
  });

  it("handles multi-source blocks", () => {
    const src = `mapping test {
  source {
    schema_a
    schema_b
    "join condition"
  }
  target { t }
  a.x -> t.x
}`;
    const out = fmt(src);
    assert.ok(out.includes("source {"));
    assert.ok(out.includes("  schema_a"));
    assert.ok(out.includes("  schema_b"));
  });

  it("handles quoted block labels", () => {
    const src = `schema 'my schema' { x INT }`;
    const out = fmt(src);
    assert.ok(out.includes("schema 'my schema' {"));
  });

  it("handles backtick field names in alignment", () => {
    const src = `schema test {
  \`special_field\` INT
  normal STRING
}`;
    const out = fmt(src);
    assert.ok(out.includes("`special_field`"));
  });

  it("handles inline map on single line", () => {
    const src = `mapping test {
  source { s }
  target { t }
  s.x -> t.y { map { A: "active", I: "inactive" } }
}`;
    const out = fmt(src);
    assert.ok(out.includes("map {") && out.includes("}"));
  });

  it("preserves NL string content verbatim", () => {
    const src = `mapping test {
  source { s }
  target { t }
  -> t.x {
    "Complex NL: use \`field_a\` + \`field_b\`. Handle edge cases."
  }
}`;
    const out = fmt(src);
    assert.ok(out.includes("`field_a`"));
    assert.ok(out.includes("`field_b`"));
  });
});

// ── Golden Fixture Tests ─────────────────────────────────────────────────────

describe("golden fixture round-trip (all corpus)", () => {
  const stmFiles = readdirSync(examplesDir).filter(f => f.endsWith(".stm"));

  for (const file of stmFiles) {
    it(`format(parse(examples/${file})) parses without errors`, () => {
      const src = readFileSync(join(examplesDir, file), "utf8");
      const out = fmt(src);
      const { errorCount } = parseSource(out);
      assert.equal(errorCount, 0, `formatted output should parse cleanly`);
    });
  }
});
