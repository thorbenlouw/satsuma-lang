/**
 * classify.test.js — Unit tests for satsuma-core classify module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyTransform, classifyArrow } from "../dist/classify.js";

function n(type, namedChildren = [], text = "") {
  return { type, text, isNamed: true, namedChildren, children: namedChildren, startPosition: { row: 0, column: 0 } };
}

function pipeStep(innerType, innerChildren = [], text = "") {
  return n("pipe_step", [n(innerType, innerChildren, text)]);
}

function structuralStep(text) {
  return pipeStep("pipe_text", [n("identifier", [], text)], text);
}

function nlStep(text) {
  return pipeStep("pipe_text", [n("nl_string", [], text)], text);
}

describe("classifyTransform()", () => {
  it("returns 'none' for empty steps", () => {
    assert.equal(classifyTransform([]), "none");
  });

  it("returns 'none' for null steps", () => {
    assert.equal(classifyTransform(null), "none");
  });

  it("returns 'structural' for structural-only steps", () => {
    assert.equal(classifyTransform([structuralStep("upper")]), "structural");
  });

  it("returns 'nl' for NL-only steps", () => {
    assert.equal(classifyTransform([nlStep('"convert to USD"')]), "nl");
  });

  it("returns 'mixed' for both structural and NL steps", () => {
    assert.equal(classifyTransform([structuralStep("upper"), nlStep('"apply fx"')]), "mixed");
  });

  it("returns 'structural' for map_literal step", () => {
    assert.equal(classifyTransform([pipeStep("map_literal", [], "{}")]), "structural");
  });
});

describe("classifyArrow()", () => {
  it("returns true for computed_arrow", () => {
    assert.equal(classifyArrow(n("computed_arrow")), true);
  });

  it("returns false for map_arrow", () => {
    assert.equal(classifyArrow(n("map_arrow")), false);
  });
});
