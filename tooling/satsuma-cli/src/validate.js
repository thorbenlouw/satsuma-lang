/**
 * validate.js — Structural and semantic validation for Satsuma workspaces
 *
 * Structural checks: CST ERROR/MISSING nodes from tree-sitter.
 * Semantic checks: undefined references, duplicates, field mismatches,
 * NL backtick reference validation.
 */

import {
  extractBacktickRefs,
  classifyRef,
  resolveRef,
  isSchemaInMappingSources,
} from "./nl-ref-extract.js";
import { resolveScopedEntityRef } from "./index-builder.js";

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
 * Resolve an entity name against the index with namespace-aware lookup.
 *
 * Qualified names (ns::name) are direct lookups.
 * Unqualified names resolve in: (1) current namespace, (2) global namespace.
 *
 * @param {string} ref  The reference name (possibly ns::qualified)
 * @param {string|null} currentNs  The namespace of the referring entity
 * @param {Map} entityMap  The index map to search (schemas, fragments, etc.)
 * @returns {string|null}  The resolved qualified key, or null if not found
 */
function resolveEntityRef(ref, currentNs, entityMap) {
  return resolveScopedEntityRef(ref, currentNs, entityMap);
}

/**
 * Suggest qualified alternatives for an unresolved reference.
 *
 * @param {string} ref  The unresolved reference name
 * @param {Map} entityMap  The index map to search
 * @returns {string[]}  Qualified names that match the base name
 */
function suggestAlternatives(ref, entityMap) {
  // Only suggest for unqualified refs
  if (ref.includes("::")) return [];
  const hints = [];
  for (const key of entityMap.keys()) {
    if (key.endsWith(`::${ref}`)) hints.push(key);
  }
  return hints;
}

/**
 * Run semantic checks against a WorkspaceIndex.
 *
 * @param {object} index  WorkspaceIndex
 * @returns {Diagnostic[]}
 */
