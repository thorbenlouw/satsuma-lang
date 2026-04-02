/**
 * classify.test.ts — Unit tests for core classifyTransform and classifyArrow.
 *
 * After Feature 28, all pipe steps are NL. classifyTransform is a simple
 * presence check: any non-empty step array → "nl", empty/null → "none".
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

// ── classifyTransform ────────────────────────────────────────────────────────

describe("classifyTransform", () => {
  // All non-empty step arrays return "nl" regardless of content type
  it("returns 'nl' for bare identifier steps", () => {
    const steps = [
      pipeStep("pipe_text", [n("identifier", [], "trim")], "trim"),
      pipeStep("pipe_text", [n("identifier", [], "lowercase")], "lowercase"),
    ];
    assert.equal(classifyTransform(steps as any), "nl");
  });

  it("returns 'nl' for map_literal steps", () => {
    const steps = [pipeStep("map_literal", [], 'map { A: "active" }')];
    assert.equal(classifyTransform(steps as any), "nl");
  });

  it("returns 'nl' for fragment_spread steps", () => {
    const steps = [pipeStep("fragment_spread", [], "...address")];
    assert.equal(classifyTransform(steps as any), "nl");
  });

  it("returns 'nl' for quoted NL string steps", () => {
    const steps = [pipeStep("pipe_text", [n("nl_string", [], '"Do something"')], '"Do something"')];
    assert.equal(classifyTransform(steps as any), "nl");
  });

  it("returns 'nl' for multiline string steps", () => {
    const steps = [pipeStep("pipe_text", [n("multiline_string", [], '"""Long"""')], '"""Long"""')];
    assert.equal(classifyTransform(steps as any), "nl");
  });

  it("returns 'nl' for mixed bare + quoted steps", () => {
    const steps = [
      pipeStep("pipe_text", [n("nl_string", [], '"Filter"')], '"Filter"'),
      pipeStep("pipe_text", [n("identifier", [], "escape_html")], "escape_html"),
    ];
    assert.equal(classifyTransform(steps as any), "nl");
  });

  it("returns 'none' for empty steps array", () => {
    assert.equal(classifyTransform([] as any), "none");
  });

  it("returns 'none' for null/undefined", () => {
    assert.equal(classifyTransform(null as any), "none");
    assert.equal(classifyTransform(undefined as any), "none");
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
