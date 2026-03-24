/**
 * lint-engine.ts — Lint rule registry, runner, and fix applier
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
import type { LintDiagnostic, LintFix, LintRule, WorkspaceIndex } from "./types.js";

// ── Rule registry ──────────────────────────────────────────────────────────

export const RULES: LintRule[] = [
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
  {
    id: "duplicate-definition",
    description: "Named definition is declared more than once in a namespace",
    check: checkDuplicateDefinition,
  },
];

// ── Rule implementations ───────────────────────────────────────────────────

function checkHiddenSourceInNl(index: WorkspaceIndex): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
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

      if (!resolution.resolved) continue;

      // Determine the schema name being referenced
      let referencedSchema: string | null = null;
      if (classification === "namespace-qualified-schema" || classification === "bare") {
        // Bare or ns-qualified schema name — check if it resolves to a schema
        if (resolution.resolvedTo?.kind === "schema") {
          referencedSchema = resolution.resolvedTo.name;
        }
      } else if (classification === "dotted-field" || classification === "namespace-qualified-field") {
        // Dotted field ref like `hidden.code` — extract the schema part
        if (resolution.resolvedTo?.kind === "field") {
          const fieldName = resolution.resolvedTo.name;
          const lastDot = fieldName.lastIndexOf(".");
          if (lastDot > 0) {
            referencedSchema = fieldName.slice(0, lastDot);
          }
        }
      }

      if (referencedSchema && !isSchemaInMappingSources(referencedSchema, mapping)) {
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
            description: `Added '${item.namespace && referencedSchema.startsWith(`${item.namespace}::`) ? referencedSchema.slice(item.namespace.length + 2) : referencedSchema}' to source list of mapping '${mappingKey}'`,
            apply: makeAddSourceFix(mappingKey, referencedSchema),
          },
        });
      }
    }
  }

  return diagnostics;
}

function makeAddSourceFix(mappingKey: string, schemaRef: string): (source: string) => string {
  const nsIdx = mappingKey.indexOf("::");
  const displayName = nsIdx !== -1
    ? mappingKey.slice(nsIdx + 2)
    : mappingKey;
  const mappingNs = nsIdx !== -1 ? mappingKey.slice(0, nsIdx) : null;

  // If the schema ref is in the same namespace as the mapping, use the local name
  let insertRef = schemaRef;
  if (mappingNs && schemaRef.startsWith(`${mappingNs}::`)) {
    insertRef = schemaRef.slice(mappingNs.length + 2);
  }

  return (source: string): string => {
    const lines = source.split("\n");
    let inMapping = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i]!.trim();

      if (!inMapping) {
        const mappingRe = /^mapping\s+(?:'([^']+)'|"([^"]+)"|(.+?))\s*(?:\(|$|\{)/;
        const m = trimmed.match(mappingRe);
        if (m) {
          const name = (m[1] ?? m[2] ?? m[3] ?? "").trim();
          if (name === displayName) {
            inMapping = true;
            braceDepth = (trimmed.match(/\{/g) ?? []).length - (trimmed.match(/\}/g) ?? []).length;
          }
        }
        continue;
      }

      for (const ch of trimmed) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
      }
      if (braceDepth <= 0) break;

      const sourceLineRe = /^source\s*\{([^}]*)\}\s*$/;
      const sm = trimmed.match(sourceLineRe);
      if (sm) {
        const existing = sm[1]!.trim();
        // Check both qualified and unqualified forms (with or without backticks)
        const existingRefs = existing.split(/\s*,\s*/).map((r) => r.replace(/^`|`$/g, ""));
        if (existingRefs.includes(schemaRef) || existingRefs.includes(insertRef)) return source;
        // Use backtick wrapping if existing entries use backticks, or always for spec compliance
        const useBackticks = existing.includes("`");
        const wrappedRef = useBackticks ? `\`${insertRef}\`` : insertRef;
        const indent = lines[i]!.match(/^(\s*)/)![1];
        const newRefs = existing ? `${existing}, ${wrappedRef}` : wrappedRef;
        lines[i] = `${indent}source { ${newRefs} }`;
        return lines.join("\n");
      }
    }

    return source;
  };
}

// Known pipeline function names from SATSUMA-V2-SPEC.md section 7.2
const KNOWN_PIPELINE_FUNCTIONS = new Set([
  "trim", "lowercase", "uppercase", "coalesce", "round", "split", "first",
  "last", "to_utc", "to_iso8601", "parse", "null_if_empty", "null_if_invalid",
  "drop_if_invalid", "drop_if_null", "warn_if_invalid", "warn_if_null",
  "error_if_invalid", "error_if_null", "validate_email", "now_utc",
  "title_case", "escape_html", "truncate", "to_number", "prepend", "max_length",
]);

