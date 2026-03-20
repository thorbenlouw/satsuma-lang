/**
 * arrows.js — `satsuma arrows <schema.field>` command
 *
 * Returns all arrows involving a field (as source or target) with transform
 * classification. The most important structural primitive — agents use it
 * for impact tracing, coverage, and audit.
 *
 * Flags:
 *   --as-source   only arrows where the field is the source
 *   --as-target   only arrows where the field is the target
 *   --json        structured JSON with decomposed pipe steps
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { resolveAllNLRefs } from "../nl-ref-extract.js";
import { expandEntityFields } from "../spread-expand.js";
import type { WorkspaceIndex, ArrowRecord } from "../types.js";

export function register(program: Command): void {
  program
    .command("arrows <schema.field> [path]")
    .description("Show all arrows involving a field with transform classification")
    .option("--as-source", "only arrows where the field is the source")
    .option("--as-target", "only arrows where the field is the target")
    .option("--json", "structured JSON output")
    .action(async (fieldRef: string, pathArg: string | undefined, opts: { asSource?: boolean; asTarget?: boolean; json?: boolean }) => {
      const dot = fieldRef.indexOf(".");
      if (dot === -1) {
        console.error(
          `Invalid field reference '${fieldRef}'. Expected format: schema.field`,
        );
        process.exit(2);
      }

      const schemaName = fieldRef.slice(0, dot);
      const fieldName = fieldRef.slice(dot + 1);

      const root = pathArg ?? ".";
      let files: string[];
      try {
        files = await resolveInput(root);
      } catch (err: unknown) {
        console.error(`Error resolving path: ${(err as Error).message}`);
        process.exit(2);
      }

      const parsedFiles = files.map((f) => parseFile(f));
      const index = buildIndex(parsedFiles);

      // Validate schema exists
      const resolvedSchema = resolveIndexKey(schemaName, index.schemas);
      if (!resolvedSchema) {
        console.error(`Schema '${schemaName}' not found.`);
        const close = [...index.schemas.keys()].find(
          (k) => k.toLowerCase() === schemaName.toLowerCase(),
        );
        if (close) console.error(`Did you mean '${close}'?`);
        process.exit(1);
      }

      // Validate field exists in schema (including fragment spread fields)
      const schema = resolvedSchema.entry;
      const spreadFields = expandEntityFields(schema, schema.namespace ?? null, index);
      const allFields = [...schema.fields, ...spreadFields];
      const fieldExists = allFields.some((f) => f.name === fieldName);
      if (!fieldExists) {
        console.error(
          `Field '${fieldName}' not found in schema '${schemaName}'.`,
        );
        const close = allFields.find(
          (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
        );
        if (close) console.error(`Did you mean '${close.name}'?`);
        process.exit(1);
      }

      // Find matching arrows using schema-qualified key
      const qualifiedField = `${resolvedSchema.key}.${fieldName}`;
      let arrows = findFieldArrows(qualifiedField, index);

      // Add NL-derived arrows for this field
      const nlRefs = resolveAllNLRefs(index);
      for (const nlRef of nlRefs) {
        if (!nlRef.resolved || !nlRef.resolvedTo) continue;
        const resolvedTo = nlRef.resolvedTo.name;
        if (resolvedTo === qualifiedField || resolvedTo === `${resolvedSchema.key}.${fieldName}`) {
          arrows.push({
            mapping: nlRef.namespace && nlRef.mapping?.startsWith(`${nlRef.namespace}::`)
              ? nlRef.mapping.slice(nlRef.namespace.length + 2)
              : nlRef.mapping,
            namespace: nlRef.namespace,
            source: fieldName,
            target: nlRef.targetField,
            transform_raw: `(NL ref)`,
            steps: [],
            classification: "nl-derived" as ArrowRecord["classification"],
            derived: true,
            line: nlRef.line,
            file: nlRef.file,
          });
        }
      }

      // Apply direction filters
      if (opts.asSource) {
        arrows = arrows.filter((a) => a.source === fieldName);
      } else if (opts.asTarget) {
        arrows = arrows.filter((a) => a.target === fieldName);
      }

      if (arrows.length === 0) {
        console.log(`No arrows found for '${fieldRef}'.`);
        process.exit(0);
      }

      if (opts.json) {
        const jsonArrows = arrows.map((a) => {
          const qMapping = a.namespace ? `${a.namespace}::${a.mapping}` : a.mapping;
          return {
            mapping: qMapping,
            source: a.source ? `${resolvedSchema.key}.${a.source}` : null,
            target: a.target
              ? `${resolveTargetSchema(qMapping, index)}.${a.target}`
              : null,
            classification: a.classification,
            transform_raw: a.transform_raw,
            steps: a.steps,
            derived: a.derived,
            file: a.file,
            line: a.line + 1,
          };
        });
        console.log(JSON.stringify(jsonArrows, null, 2));
        return;
      }

      printDefault(fieldRef, arrows, index);
    });
}

/**
 * Find all unique arrow records involving a given field (as source or target).
 * Accepts either a schema-qualified key ("schema.field") or bare field name.
 * Deduplicates since an arrow with source === target gets indexed under both.
 */
function findFieldArrows(fieldKey: string, index: WorkspaceIndex): ArrowRecord[] {
  if (!index.fieldArrows.has(fieldKey)) return [];
  const seen = new Set<string>();
  const results: ArrowRecord[] = [];
  for (const arrow of index.fieldArrows.get(fieldKey)!) {
    const key = `${arrow.mapping}:${arrow.namespace}:${arrow.source}:${arrow.target}:${arrow.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(arrow);
    }
  }
  return results;
}

/**
 * Resolve the target schema name for a mapping by looking at its target list.
 */
function resolveTargetSchema(mappingName: string | null, index: WorkspaceIndex): string {
  const mapping = index.mappings.get(mappingName ?? "");
  return mapping?.targets[0] ?? "?";
}

function printDefault(fieldRef: string, arrows: ArrowRecord[], _index: WorkspaceIndex): void {
  const fieldName = fieldRef.split(".").pop();
  const asSource = arrows.filter((a) => a.source === fieldName);
  const asTarget = arrows.filter((a) => a.target === fieldName);

  const parts: string[] = [];
  if (asSource.length > 0) parts.push(`${asSource.length} as source`);
  if (asTarget.length > 0) parts.push(`${asTarget.length} as target`);
  // arrows that are both (field used on both sides) — avoid double-count
  const total = new Set([...asSource, ...asTarget]).size;

  console.log(
    `${fieldRef} — ${total} arrow${total !== 1 ? "s" : ""} (${parts.join(", ")})`,
  );
  console.log();

  // Group by qualified mapping name
  const byMapping = new Map<string, ArrowRecord[]>();
  for (const a of arrows) {
    const qMapping = a.namespace ? `${a.namespace}::${a.mapping}` : (a.mapping ?? "");
    if (!byMapping.has(qMapping)) byMapping.set(qMapping, []);
    byMapping.get(qMapping)!.push(a);
  }

  for (const [mappingName, mappingArrows] of byMapping) {
    console.log(`  mapping '${mappingName}':`);
    for (const a of mappingArrows) {
      const src = a.source ?? "(computed)";
      const tgt = a.target ?? "?";
      let line = `    ${src} -> ${tgt}`;
      if (a.transform_raw) {
        line += ` { ${a.transform_raw} }`;
      }
      line += `  [${a.classification}]`;
      console.log(line);
    }
    console.log();
  }
}
