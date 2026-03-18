/**
 * validate.js — Structural and semantic validation for STM workspaces
 *
 * Structural checks: CST ERROR/MISSING nodes from tree-sitter.
 * Semantic checks: undefined references, duplicates, field mismatches.
 */

/**
 * @typedef {Object} Diagnostic
 * @property {string} file
 * @property {number} line     1-based
 * @property {number} column   1-based
 * @property {'error'|'warning'} severity
 * @property {string} rule
 * @property {string} message
 */

/**
 * Collect all ERROR and MISSING nodes from a CST.
 *
 * @param {object} node  tree-sitter root node
 * @param {string} file  file path
 * @returns {Diagnostic[]}
 */
export function collectParseErrors(node, file) {
  const diagnostics = [];
  walkErrors(node, file, diagnostics);
  return diagnostics;
}

function walkErrors(node, file, diagnostics) {
  if (node.type === "ERROR") {
    diagnostics.push({
      file,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      severity: "error",
      rule: "parse-error",
      message: `Syntax error: unexpected '${node.text.slice(0, 40).replace(/\n/g, "\\n")}'`,
    });
  } else if (node.isMissing) {
    diagnostics.push({
      file,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      severity: "error",
      rule: "missing-node",
      message: `Missing expected '${node.type}'`,
    });
  }
  for (const c of node.namedChildren) {
    walkErrors(c, file, diagnostics);
  }
}

/**
 * Run semantic checks against a WorkspaceIndex.
 *
 * @param {object} index  WorkspaceIndex
 * @returns {Diagnostic[]}
 */
export function collectSemanticWarnings(index) {
  const diagnostics = [];

  // Check mapping source/target references
  for (const [name, mapping] of index.mappings) {
    for (const src of mapping.sources) {
      if (!index.schemas.has(src) && !index.fragments.has(src)) {
        diagnostics.push({
          file: mapping.file,
          line: mapping.row + 1,
          column: 1,
          severity: "warning",
          rule: "undefined-ref",
          message: `Mapping '${name}' references undefined source '${src}'`,
        });
      }
    }
    for (const tgt of mapping.targets) {
      if (!index.schemas.has(tgt) && !index.fragments.has(tgt)) {
        diagnostics.push({
          file: mapping.file,
          line: mapping.row + 1,
          column: 1,
          severity: "warning",
          rule: "undefined-ref",
          message: `Mapping '${name}' references undefined target '${tgt}'`,
        });
      }
    }
  }

  // Check metric source references
  for (const [name, metric] of index.metrics) {
    for (const src of (metric.sources ?? [])) {
      if (!index.schemas.has(src)) {
        diagnostics.push({
          file: metric.file,
          line: metric.row + 1,
          column: 1,
          severity: "warning",
          rule: "undefined-ref",
          message: `Metric '${name}' references undefined source '${src}'`,
        });
      }
    }
  }

  // Check arrow field references against declared schemas
  if (index.fieldArrows) {
    for (const [_name, mapping] of index.mappings) {
      const srcSchema = mapping.sources[0];
      const tgtSchema = mapping.targets[0];
      const srcFields = index.schemas.get(srcSchema)?.fields ?? [];
      const tgtFields = index.schemas.get(tgtSchema)?.fields ?? [];
      const srcNames = new Set(srcFields.map((f) => f.name));
      const tgtNames = new Set(tgtFields.map((f) => f.name));

      for (const [_fieldKey, arrows] of index.fieldArrows) {
        for (const arrow of arrows) {
          if (arrow.mapping !== mapping.name) continue;
          if (
            arrow.source &&
            srcSchema &&
            index.schemas.has(srcSchema) &&
            !srcNames.has(arrow.source)
          ) {
            diagnostics.push({
              file: arrow.file,
              line: arrow.line + 1,
              column: 1,
              severity: "warning",
              rule: "field-not-in-schema",
              message: `Arrow source '${arrow.source}' not declared in schema '${srcSchema}'`,
            });
          }
          if (
            arrow.target &&
            tgtSchema &&
            index.schemas.has(tgtSchema) &&
            !tgtNames.has(arrow.target)
          ) {
            diagnostics.push({
              file: arrow.file,
              line: arrow.line + 1,
              column: 1,
              severity: "warning",
              rule: "field-not-in-schema",
              message: `Arrow target '${arrow.target}' not declared in schema '${tgtSchema}'`,
            });
          }
        }
      }
    }
  }

  return diagnostics;
}