function checkUnresolvedNlRef(index: WorkspaceIndex): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
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

    // For note blocks inside metrics/schemas, enrich mapping context with the
    // block's own fields and source schemas so refs to them resolve correctly.
    let scopeLabel = "mapping";
    const noteMatch = item.mapping.match(/^note:(.+)$/);
    if (noteMatch) {
      const blockName = noteMatch[1]!;
      const nsBlockName = item.namespace ? `${item.namespace}::${blockName}` : blockName;
      const metric = index.metrics?.get(nsBlockName) ?? index.metrics?.get(blockName);
      if (metric) {
        scopeLabel = "metric";
        // Add metric's own fields as virtual source so bare field refs resolve
        mappingContext.sources = [...mappingContext.sources, ...(metric.sources ?? [])];
      }
      const schema = index.schemas.get(nsBlockName) ?? index.schemas.get(blockName);
      if (schema) {
        scopeLabel = "schema";
      }
    } else if (item.mapping.startsWith("transform:")) {
      scopeLabel = "transform";
    }

    for (const { ref, offset } of refs) {
      // Skip known pipeline function names
      if (KNOWN_PIPELINE_FUNCTIONS.has(ref)) continue;

      // For metric notes, check if the ref matches one of the metric's own field names
      if (noteMatch) {
        const blockName = noteMatch[1]!;
        const nsBlockName = item.namespace ? `${item.namespace}::${blockName}` : blockName;
        const metric = index.metrics?.get(nsBlockName) ?? index.metrics?.get(blockName);
        if (metric && metric.fields.some((f) => f.name === ref)) continue;
      }

      const resolution = resolveRef(ref, mappingContext, index);
      if (!resolution.resolved) {
        diagnostics.push({
          file: item.file,
          line: item.line + 1,
          column: item.column + offset + 1,
          severity: "warning",
          rule: "unresolved-nl-ref",
          message: `NL reference \`${ref}\` in ${scopeLabel} '${mappingKey}' does not resolve to any known identifier`,
          fixable: false,
        });
      }
    }
  }

  return diagnostics;
}

function checkDuplicateDefinition(index: WorkspaceIndex): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  if (!index.duplicates) return diagnostics;

  for (const dup of index.duplicates) {
    if (dup.kind === "namespace-metadata") continue;

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
      fixable: false,
    });
  }

  return diagnostics;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Engine ─────────────────────────────────────────────────────────────────

interface LintOptions {
  select?: string[];
  ignore?: string[];
}

/**
 * Run all (or selected) lint rules against a WorkspaceIndex.
 */
export function runLint(index: WorkspaceIndex, opts: LintOptions = {}): LintDiagnostic[] {
  let rules: LintRule[] = RULES;
  if (opts.select?.length) {
    const set = new Set(opts.select);
    rules = rules.filter((r) => set.has(r.id));
  }
  if (opts.ignore?.length) {
    const set = new Set(opts.ignore);
    rules = rules.filter((r) => !set.has(r.id));
  }

  const diagnostics: LintDiagnostic[] = [];
  for (const rule of rules) {
    diagnostics.push(...rule.check(index));
  }

  diagnostics.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column,
  );

  return diagnostics;
}

/**
 * Apply all fixable diagnostics.
 */
export function applyFixes(
  sourceByFile: Map<string, string>,
  diagnostics: LintDiagnostic[],
): { fixedFiles: Map<string, string>; appliedFixes: LintFix[] } {
  const fixable = diagnostics.filter((d) => d.fixable && d.fix);

  const byFile = new Map<string, LintDiagnostic[]>();
  for (const d of fixable) {
    if (!byFile.has(d.fix!.file)) byFile.set(d.fix!.file, []);
    byFile.get(d.fix!.file)!.push(d);
  }

  const fixedFiles = new Map<string, string>();
  const appliedFixes: LintFix[] = [];

  for (const [file, fileDiags] of byFile) {
    const originalSource = sourceByFile.get(file);
    if (originalSource === undefined) continue;
    let source: string = originalSource;

    const sorted = [...fileDiags].sort((a, b) => b.line - a.line || b.column - a.column);
    for (const d of sorted) {
      const before = source;
      source = d.fix!.apply(source);
      if (source !== before) {
        appliedFixes.push(d.fix!);
      }
    }

    if (source !== originalSource) {
      fixedFiles.set(file, source);
    }
  }

  return { fixedFiles, appliedFixes };
}
