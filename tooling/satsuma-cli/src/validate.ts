/**
 * validate.ts — Structural and semantic validation for Satsuma workspaces
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
import { expandSpreads, collectFieldPaths } from "./spread-expand.js";
import type { ArrowRecord, LintDiagnostic, SyntaxNode, WorkspaceIndex } from "./types.js";

/**
 * Collect all ERROR and MISSING nodes from a CST.
 */
export function collectParseErrors(node: SyntaxNode, file: string): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  walkErrors(node, file, diagnostics);
  return diagnostics;
}

function walkErrors(node: SyntaxNode, file: string, diagnostics: LintDiagnostic[]): void {
  if (node.type === "ERROR") {
    diagnostics.push({
      file,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      severity: "error",
      rule: "parse-error",
      message: `Syntax error: unexpected '${node.text.slice(0, 40).replace(/\n/g, "\\n")}'`,
      fixable: false,
    });
  } else if (node.isMissing) {
    diagnostics.push({
      file,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      severity: "error",
      rule: "missing-node",
      message: `Missing expected '${node.type}'`,
      fixable: false,
    });
  }
  for (const c of node.namedChildren) {
    walkErrors(c, file, diagnostics);
  }
}

function resolveEntityRef(ref: string, currentNs: string | null, entityMap: Map<string, unknown>): string | null {
  return resolveScopedEntityRef(ref, currentNs, entityMap);
}

function suggestAlternatives(ref: string, entityMap: Map<string, unknown>): string[] {
  if (ref.includes("::")) return [];
  const hints: string[] = [];
  for (const key of entityMap.keys()) {
    if (key.endsWith(`::${ref}`)) hints.push(key);
  }
  return hints;
}

/**
 * Run semantic checks against a WorkspaceIndex.
 */
