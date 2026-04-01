/**
 * classify.test.js — Unit tests for src/classify.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyTransform, classifyArrow } from "@satsuma/core";
import { mockNode } from "./helpers.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

function n(type: string, namedChildren: any[] = [], text = "", row = 0) {
  return mockNode(type, namedChildren, text, row);
}

function pipeStep(innerType: string, innerChildren: any[] = [], text = "") {
  return n("pipe_step", [n(innerType, innerChildren, text)]);
}

// Helper: pipe_text wrapping identifiers (structural)
function structuralStep(text: string) {
  return pipeStep("pipe_text", [n("identifier", [], text)], text);
}

// Helper: pipe_text wrapping nl_string (NL)
function nlStep(text: string) {
  return pipeStep("pipe_text", [n("nl_string", [], text)], text);
}

// ── classifyTransform ────────────────────────────────────────────────────────

describe("classifyTransform", () => {
  it("returns 'structural' for pipe_text with identifiers", () => {
    const steps = [structuralStep("trim"), structuralStep("lowercase")];
    assert.equal(classifyTransform(steps as any), "structural");
  });

  it("returns 'structural' for map_literal steps", () => {
    const steps = [pipeStep("map_literal", [], 'map { A: "active" }')];
    assert.equal(classifyTransform(steps as any), "structural");
  });

  it("returns 'structural' for fragment_spread steps", () => {
    const steps = [pipeStep("fragment_spread", [], "...address")];
    assert.equal(classifyTransform(steps as any), "structural");
  });

  it("returns 'structural' for mixed structural types", () => {
    const steps = [
      structuralStep("trim"),
      pipeStep("map_literal", [], "map { X: Y }"),
      pipeStep("fragment_spread", [], "...common"),
    ];
    assert.equal(classifyTransform(steps as any), "structural");
  });

  it("returns 'nl' for pipe_text containing only nl_string", () => {
    const steps = [nlStep('"Do something with this"')];
    assert.equal(classifyTransform(steps as any), "nl");
  });

  it("returns 'nl' for pipe_text containing only multiline_string", () => {
    const steps = [pipeStep("pipe_text", [n("multiline_string", [], '"""Some long description"""')], '"""Some long description"""')];
    assert.equal(classifyTransform(steps as any), "nl");
  });

  it("returns 'mixed' for transforms with both structural and NL steps", () => {
    const steps = [
      nlStep('"Filter profanity"'),
      structuralStep("escape_html"),
      structuralStep("truncate(5000)"),
    ];
    assert.equal(classifyTransform(steps as any), "mixed");
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
    assert.equal(classifyTransform(steps as any), "mixed");
  });

  it("returns 'none' for empty steps array", () => {
    assert.equal(classifyTransform([] as any), "none");
  });

  it("returns 'none' for null/undefined", () => {
    assert.equal(classifyTransform(null as any), "none");
    assert.equal(classifyTransform(undefined as any), "none");
  });

  it("returns 'none' for steps with no recognized inner nodes", () => {
    const steps = [n("pipe_step", [])];
    assert.equal(classifyTransform(steps as any), "none");
  });

  it("returns 'structural' for pipe_text with arithmetic tokens", () => {
    const steps = [pipeStep("pipe_text", [n("number_literal", [], "100")], "* 100")];
    assert.equal(classifyTransform(steps as any), "structural");
  });
});

// ── classifyArrow ────────────────────────────────────────────────────────────

describe("classifyArrow", () => {
  it("returns true for computed_arrow (derived)", () => {
    const arrow = n("computed_arrow");
    assert.equal(classifyArrow(arrow as any), true);
  });

  it("returns false for map_arrow (not derived)", () => {
    const arrow = n("map_arrow");
    assert.equal(classifyArrow(arrow as any), false);
  });

  it("returns false for nested_arrow (not derived)", () => {
    const arrow = n("nested_arrow");
    assert.equal(classifyArrow(arrow as any), false);
  });
});
