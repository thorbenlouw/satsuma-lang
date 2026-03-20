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

function pipeStep(innerType, text = "") {
  return n("pipe_step", [n(innerType, [], text)]);
}

// ── classifyTransform ────────────────────────────────────────────────────────

describe("classifyTransform", () => {
  it("returns 'structural' for token_call-only pipelines", () => {
    const steps = [pipeStep("token_call", "trim"), pipeStep("token_call", "lowercase")];
    assert.equal(classifyTransform(steps), "structural");
  });

  it("returns 'structural' for map_literal steps", () => {
    const steps = [pipeStep("map_literal", 'map { A: "active" }')];
    assert.equal(classifyTransform(steps), "structural");
  });

  it("returns 'structural' for fragment_spread steps", () => {
    const steps = [pipeStep("fragment_spread", "...address")];
    assert.equal(classifyTransform(steps), "structural");
  });

  it("returns 'structural' for mixed structural types", () => {
    const steps = [
      pipeStep("token_call", "trim"),
      pipeStep("map_literal", "map { X: Y }"),
      pipeStep("fragment_spread", "...common"),
    ];
    assert.equal(classifyTransform(steps), "structural");
  });

  it("returns 'nl' for nl_string-only transforms", () => {
    const steps = [pipeStep("nl_string", '"Do something with this"')];
    assert.equal(classifyTransform(steps), "nl");
  });

  it("returns 'nl' for multiline_string-only transforms", () => {
    const steps = [pipeStep("multiline_string", '"""Some long description"""')];
    assert.equal(classifyTransform(steps), "nl");
  });

  it("returns 'mixed' for transforms with both structural and NL steps", () => {
    const steps = [
      pipeStep("nl_string", '"Filter profanity"'),
      pipeStep("token_call", "escape_html"),
      pipeStep("token_call", "truncate(5000)"),
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
