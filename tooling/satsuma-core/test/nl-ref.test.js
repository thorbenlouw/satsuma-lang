/**
 * nl-ref.test.js — Unit tests for satsuma-core nl-ref module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AT_REF_PATTERN,
  createAtRefRegex,
  extractAtRefs,
  computeNLRefPosition,
  classifyRef,
  resolveRef,
  resolveAllNLRefs,
  stripNLRefScopePrefix,
} from "../dist/nl-ref.js";

// ── extractAtRefs ─────────────────────────────────────────────────────────────

describe("extractAtRefs()", () => {
  it("extracts @ref mentions", () => {
    const refs = extractAtRefs("Sum @amount grouped by @order_id");
    assert.deepEqual(refs.map(r => r.ref), ["amount", "order_id"]);
  });

  it("extracts @ns::schema.field refs", () => {
    const refs = extractAtRefs("Join @crm::customers.id to @dim_customer.customer_id");
    assert.deepEqual(refs.map(r => r.ref), ["crm::customers.id", "dim_customer.customer_id"]);
  });

  it("handles @`backtick-name` refs", () => {
    const refs = extractAtRefs("@`order-id` value");
    assert.equal(refs.length, 1);
    assert.equal(refs[0].ref, "order-id");
  });

  it("returns empty for text with no refs", () => {
    const refs = extractAtRefs("plain text with no references");
    assert.deepEqual(refs, []);
  });

  // sl-gl21: the @ref regex previously matched any @ followed by an identifier,
  // producing false positives inside email addresses and SQL LIKE wildcards.
  // The lookbehind anchors @ to start-of-string, whitespace, or specific
  // opening/separator punctuation. These cases lock that contract in place.

  it("does not extract @refs from email-like patterns (sl-gl21)", () => {
    // user@example.com — the `r` before @ is a word char, so the lookbehind fails.
    const refs = extractAtRefs("contact user@example.com for details");
    assert.deepEqual(refs, []);
  });

  it("does not extract @refs from SQL LIKE wildcards like %@foo (sl-gl21)", () => {
    // The example that triggered the original report:
    // `email LIKE %@test.internal` inside a note. `%` must not be allowed
    // before @ — only whitespace and a small set of opening punctuation.
    const refs = extractAtRefs("filter where email LIKE %@test.internal");
    assert.deepEqual(refs, []);
  });

  it("does not extract @refs after a digit or underscore", () => {
    // Guards against accidentally widening the allowed prefix set: digits,
    // letters and underscore are all word chars and must remain disallowed.
    assert.deepEqual(extractAtRefs("v2@version"), []);
    assert.deepEqual(extractAtRefs("name_@suffix"), []);
  });

  it("extracts @ref at start of string", () => {
    // Start-of-string is one of the explicitly allowed positions.
    const refs = extractAtRefs("@customer_id is the key");
    assert.deepEqual(refs.map(r => r.ref), ["customer_id"]);
  });

  it("extracts @refs after opening punctuation like ( [ { , ;", () => {
    // Acceptance criterion from sl-gl21: opening punctuation must still
    // qualify as a valid prefix so refs in parenthesised text resolve.
    assert.deepEqual(extractAtRefs("coalesce(@a, @b)").map(r => r.ref), ["a", "b"]);
    assert.deepEqual(extractAtRefs("[@a; @b]").map(r => r.ref), ["a", "b"]);
    assert.deepEqual(extractAtRefs("{@a}").map(r => r.ref), ["a"]);
  });

  it("extracts @refs across multiple lines (after newline counts as whitespace)", () => {
    // \n is part of \s, so refs at the start of a continuation line in a
    // triple-quoted NL string must still be extracted. This pairs with the
    // multiline-position helper exercised below.
    const refs = extractAtRefs("first line\n@second_line ref");
    assert.deepEqual(refs.map(r => r.ref), ["second_line"]);
  });
});

// ── createAtRefRegex / AT_REF_PATTERN ─────────────────────────────────────────

describe("createAtRefRegex()", () => {
  it("returns a fresh regex instance each call", () => {
    // Two consumers must not share /g state — sharing the same RegExp object
    // across modules historically caused intermittent missed matches when one
    // consumer left lastIndex non-zero.
    const a = createAtRefRegex();
    const b = createAtRefRegex();
    assert.notEqual(a, b);
    a.exec("@x");
    assert.equal(b.lastIndex, 0);
  });

  it("AT_REF_PATTERN compiles to the same shape as the regex", () => {
    // The exported pattern string is what non-core consumers (LSP, viz)
    // would inline if they need a custom-flagged regex. It must compile and
    // produce equivalent matches to createAtRefRegex().
    const re = new RegExp(AT_REF_PATTERN, "g");
    assert.equal(re.exec("@foo")?.[0], "@foo");
  });
});

// ── computeNLRefPosition ──────────────────────────────────────────────────────

describe("computeNLRefPosition()", () => {
  // sl-2ji3: the validator previously reported diagnostic positions for @refs
  // inside multiline NL strings using a naive `item.line + 1, item.column +
  // offset + 1` formula. That ignored newlines, so an @ref on line 3 of a
  // triple-quoted body got reported at the line of the opening `"""`.

  it("reports a 1-based single-line position for refs on the opener line", () => {
    // The NL string starts at row=10, col=4. An @ref at offset 5 within the
    // text sits on the same line, so column is the start column + offset + 1.
    const item = { text: "see @foo here", line: 10, column: 4 };
    const pos = computeNLRefPosition(item, item.text.indexOf("@"));
    assert.deepEqual(pos, { line: 11, column: 9 });
  });

  it("reports the correct line for an @ref on a continuation line of a multiline string", () => {
    // Multiline body of a """...""" string starting at file row 5. The @ref
    // is on the third logical line of the body, so line should be 5+2+1 = 8.
    const item = {
      text: "first line\nsecond line\n@third_ref here",
      line: 5,
      column: 0,
    };
    const offset = item.text.indexOf("@");
    const pos = computeNLRefPosition(item, offset);
    assert.equal(pos.line, 8);
    // Column 1 because the @ is the first character on its line.
    assert.equal(pos.column, 1);
  });

  it("uses the per-line column rather than the byte offset on continuation lines", () => {
    // The bug from sl-2ji3 was that column was reported as `startColumn +
    // offset` even after newlines, producing huge bogus columns. Here the @
    // sits 4 chars into its own line, so column must be 5 (1-based), not the
    // byte offset relative to the string start.
    const item = { text: "first\n    @ref end", line: 2, column: 8 };
    const offset = item.text.indexOf("@");
    const pos = computeNLRefPosition(item, offset);
    assert.equal(pos.line, 4);  // 2 + 1 newline + 1 (1-based)
    assert.equal(pos.column, 5);
  });
});

// ── classifyRef ───────────────────────────────────────────────────────────────

describe("classifyRef()", () => {
  it("classifies bare identifier", () => {
    assert.equal(classifyRef("customer_id"), "bare");
  });

  it("classifies dotted field", () => {
    assert.equal(classifyRef("schema.field"), "dotted-field");
  });

  it("classifies namespace-qualified schema", () => {
    assert.equal(classifyRef("crm::customers"), "namespace-qualified-schema");
  });

  it("classifies namespace-qualified field", () => {
    assert.equal(classifyRef("crm::customers.email"), "namespace-qualified-field");
  });
});

// ── resolveRef ────────────────────────────────────────────────────────────────

function makeLookup(schemas = {}, fragments = {}, transforms = {}, mappings = {}) {
  const schemaMap = new Map(Object.entries(schemas));
  const fragMap = new Map(Object.entries(fragments));
  const transformMap = new Map(Object.entries(transforms));
  const mappingMap = new Map(Object.entries(mappings));
  return {
    hasSchema: (k) => schemaMap.has(k),
    getSchema: (k) => schemaMap.get(k) ?? null,
    hasFragment: (k) => fragMap.has(k),
    getFragment: (k) => fragMap.get(k) ?? null,
    hasTransform: (k) => transformMap.has(k),
    getMapping: (k) => mappingMap.get(k) ?? null,
    iterateSchemas: () => schemaMap.entries(),
  };
}

describe("resolveRef()", () => {
  it("resolves a bare field against mapping sources", () => {
    const lookup = makeLookup({ "::orders": { fields: [{ name: "order_id" }], hasSpreads: false } });
    const ctx = { sources: ["::orders"], targets: [], namespace: null };
    const r = resolveRef("order_id", ctx, lookup);
    assert.equal(r.resolved, true);
    assert.equal(r.resolvedTo.kind, "field");
    assert.equal(r.resolvedTo.name, "::orders.order_id");
  });

  it("resolves a namespace-qualified schema", () => {
    const lookup = makeLookup({ "crm::customers": { fields: [], hasSpreads: false } });
    const ctx = { sources: [], targets: [], namespace: null };
    const r = resolveRef("crm::customers", ctx, lookup);
    assert.equal(r.resolved, true);
    assert.equal(r.resolvedTo.kind, "schema");
  });

  it("returns unresolved for unknown ref", () => {
    const lookup = makeLookup({});
    const ctx = { sources: [], targets: [], namespace: null };
    const r = resolveRef("unknown_field", ctx, lookup);
    assert.equal(r.resolved, false);
  });

  it("resolves bare field via workspace fallback when no context", () => {
    const lookup = makeLookup({ my_schema: { fields: [{ name: "email" }], hasSpreads: false } });
    const ctx = { sources: [], targets: [], namespace: null };
    const r = resolveRef("email", ctx, lookup);
    assert.equal(r.resolved, true);
    assert.equal(r.resolvedTo.kind, "field");
  });
});

// ── resolveAllNLRefs ──────────────────────────────────────────────────────────

describe("resolveAllNLRefs()", () => {
  it("resolves refs from NL ref data items", () => {
    const lookup = makeLookup({ "::orders": { fields: [{ name: "amount" }], hasSpreads: false } });
    const items = [
      {
        text: "Sum @amount",
        mapping: "my_mapping",
        namespace: null,
        targetField: "total",
        line: 5,
        column: 0,
        file: "test.stm",
      },
    ];
    const results = resolveAllNLRefs(items, lookup);
    assert.equal(results.length, 1);
    assert.equal(results[0].ref, "amount");
    assert.equal(results[0].classification, "bare");
  });

  it("returns empty array for empty input", () => {
    const lookup = makeLookup({});
    assert.deepEqual(resolveAllNLRefs([], lookup), []);
  });
});

// ── stripNLRefScopePrefix ────────────────────────────────────────────────────

describe("stripNLRefScopePrefix", () => {
  it("strips note:metric: prefix to bare entity name", () => {
    assert.equal(stripNLRefScopePrefix("note:metric:churn_rate"), "churn_rate");
  });

  it("strips note:schema: prefix to bare entity name", () => {
    assert.equal(stripNLRefScopePrefix("note:schema:orders"), "orders");
  });

  it("strips note:fragment: prefix to bare entity name", () => {
    assert.equal(stripNLRefScopePrefix("note:fragment:address"), "address");
  });

  it("strips transform: prefix to bare entity name", () => {
    assert.equal(stripNLRefScopePrefix("transform:normalize"), "normalize");
  });

  it("returns placeholder for standalone file-level note", () => {
    // Standalone notes have mapping "note:" — after stripping the bare
    // prefix, the result would be empty. Use a descriptive placeholder.
    assert.equal(stripNLRefScopePrefix("note:"), "(file-level note)");
  });

  it("returns mapping names without scope prefix unchanged", () => {
    assert.equal(stripNLRefScopePrefix("crm sync"), "crm sync");
    assert.equal(stripNLRefScopePrefix("ns::load data"), "ns::load data");
  });
});
