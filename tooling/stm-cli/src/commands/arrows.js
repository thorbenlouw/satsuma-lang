/**
 * arrows.js — `stm arrows <schema.field>` command
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

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("arrows <schema.field> [path]")
    .description("Show all arrows involving a field with transform classification")
    .option("--as-source", "only arrows where the field is the source")
    .option("--as-target", "only arrows where the field is the target")
    .option("--json", "structured JSON output")
    .action(async (fieldRef, pathArg, opts) => {
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
      let files;
      try {
        files = await resolveInput(root);
      } catch (err) {
        console.error(`Error resolving path: ${err.message}`);
        process.exit(1);
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

      // Validate field exists in schema
      const schema = resolvedSchema.entry;
      const fieldExists = schema.fields.some((f) => f.name === fieldName);
      if (!fieldExists) {
        console.error(
          `Field '${fieldName}' not found in schema '${schemaName}'.`,
        );
        const close = schema.fields.find(
          (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
        );
        if (close) console.error(`Did you mean '${close.name}'?`);
        process.exit(1);
      }

      // Find matching arrows
      let arrows = findFieldArrows(fieldName, index);

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
        const jsonArrows = arrows.map((a) => ({
          mapping: a.mapping,
          source: a.source ? `${schemaName}.${a.source}` : null,
          target: a.target
            ? `${resolveTargetSchema(a.mapping, index)}.${a.target}`
            : null,
          classification: a.classification,
          transform_raw: a.transform_raw,
          steps: a.steps,
          derived: a.derived,
          file: a.file,
          line: a.line + 1,
        }));
        console.log(JSON.stringify(jsonArrows, null, 2));
        return;
      }

      printDefault(fieldRef, arrows, index);
    });
}

/**
 * Find all unique arrow records involving a given field name (as source or target).
 * Deduplicates since an arrow with source === target gets indexed under both.
 */
function findFieldArrows(fieldName, index) {
  if (!index.fieldArrows.has(fieldName)) return [];
  const seen = new Set();
  const results = [];
  for (const arrow of index.fieldArrows.get(fieldName)) {
    const key = `${arrow.mapping}:${arrow.source}:${arrow.target}:${arrow.line}`;
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
function resolveTargetSchema(mappingName, index) {
  const mapping = index.mappings.get(mappingName);
  return mapping?.targets[0] ?? "?";
}

function printDefault(fieldRef, arrows, _index) {
  const asSource = arrows.filter((a) => a.source && fieldRef.endsWith(a.source));
  const asTarget = arrows.filter((a) => a.target && fieldRef.endsWith(a.target));

  const parts = [];
  if (asSource.length > 0) parts.push(`${asSource.length} as source`);
  if (asTarget.length > 0) parts.push(`${asTarget.length} as target`);
  // arrows that are both (field used on both sides) — avoid double-count
  const total = new Set([...asSource, ...asTarget]).size;

  console.log(
    `${fieldRef} — ${total} arrow${total !== 1 ? "s" : ""} (${parts.join(", ")})`,
  );
  console.log();

  // Group by mapping
  const byMapping = new Map();
  for (const a of arrows) {
    if (!byMapping.has(a.mapping)) byMapping.set(a.mapping, []);
    byMapping.get(a.mapping).push(a);
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