export function collectSemanticWarnings(index: WorkspaceIndex): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];

  // Check for duplicate named definitions
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
          fixable: false,
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
        fixable: false,
      });
    }
  }

  const allDefinitions = new Map([...index.schemas, ...index.fragments]);

  // Check fragment spread references
  for (const [name, schema] of index.schemas) {
    const currentNs = schema.namespace ?? null;
    for (const spread of (schema.spreads ?? [])) {
      if (!resolveEntityRef(spread, currentNs, index.fragments)) {
        diagnostics.push({
          file: schema.file,
          line: schema.row + 1,
          column: 1,
          severity: "warning",
          rule: "undefined-ref",
          message: `Schema '${name}' spreads undefined fragment '${spread}'`,
          fixable: false,
        });
      }
    }
  }

  // Check mapping source/target references
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
          fixable: false,
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
          fixable: false,
        });
      }
    }
  }

  // Check metric source references
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
          fixable: false,
        });
      }
    }
  }

  // Check NL backtick references
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
            fixable: false,
          });
        } else {
          // Determine the schema name being referenced
          let referencedSchema: string | null = null;
          if (classification === "namespace-qualified-schema" || classification === "bare") {
            if (resolution.resolvedTo?.kind === "schema") {
              referencedSchema = resolution.resolvedTo.name;
            }
          } else if (classification === "dotted-field" || classification === "namespace-qualified-field") {
            if (resolution.resolvedTo?.kind === "field") {
              const fieldPath = resolution.resolvedTo.name;
              const lastDot = fieldPath.lastIndexOf(".");
              if (lastDot > 0) referencedSchema = fieldPath.slice(0, lastDot);
            }
          }
          if (referencedSchema && !isSchemaInMappingSources(referencedSchema, mapping)) {
            diagnostics.push({
              file: item.file,
              line: item.line + 1,
              column: item.column + offset + 1,
              severity: "warning",
              rule: "nl-ref-not-in-source",
              message: `NL reference \`${ref}\` in mapping '${mappingKey}' is not declared in its source or target list`,
              fixable: false,
            });
          }
        }
      }
    }
  }

  // Check arrow field references against declared schemas
  if (index.fieldArrows) {
    const seenArrows = new Set<ArrowRecord>();
    const uniqueArrows: ArrowRecord[] = [];
    for (const [, arrows] of index.fieldArrows) {
      for (const arrow of arrows) {
        if (seenArrows.has(arrow)) continue;
        seenArrows.add(arrow);
        uniqueArrows.push(arrow);
      }
    }

    for (const [, mapping] of index.mappings) {
      const currentNs = mapping.namespace ?? null;

      const resolvedSrcKeys = mapping.sources.map((s) =>
        resolveEntityRef(s, currentNs, index.schemas),
      ).filter((k): k is string => k != null);
      const resolvedTgtKey = mapping.targets[0]
        ? resolveEntityRef(mapping.targets[0], currentNs, index.schemas)
        : null;

      const srcSchema = resolvedSrcKeys[0];

      const srcFieldPaths = new Set<string>();
      for (const s of resolvedSrcKeys) {
        const fields = index.schemas.get(s)?.fields ?? [];
        collectFieldPaths(fields, "", srcFieldPaths);
      }
      if (resolvedSrcKeys.length > 1) {
        for (let i = 0; i < mapping.sources.length; i++) {
          const resolvedKey = resolveEntityRef(mapping.sources[i]!, currentNs, index.schemas);
          if (!resolvedKey) continue;
          const fields = index.schemas.get(resolvedKey)?.fields ?? [];
          collectFieldPaths(fields, mapping.sources[i]! + ".", srcFieldPaths);
        }
      }

      const tgtFields = resolvedTgtKey ? (index.schemas.get(resolvedTgtKey)?.fields ?? []) : [];
      const tgtFieldPaths = new Set<string>();
      collectFieldPaths(tgtFields, "", tgtFieldPaths);

      const srcHasUnresolved = expandSpreads(resolvedSrcKeys, currentNs, index, srcFieldPaths, diagnostics as never[]);
      const tgtHasUnresolved = resolvedTgtKey
        ? expandSpreads([resolvedTgtKey], currentNs, index, tgtFieldPaths, diagnostics as never[])
        : false;

      for (const arrow of uniqueArrows) {
        if (arrow.mapping !== mapping.name || (arrow.namespace ?? null) !== currentNs) continue;
        // For anonymous mappings (name is null), also check file to avoid cross-file false positives
        if (mapping.name === null && arrow.file !== mapping.file) continue;

        if (
          arrow.source &&
          srcSchema &&
          index.schemas.has(srcSchema) &&
          !srcHasUnresolved &&
          !resolveFieldPath(arrow.source, resolvedSrcKeys, index, srcFieldPaths)
        ) {
          diagnostics.push({
            file: arrow.file,
            line: arrow.line + 1,
            column: 1,
            severity: "warning",
            rule: "field-not-in-schema",
            message: `Arrow source '${arrow.source}' not declared in schema '${srcSchema}'`,
            fixable: false,
          });
        }
        if (
          arrow.target &&
          resolvedTgtKey &&
          index.schemas.has(resolvedTgtKey) &&
          !tgtHasUnresolved &&
          !resolveFieldPath(arrow.target, [resolvedTgtKey], index, tgtFieldPaths)
        ) {
          diagnostics.push({
            file: arrow.file,
            line: arrow.line + 1,
            column: 1,
            severity: "warning",
            rule: "field-not-in-schema",
            message: `Arrow target '${arrow.target}' not declared in schema '${resolvedTgtKey}'`,
            fixable: false,
          });
        }
      }
    }
  }

  // Check transform spread references in arrows
  if (index.fieldArrows) {
    const seenForSpreads = new Set<ArrowRecord>();
    for (const [, arrows] of index.fieldArrows) {
      for (const arrow of arrows) {
        if (seenForSpreads.has(arrow)) continue;
        seenForSpreads.add(arrow);
        for (const step of arrow.steps ?? []) {
          if (step.type === "fragment_spread") {
            const spreadName = step.text.replace(/^\.\.\./, "");
            const currentNs = arrow.namespace ?? null;
            if (!resolveEntityRef(spreadName, currentNs, index.transforms)) {
              diagnostics.push({
                file: arrow.file,
                line: arrow.line + 1,
                column: 1,
                severity: "warning",
                rule: "undefined-ref",
                message: `Arrow in mapping '${arrow.mapping}' spreads undefined transform '${spreadName}'`,
                fixable: false,
              });
            }
          }
        }
      }
    }
  }

  // Check ref metadata targets exist
  for (const [schemaName, schema] of index.schemas) {
    checkFieldRefMetadata(schema.fields, schemaName, schema.file, schema.row, schema.namespace ?? null, index, diagnostics);
  }
  for (const [fragName, frag] of index.fragments) {
    checkFieldRefMetadata(frag.fields, fragName, frag.file, frag.row, frag.namespace ?? null, index, diagnostics);
  }

  return diagnostics;
}

function checkFieldRefMetadata(
  fields: import("./types.js").FieldDecl[],
  entityName: string,
  file: string,
  row: number,
  currentNs: string | null,
  index: WorkspaceIndex,
  diagnostics: LintDiagnostic[],
): void {
  for (const field of fields) {
    if (field.metadata) {
      for (const m of field.metadata) {
        if (m.kind === "kv" && m.key === "ref") {
          const refTarget = m.value.split(".")[0]!;
          if (!resolveEntityRef(refTarget, currentNs, index.schemas)) {
            diagnostics.push({
              file,
              line: row + 1,
              column: 1,
              severity: "warning",
              rule: "undefined-ref",
              message: `Field '${field.name}' in '${entityName}' references undefined schema '${refTarget}' via (ref ${m.value})`,
              fixable: false,
            });
          }
        }
      }
    }
    if (field.children) {
      checkFieldRefMetadata(field.children, entityName, file, row, currentNs, index, diagnostics);
    }
  }
}

function resolveFieldPath(path: string, schemaNames: string[], index: WorkspaceIndex, fieldPaths: Set<string>): boolean {
  if (path.startsWith(".")) return true;
  if (fieldPaths.has(path)) return true;

  if (schemaNames.length > 1) {
    const dotIdx = path.indexOf(".");
    if (dotIdx > 0) {
      const qualifier = path.slice(0, dotIdx);
      if (schemaNames.includes(qualifier)) {
        const rest = path.slice(dotIdx + 1);
        const schemaFields = index.schemas.get(qualifier)?.fields ?? [];
        const qualPaths = new Set<string>();
        collectFieldPaths(schemaFields, "", qualPaths);
        if (qualPaths.has(rest)) return true;
      }
    }
  }

  return false;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
