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

  // Check metric source references — only warn when the metric source looks
  // like it should resolve (i.e. at least one metric source in the workspace
  // does resolve to a known schema).  Metric sources are metadata annotations
  // that often reference external tables not present in the local workspace,
  // so blanket warnings create false positives.
  const anyMetricSourceResolvable = [...index.metrics.values()].some((m) =>
    (m.sources ?? []).some((s) => index.schemas.has(s)),
  );
  if (anyMetricSourceResolvable) {
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
  }

  // Check arrow field references against declared schemas
  if (index.fieldArrows) {
    // Collect unique arrows from the fieldArrows index (each arrow may appear
    // under both its source and target key — deduplicate by identity).
    const seenArrows = new Set();
    const uniqueArrows = [];
    for (const [_fieldKey, arrows] of index.fieldArrows) {
      for (const arrow of arrows) {
        if (seenArrows.has(arrow)) continue;
        seenArrows.add(arrow);
        uniqueArrows.push(arrow);
      }
    }

    for (const [_name, mapping] of index.mappings) {
      const srcSchemas = mapping.sources;
      const tgtSchema = mapping.targets[0];
      const srcSchema = srcSchemas[0];

      // Build source field name set: for multi-source mappings, collect fields
      // from all source schemas. Build a nested-path-aware set.
      const srcFieldPaths = new Set();
      for (const s of srcSchemas) {
        const fields = index.schemas.get(s)?.fields ?? [];
        collectFieldPaths(fields, "", srcFieldPaths);
      }
      // For multi-source, also allow schema-qualified references (schema.field)
      if (srcSchemas.length > 1) {
        for (const s of srcSchemas) {
          const fields = index.schemas.get(s)?.fields ?? [];
          collectFieldPaths(fields, s + ".", srcFieldPaths);
        }
      }

      const tgtFields = index.schemas.get(tgtSchema)?.fields ?? [];
      const tgtFieldPaths = new Set();
      collectFieldPaths(tgtFields, "", tgtFieldPaths);

      // Check if source or target schema has unresolved spreads
      const srcHasSpreads = srcSchemas.some((s) => index.schemas.get(s)?.hasSpreads);
      const tgtHasSpreads = index.schemas.get(tgtSchema)?.hasSpreads ?? false;

      for (const arrow of uniqueArrows) {
        if (arrow.mapping !== mapping.name) continue;

        if (
          arrow.source &&
          srcSchema &&
          index.schemas.has(srcSchema) &&
          !srcHasSpreads &&
          !resolveFieldPath(arrow.source, srcSchemas, index, srcFieldPaths)
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
          !tgtHasSpreads &&
          !resolveFieldPath(arrow.target, [tgtSchema], index, tgtFieldPaths)
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

  return diagnostics;
}

// ── Field path resolution helpers ─────────────────────────────────────────────

/**
 * Recursively collect all valid dotted field paths from a field tree.
 * E.g. for schema { record Order { OrderId INT, record Customer { Email STRING } } }
 * collects: "Order", "Order.OrderId", "Order.Customer", "Order.Customer.Email"
 *
 * @param {Array<{name:string, type:string, children?:Array}>} fields
 * @param {string} prefix  dot-separated path prefix (e.g. "Order.")
 * @param {Set<string>} paths  accumulator set
 */
function collectFieldPaths(fields, prefix, paths) {
  for (const f of fields) {
    const fullPath = prefix + f.name;
    paths.add(fullPath);
    // list fields can be accessed with [] notation — add both forms
    if (f.isList) {
      paths.add(prefix + f.name + "[]");
    }
    if (f.children && f.children.length > 0) {
      collectFieldPaths(f.children, fullPath + ".", paths);
      if (f.isList) {
        collectFieldPaths(f.children, fullPath + "[].", paths);
      }
    }
  }
}

/**
 * Resolve an arrow field path against available schemas and field paths.
 * Handles:
 * - Direct match in fieldPaths set (covers nested dotted paths)
 * - Relative paths (starting with ".") — always considered valid
 *   (they reference fields relative to a nested arrow context)
 * - Schema-qualified paths for multi-source mappings (schema.field)
 *
 * @param {string} path  arrow source or target path
 * @param {string[]} schemaNames  available schema names for this side
 * @param {object} index  WorkspaceIndex
 * @param {Set<string>} fieldPaths  pre-collected valid field paths
 * @returns {boolean}  true if the path resolves
 */
function resolveFieldPath(path, schemaNames, index, fieldPaths) {
  // Relative paths (e.g. .REFNUM, .orderNo) are context-dependent — accept them
  if (path.startsWith(".")) return true;

  // Direct match in the pre-collected paths
  if (fieldPaths.has(path)) return true;

  // For multi-source mappings, try schema-qualified resolution (schema.field)
  if (schemaNames.length > 1) {
    const dotIdx = path.indexOf(".");
    if (dotIdx > 0) {
      const qualifier = path.slice(0, dotIdx);
      if (schemaNames.includes(qualifier)) {
        const rest = path.slice(dotIdx + 1);
        const schemaFields = index.schemas.get(qualifier)?.fields ?? [];
        const qualPaths = new Set();
        collectFieldPaths(schemaFields, "", qualPaths);
        if (qualPaths.has(rest)) return true;
      }
    }
  }

  return false;
}
