/**
 * lint-engine.js — Lint rule registry, runner, and fix applier
 *
 * Provides a policy-oriented linting layer on top of the shared
 * parser/index pipeline.  Rules receive a WorkspaceIndex and return
 * LintDiagnostic objects.  Fixable rules additionally supply a LintFix
 * whose `apply` function rewrites source text deterministically.
 */

import {
  extractBacktickRefs,
  classifyRef,
  resolveRef,
  isSchemaInMappingSources,
} from "./nl-ref-extract.js";

// ── Diagnostic / fix types (documented via JSDoc) ──────────────────────────

/**
 * @typedef {Object} LintDiagnostic
 * @property {string}  file
 * @property {number}  line     1-based
 * @property {number}  column   1-based
 * @property {'error'|'warning'} severity
 * @property {string}  rule     kebab-case rule id
 * @property {string}  message
 * @property {boolean} fixable
 * @property {LintFix} [fix]    present when fixable === true
 */

/**
 * @typedef {Object} LintFix
 * @property {string} file
 * @property {string} rule
 * @property {string} description   human-readable summary of the change
 * @property {(source: string) => string} apply   pure source→source rewrite
 */

// ── Rule registry ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} LintRule
 * @property {string} id
 * @property {string} description
 * @property {(index: object) => LintDiagnostic[]} check
 */

/** @type {LintRule[]} */
export const RULES = [
  {
    id: "hidden-source-in-nl",
    description: "NL references schema not in source/target list",
    check: checkHiddenSourceInNl,
  },
  {
    id: "unresolved-nl-ref",
    description: "NL backtick reference does not resolve",
    check: checkUnresolvedNlRef,
  },
];

// ── Rule implementations ───────────────────────────────────────────────────

/**
 * hidden-source-in-nl — NL references a schema that resolves in the
 * workspace but is not declared in the mapping's source/target list.
 *
 * Fixable when the reference is namespace-qualified (unambiguous).
 */
function checkHiddenSourceInNl(index) {
  const diagnostics = [];
  if (!index.nlRefData) return diagnostics;

  for (const item of index.nlRefData) {
    const refs = extractBacktickRefs(item.text);
    const mappingKey = item.namespace
      ? `${item.namespace}::${item.mapping}`
      : item.mapping;
    const mapping = index.mappings.get(mappingKey);
    if (!mapping) continue;

    const mappingContext = {
      sources: mapping.sources ?? [],
      targets: mapping.targets ?? [],
      namespace: item.namespace,
    };

    for (const { ref, offset } of refs) {
      const classification = classifyRef(ref);
      const resolution = resolveRef(ref, mappingContext, index);

      if (
        resolution.resolved &&
        classification === "namespace-qualified-schema" &&
        !isSchemaInMappingSources(ref, mapping)
      ) {
        diagnostics.push({
          file: item.file,
          line: item.line + 1,
          column: item.column + offset + 1,
          severity: "warning",
          rule: "hidden-source-in-nl",
          message: `NL reference \`${ref}\` in mapping '${mappingKey}' is not declared in its source or target list`,
          fixable: true,
          fix: {
            file: item.file,
            rule: "hidden-source-in-nl",
            description: `Added '${ref}' to source list of mapping '${mappingKey}'`,
            apply: makeAddSourceFix(mappingKey, ref),
          },
        });
      }
    }
  }

  return diagnostics;
}

/**
 * Build a pure source→source rewrite that adds a schema ref to a
 * mapping's source block.
 */
