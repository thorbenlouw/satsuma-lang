/**
 * validate.ts — Structural and semantic validation for Satsuma workspaces
 *
 * Structural checks: CST ERROR/MISSING nodes from tree-sitter.
 * Semantic checks: undefined references, duplicates, field mismatches,
 * NL @ref validation.
 */

import { capitalize } from "@satsuma/core";
import {
  extractAtRefs,
  classifyRef,
  resolveRef,
  isSchemaInMappingSources,
} from "./nl-ref-extract.js";
import { resolveScopedEntityRef } from "./index-builder.js";
import { expandSpreads, collectFieldPaths } from "./spread-expand.js";
import type { ArrowRecord, LintDiagnostic, SchemaRecord, WorkspaceIndex } from "./types.js";
import type { MetaEntry } from "@satsuma/core";

/**
 * Compute convention-inferred field names for a schema based on its metadata tokens.
 * Data Vault: hub → {name}_hk, load_date, record_source
 *             link → {name}_hk, load_date, record_source, {parent}_hk
 *             satellite → {parent}_hk, load_date, load_end_date, hash_diff, record_source
 * Kimball:    dimension+scd2 → surrogate_key, valid_from, valid_to, is_current, row_hash
 *             fact → etl_batch_id, loaded_at
 */
function getConventionFields(schema: SchemaRecord): Set<string> {
  const fields = new Set<string>();
  const meta = schema.blockMetadata ?? [];
  const tags = new Set(meta.filter((m): m is MetaEntry & { kind: "tag" } => m.kind === "tag").map((m) => m.tag));
  const kvs = meta.filter((m): m is MetaEntry & { kind: "kv" } => m.kind === "kv");

  if (tags.has("hub")) {
    fields.add(`${schema.name}_hk`);
    fields.add("load_date");
    fields.add("record_source");
  }
  if (tags.has("link")) {
    fields.add(`${schema.name}_hk`);
    fields.add("load_date");
    fields.add("record_source");
    // Add hash keys for linked hubs
    for (const kv of kvs) {
      if (kv.key === "link_hubs") {
        for (const hub of kv.value.split(",").map((h: string) => h.trim())) {
          fields.add(`${hub}_hk`);
        }
      }
    }
  }
  if (tags.has("satellite")) {
    fields.add("load_date");
    fields.add("load_end_date");
    fields.add("hash_diff");
    fields.add("record_source");
    // Add parent hub/link hash key
    for (const kv of kvs) {
      if (kv.key === "parent") {
        fields.add(`${kv.value}_hk`);
      }
    }
  }
  if (tags.has("dimension")) {
    const hasScd2 = kvs.some((kv) => kv.key === "scd" && (kv.value === "2" || kv.value === "6"));
    if (hasScd2) {
      fields.add("surrogate_key");
      fields.add("valid_from");
      fields.add("valid_to");
      fields.add("is_current");
      fields.add("row_hash");
    }
    const hasScd6 = kvs.some((kv) => kv.key === "scd" && kv.value === "6");
    if (hasScd6) {
      // current_{field} overlays — can't enumerate without knowing tracked fields
    }
  }
  if (tags.has("fact")) {
    fields.add("etl_batch_id");
    fields.add("loaded_at");
  }

  return fields;
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

  // Check NL @refs
  if (index.nlRefData) {
    for (const item of index.nlRefData) {
      const refs = extractAtRefs(item.text);
      const mappingKey = item.namespace
        ? `${item.namespace}::${item.mapping}`
        : item.mapping;
      const mapping = index.mappings.get(mappingKey);
      const mappingContext = {
        sources: mapping?.sources ?? [],
        targets: mapping?.targets ?? [],
        namespace: item.namespace,
      };

      // Standalone notes (mapping key starts with "note:") have no mapping
      // context, so skip both unresolved and not-in-source checks — they are
      // free-form documentation that may reference external concepts.
      const isNoteContext = mappingKey.startsWith("note:");

      for (const { ref, offset } of refs) {
        const classification = classifyRef(ref);
        const resolution = resolveRef(ref, mappingContext, index);

        if (!resolution.resolved) {
          if (!isNoteContext) {
            diagnostics.push({
              file: item.file,
              line: item.line + 1,
              column: item.column + offset + 1,
              severity: "warning",
              rule: "nl-ref-unresolved",
              message: `NL reference \`${ref}\` in mapping '${mappingKey}' does not resolve to any known identifier`,
              fixable: false,
            });
          }
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
              // Extract the schema key from the resolved path. The schema key
              // is the prefix that matches an entry in index.schemas.
              let foundSchema = false;
              const parts = fieldPath.split(".");
              for (let i = parts.length - 1; i > 0; i--) {
                const candidate = parts.slice(0, i).join(".");
                if (index.schemas.has(candidate)) {
                  referencedSchema = candidate;
                  foundSchema = true;
                  break;
                }
              }
              // For namespace-qualified fields (ns::schema.field), try ns::schema
              if (!foundSchema && fieldPath.includes("::")) {
                const dotIdx = fieldPath.indexOf(".", fieldPath.indexOf("::") + 2);
                if (dotIdx > 0) referencedSchema = fieldPath.slice(0, dotIdx);
              }
            }
          }
          if (referencedSchema && !isNoteContext && !isSchemaInMappingSources(referencedSchema, mapping)) {
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

      // Add convention-inferred fields (Data Vault / Kimball) so they don't trigger false positives
      for (const k of resolvedSrcKeys) {
        const sch = index.schemas.get(k);
        if (sch) {
          for (const f of getConventionFields(sch)) {
            srcFieldPaths.add(f);
          }
        }
      }
      // Also add convention fields with schema-name prefix for multi-source cross-schema references
      for (let i = 0; i < mapping.sources.length; i++) {
        const resolvedKey = resolveEntityRef(mapping.sources[i]!, currentNs, index.schemas);
        if (!resolvedKey) continue;
        const sch = index.schemas.get(resolvedKey);
        if (sch) {
          for (const f of getConventionFields(sch)) {
            srcFieldPaths.add(`${mapping.sources[i]}.${f}`);
          }
        }
      }
      if (resolvedTgtKey) {
        const sch = index.schemas.get(resolvedTgtKey);
        if (sch) {
          for (const f of getConventionFields(sch)) {
            tgtFieldPaths.add(f);
          }
        }
      }

      for (const arrow of uniqueArrows) {
        if (arrow.mapping !== mapping.name || (arrow.namespace ?? null) !== currentNs) continue;
        // Check file to avoid cross-file false positives when duplicate mapping names exist
        if (arrow.file !== mapping.file) continue;

        for (const source of arrow.sources) {
          if (
            srcSchema &&
            index.schemas.has(srcSchema) &&
            !srcHasUnresolved &&
            !resolveFieldPath(source, resolvedSrcKeys, index, srcFieldPaths)
          ) {
            diagnostics.push({
              file: arrow.file,
              line: arrow.line + 1,
              column: 1,
              severity: "warning",
              rule: "field-not-in-schema",
              message: `Arrow source '${source}' not declared in schema '${srcSchema}'`,
              fixable: false,
            });
          }
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
          const refTarget = m.value.replace(/^@/, "").split(".")[0]!;
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
  // Container arrow targets (flatten/each) may equal the schema name itself
  if (schemaNames.includes(path)) return true;

  const dotIdx = path.indexOf(".");
  if (dotIdx > 0) {
    const qualifier = path.slice(0, dotIdx);
    // Match qualifier against both fully qualified names (ns::schema) and bare names
    const matchedSchema = schemaNames.find((s) => {
      if (s === qualifier) return true;
      const nsIdx = s.indexOf("::");
      return nsIdx !== -1 && s.slice(nsIdx + 2) === qualifier;
    });
    if (matchedSchema) {
      const rest = path.slice(dotIdx + 1);
      const schemaFields = index.schemas.get(matchedSchema)?.fields ?? [];
      const qualPaths = new Set<string>();
      collectFieldPaths(schemaFields, "", qualPaths);
      if (qualPaths.has(rest)) return true;
    }
  }

  return false;
}