export function collectSemanticWarnings(index) {
  const diagnostics = [];

  // Check for duplicate named definitions (schemas, metrics, mappings, fragments, transforms).
  // Names must be unique across all entity types within a namespace.
  if (index.duplicates) {
    for (const dup of index.duplicates) {
      if (dup.kind === "namespace-metadata") {
        diagnostics.push({
          file: dup.file,
          line: dup.row + 1,
          column: 1,
          severity: "error",
          rule: "namespace-metadata-conflict",
          message: `Namespace '${dup.name}' has conflicting '${dup.tag}' values: "${dup.value}" vs "${dup.previousValue}" in ${dup.previousFile}:${dup.previousRow + 1}`,
        });
        continue;
      }
      const sameKind = dup.kind === dup.previousKind;
      const msg = sameKind
        ? `${capitalize(dup.kind)} '${dup.name}' is already defined in ${dup.previousFile}:${dup.previousRow + 1}`
        : `${capitalize(dup.kind)} '${dup.name}' conflicts with ${dup.previousKind} already defined in ${dup.previousFile}:${dup.previousRow + 1}`;
      diagnostics.push({
        file: dup.file,
        line: dup.row + 1,
        column: 1,
        severity: "error",
        rule: "duplicate-definition",
        message: msg,
      });
    }
  }

  // Helper: build a combined map of schemas + fragments for reference resolution
  const allDefinitions = new Map([...index.schemas, ...index.fragments]);

  // Check mapping source/target references with namespace-aware resolution
  for (const [name, mapping] of index.mappings) {
    const currentNs = mapping.namespace ?? null;
    for (const src of mapping.sources) {
      const resolved = resolveEntityRef(src, currentNs, allDefinitions);
      if (!resolved) {
        const hints = suggestAlternatives(src, allDefinitions);
        let msg = `Mapping '${name}' references undefined source '${src}'`;
        if (hints.length > 0) {
          msg += `\n  hint: did you mean ${hints.map((h) => `'${h}'`).join(" or ")}?`;
        }
        diagnostics.push({
          file: mapping.file,
          line: mapping.row + 1,
          column: 1,
          severity: "warning",
          rule: "undefined-ref",
          message: msg,
        });
      }
    }
    for (const tgt of mapping.targets) {
      const resolved = resolveEntityRef(tgt, currentNs, allDefinitions);
      if (!resolved) {
        const hints = suggestAlternatives(tgt, allDefinitions);
        let msg = `Mapping '${name}' references undefined target '${tgt}'`;
        if (hints.length > 0) {
          msg += `\n  hint: did you mean ${hints.map((h) => `'${h}'`).join(" or ")}?`;
        }
        diagnostics.push({
          file: mapping.file,
          line: mapping.row + 1,
          column: 1,
          severity: "warning",
          rule: "undefined-ref",
          message: msg,
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
    (m.sources ?? []).some((s) => {
      const currentNs = m.namespace ?? null;
      return resolveEntityRef(s, currentNs, index.schemas) != null;
    }),
  );
  if (anyMetricSourceResolvable) {
    for (const [name, metric] of index.metrics) {
      const currentNs = metric.namespace ?? null;
      for (const src of (metric.sources ?? [])) {
        if (!resolveEntityRef(src, currentNs, index.schemas)) {
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

  // Check NL backtick references in transform bodies
  if (index.nlRefData) {
    for (const item of index.nlRefData) {
      const refs = extractBacktickRefs(item.text);
      const mappingKey = item.namespace
        ? `${item.namespace}::${item.mapping}`
        : item.mapping;
      const mapping = index.mappings.get(mappingKey);
      const mappingContext = {
        sources: mapping?.sources ?? [],
        targets: mapping?.targets ?? [],
        namespace: item.namespace,
      };

      for (const { ref, offset } of refs) {
        const classification = classifyRef(ref);
        const resolution = resolveRef(ref, mappingContext, index);

        if (!resolution.resolved) {
          diagnostics.push({
            file: item.file,
            line: item.line + 1,
            column: item.column + offset + 1,
            severity: "warning",
            rule: "nl-ref-unresolved",
            message: `NL reference \`${ref}\` in mapping '${mappingKey}' does not resolve to any known identifier`,
          });
        } else if (
          classification === "namespace-qualified-schema" &&
          !isSchemaInMappingSources(ref, mapping)
        ) {
          diagnostics.push({
            file: item.file,
            line: item.line + 1,
            column: item.column + offset + 1,
            severity: "warning",
            rule: "nl-ref-not-in-source",
            message: `NL reference \`${ref}\` in mapping '${mappingKey}' is not declared in its source or target list`,
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
      const currentNs = mapping.namespace ?? null;

      // Resolve source/target names to qualified index keys
      const resolvedSrcKeys = mapping.sources.map((s) =>
        resolveEntityRef(s, currentNs, index.schemas),
      ).filter(Boolean);
      const resolvedTgtKey = mapping.targets[0]
        ? resolveEntityRef(mapping.targets[0], currentNs, index.schemas)
        : null;

      const srcSchema = resolvedSrcKeys[0];

      // Build source field name set: for multi-source mappings, collect fields
      // from all source schemas. Build a nested-path-aware set.
      const srcFieldPaths = new Set();
      for (const s of resolvedSrcKeys) {
        const fields = index.schemas.get(s)?.fields ?? [];
        collectFieldPaths(fields, "", srcFieldPaths);
      }
      // For multi-source, also allow schema-qualified references (schema.field)
      // using the original (unresolved) source names as written in the mapping
      if (resolvedSrcKeys.length > 1) {
        for (let i = 0; i < mapping.sources.length; i++) {
          const resolvedKey = resolveEntityRef(mapping.sources[i], currentNs, index.schemas);
          if (!resolvedKey) continue;
          const fields = index.schemas.get(resolvedKey)?.fields ?? [];
          collectFieldPaths(fields, mapping.sources[i] + ".", srcFieldPaths);
        }
      }

      const tgtFields = resolvedTgtKey ? (index.schemas.get(resolvedTgtKey)?.fields ?? []) : [];
      const tgtFieldPaths = new Set();
      collectFieldPaths(tgtFields, "", tgtFieldPaths);

      // Check if source or target schema has unresolved spreads
      const srcHasSpreads = resolvedSrcKeys.some((s) => index.schemas.get(s)?.hasSpreads);
      const tgtHasSpreads = resolvedTgtKey ? (index.schemas.get(resolvedTgtKey)?.hasSpreads ?? false) : false;

      for (const arrow of uniqueArrows) {
        if (arrow.mapping !== mapping.name || (arrow.namespace ?? null) !== currentNs) continue;

        if (
          arrow.source &&
          srcSchema &&
          index.schemas.has(srcSchema) &&
          !srcHasSpreads &&
          !resolveFieldPath(arrow.source, resolvedSrcKeys, index, srcFieldPaths)
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
          resolvedTgtKey &&
          index.schemas.has(resolvedTgtKey) &&
          !tgtHasSpreads &&
          !resolveFieldPath(arrow.target, [resolvedTgtKey], index, tgtFieldPaths)
        ) {
          diagnostics.push({
            file: arrow.file,
            line: arrow.line + 1,
            column: 1,
            severity: "warning",
            rule: "field-not-in-schema",
            message: `Arrow target '${arrow.target}' not declared in schema '${resolvedTgtKey}'`,
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

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