function makeAddSourceFix(mappingKey, schemaRef) {
  // The mapping name is the part after the namespace (or the full key for
  // global mappings).  We need the display name as it appears in the STM file.
  const displayName = mappingKey.includes("::")
    ? mappingKey.split("::")[1]
    : mappingKey;

  return (source) => {
    const lines = source.split("\n");
    // Find the mapping block, then find `source {` inside it.
    let inMapping = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Detect start of the target mapping block
      if (!inMapping) {
        // Match: mapping 'name' {  or  mapping "name" {  or  mapping name {
        const mappingRe = /^mapping\s+(?:'([^']+)'|"([^"]+)"|(\S+))\s*\{/;
        const m = trimmed.match(mappingRe);
        if (m) {
          const name = m[1] ?? m[2] ?? m[3];
          if (name === displayName) {
            inMapping = true;
            braceDepth = 1;
          }
        }
        continue;
      }

      // Track brace depth to know when the mapping block ends
      for (const ch of trimmed) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
      }
      if (braceDepth <= 0) break;

      // Look for `source { ... }` line inside the mapping
      const sourceLineRe = /^source\s*\{([^}]*)\}\s*$/;
      const sm = trimmed.match(sourceLineRe);
      if (sm) {
        const existing = sm[1].trim();
        // Avoid duplicate
        if (existing.split(/\s*,\s*/).includes(schemaRef)) return source;
        const indent = lines[i].match(/^(\s*)/)[1];
        const newRefs = existing ? `${existing}, ${schemaRef}` : schemaRef;
        lines[i] = `${indent}source { ${newRefs} }`;
        return lines.join("\n");
      }
    }

    // Could not locate source block — return unchanged
    return source;
  };
}

/**
 * unresolved-nl-ref — NL backtick reference does not resolve to any
 * known schema, field, fragment, or transform.
 */
function checkUnresolvedNlRef(index) {
  const diagnostics = [];
  if (!index.nlRefData) return diagnostics;

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
      const resolution = resolveRef(ref, mappingContext, index);
      if (!resolution.resolved) {
        diagnostics.push({
          file: item.file,
          line: item.line + 1,
          column: item.column + offset + 1,
          severity: "warning",
          rule: "unresolved-nl-ref",
          message: `NL reference \`${ref}\` in mapping '${mappingKey}' does not resolve to any known identifier`,
          fixable: false,
        });
      }
    }
  }

  return diagnostics;
}

// ── Engine ─────────────────────────────────────────────────────────────────

/**
 * Run all (or selected) lint rules against a WorkspaceIndex.
 *
 * @param {object} index  WorkspaceIndex
 * @param {object} [opts]
 * @param {string[]} [opts.select]  run only these rules
 * @param {string[]} [opts.ignore]  skip these rules
 * @returns {LintDiagnostic[]}
 */
export function runLint(index, opts = {}) {
  let rules = RULES;
  if (opts.select?.length) {
    const set = new Set(opts.select);
    rules = rules.filter((r) => set.has(r.id));
  }
  if (opts.ignore?.length) {
    const set = new Set(opts.ignore);
    rules = rules.filter((r) => !set.has(r.id));
  }

  const diagnostics = [];
  for (const rule of rules) {
    diagnostics.push(...rule.check(index));
  }

  // Sort by file, line, column
  diagnostics.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column,
  );

  return diagnostics;
}

/**
 * Apply all fixable diagnostics.
 *
 * @param {Map<string, string>} sourceByFile  file path → source text
 * @param {LintDiagnostic[]} diagnostics
 * @returns {{ fixedFiles: Map<string, string>, appliedFixes: LintFix[] }}
 */
export function applyFixes(sourceByFile, diagnostics) {
  const fixable = diagnostics.filter((d) => d.fixable && d.fix);

  // Group by file
  const byFile = new Map();
  for (const d of fixable) {
    if (!byFile.has(d.fix.file)) byFile.set(d.fix.file, []);
    byFile.get(d.fix.file).push(d);
  }

  const fixedFiles = new Map();
  const appliedFixes = [];

  for (const [file, fileDiags] of byFile) {
    let source = sourceByFile.get(file);
    if (source === undefined) continue;

    // Apply fixes from bottom to top to preserve line positions
    const sorted = [...fileDiags].sort((a, b) => b.line - a.line || b.column - a.column);
    for (const d of sorted) {
      const before = source;
      source = d.fix.apply(source);
      if (source !== before) {
        appliedFixes.push(d.fix);
      }
    }

    if (source !== sourceByFile.get(file)) {
      fixedFiles.set(file, source);
    }
  }

  return { fixedFiles, appliedFixes };
}
