/**
 * classify.test.js — Unit tests for src/classify.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyTransform, classifyArrow } from "#src/classify.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

function n(type, namedChildren = [], text = "", row = 0) {
  return { type, text, startPosition: { row, column: 0 }, namedChildren };
}

function pipeStep(innerType, innerChildren = [], text = "") {
  return n("pipe_step", [n(innerType, innerChildren, text)]);
}

// Helper: pipe_text wrapping identifiers (structural)
function structuralStep(text) {
  return pipeStep("pipe_text", [n("identifier", [], text)], text);
}

// Helper: pipe_text wrapping nl_string (NL)
function nlStep(text) {
  return pipeStep("pipe_text", [n("nl_string", [], text)], text);
}

// ── classifyTransform ────────────────────────────────────────────────────────

describe("classifyTransform", () => {
  it("returns 'structural' for pipe_text with identifiers", () => {
    const steps = [structuralStep("trim"), structuralStep("lowercase")];
    assert.equal(classifyTransform(steps), "structural");
  });

  it("returns 'structural' for map_literal steps", () => {
    const steps = [pipeStep("map_literal", [], 'map { A: "active" }')];
    assert.equal(classifyTransform(steps), "structural");
  });

  it("returns 'structural' for fragment_spread steps", () => {
    const steps = [pipeStep("fragment_spread", [], "...address")];
    assert.equal(classifyTransform(steps), "structural");
  });

  it("returns 'structural' for mixed structural types", () => {
    const steps = [
      structuralStep("trim"),
      pipeStep("map_literal", [], "map { X: Y }"),
      pipeStep("fragment_spread", [], "...common"),
    ];
    assert.equal(classifyTransform(steps), "structural");
  });

  it("returns 'nl' for pipe_text containing only nl_string", () => {
    const steps = [nlStep('"Do something with this"')];
    assert.equal(classifyTransform(steps), "nl");
  });

  it("returns 'nl' for pipe_text containing only multiline_string", () => {
    const steps = [pipeStep("pipe_text", [n("multiline_string", [], '"""Some long description"""')], '"""Some long description"""')];
    assert.equal(classifyTransform(steps), "nl");
  });

  it("returns 'mixed' for transforms with both structural and NL steps", () => {
    const steps = [
      nlStep('"Filter profanity"'),
      structuralStep("escape_html"),
      structuralStep("truncate(5000)"),
    ];
    assert.equal(classifyTransform(steps), "mixed");
  });

  it("returns 'mixed' when a single pipe_text has both identifiers and NL strings", () => {
    // e.g. `lookup some_table "Apply business rule"`
    const steps = [
      pipeStep("pipe_text", [
        n("identifier", [], "lookup"),
        n("identifier", [], "some_table"),
        n("nl_string", [], '"Apply business rule"'),
      ], 'lookup some_table "Apply business rule"'),
    ];
    assert.equal(classifyTransform(steps), "mixed");
  });

  it("returns 'none' for empty steps array", () => {
    assert.equal(classifyTransform([]), "none");
  });

  it("returns 'none' for null/undefined", () => {
    assert.equal(classifyTransform(null), "none");
    assert.equal(classifyTransform(undefined), "none");
  });

  it("returns 'none' for steps with no recognized inner nodes", () => {
    const steps = [n("pipe_step", [])];
    assert.equal(classifyTransform(steps), "none");
  });

  it("returns 'structural' for pipe_text with arithmetic tokens", () => {
    const steps = [pipeStep("pipe_text", [n("number_literal", [], "100")], "* 100")];
    assert.equal(classifyTransform(steps), "structural");
  });
});

// ── classifyArrow ────────────────────────────────────────────────────────────

describe("classifyArrow", () => {
  it("returns true for computed_arrow (derived)", () => {
    const arrow = n("computed_arrow");
    assert.equal(classifyArrow(arrow), true);
  });

  it("returns false for map_arrow (not derived)", () => {
    const arrow = n("map_arrow");
    assert.equal(classifyArrow(arrow), false);
  });

  it("returns false for nested_arrow (not derived)", () => {
    const arrow = n("nested_arrow");
    assert.equal(classifyArrow(arrow), false);
  });
});
