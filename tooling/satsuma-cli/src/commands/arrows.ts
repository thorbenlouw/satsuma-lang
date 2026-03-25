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
import { buildIndex, resolveIndexKey, canonicalKey } from "../index-builder.js";
import { resolveAllNLRefs } from "../nl-ref-extract.js";
import { expandEntityFields } from "../spread-expand.js";
import type { WorkspaceIndex, ArrowRecord, FieldDecl } from "../types.js";

export function register(program: Command): void {
  program
    .command("arrows <schema.field> [path]")
    .description("Show all arrows involving a field with transform classification")
    .option("--as-source", "only arrows where the field is the source")
    .option("--as-target", "only arrows where the field is the target")
    .option("--json", "structured JSON output")
    .addHelpText("after", `
The field reference is <schema>.<field> — the schema name followed by a
dot and the field name. Namespace-qualified names work (e.g. pos::stores.STORE_ID).

Each arrow is classified: [structural], [nl], [mixed], [none], or [nl-derived].

Examples:
  satsuma arrows hub_customer.email                  # all arrows for this field
  satsuma arrows hub_customer.email --as-source      # only outbound arrows
  satsuma arrows pos::stores.STORE_ID --json         # namespace-qualified`)
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

      // Validate field exists in schema (including fragment spread fields and nested children)
      const schema = resolvedSchema.entry;
      const spreadFields = expandEntityFields(schema, schema.namespace ?? null, index);
      const allFields = [...schema.fields, ...spreadFields];
      const fieldExists = findFieldByPath(allFields, fieldName) ||
        collectAllFieldNames(allFields).includes(fieldName);
      if (!fieldExists) {
        console.error(
          `Field '${fieldName}' not found in schema '${schemaName}'.`,
        );
        // Suggest close matches from top-level and nested fields
        const allNames = collectAllFieldNames(allFields);
        const close = allNames.find(
          (n) => n.toLowerCase() === fieldName.toLowerCase(),
        );
        if (close) console.error(`Did you mean '${close}'?`);
        process.exit(1);
      }

      // Find matching arrows using schema-qualified key
      // Try full dotted path, bare field name, and leaf name for nested fields
      const qualifiedField = `${resolvedSchema.key}.${fieldName}`;
      let arrows = findFieldArrows(qualifiedField, index);

      // Also search by bare field name (handles nested child fields indexed by leaf name)
      // Only include arrows from mappings involving the resolved schema
      const leafName = fieldName.includes(".") ? fieldName.split(".").pop()! : fieldName;
      const seen = new Set(arrows.map((a) => `${a.mapping}:${a.namespace}:${a.sources.join(",")}:${a.target}:${a.line}`));
      for (const altKey of [fieldName, leafName]) {
        for (const a of findFieldArrows(altKey, index)) {
          const dedupKey = `${a.mapping}:${a.namespace}:${a.sources.join(",")}:${a.target}:${a.line}`;
          if (seen.has(dedupKey)) continue;
          // Verify this arrow's mapping involves the queried schema
          const qMapping = a.namespace ? `${a.namespace}::${a.mapping}` : (a.mapping ?? "");
          const mapping = index.mappings.get(qMapping);
          if (mapping && (mapping.sources.includes(resolvedSchema.key) || mapping.targets.includes(resolvedSchema.key))) {
            seen.add(dedupKey);
            arrows.push(a);
          }
        }
      }

      // When the user specifies a deeply nested path (e.g. CdtTrfTxInf.DbtrAgt.BIC),
      // filter out arrows whose source/target path doesn't match the requested path.
      // This allows disambiguating fields that share a leaf name at different nesting levels.
      if (fieldName.includes(".")) {
        arrows = arrows.filter((a) => {
          return a.sources.some((s) => arrowPathMatches(s, fieldName)) || arrowPathMatches(a.target, fieldName);
        });
      }

      // Add NL-derived arrows for this field
      const nlRefs = resolveAllNLRefs(index);
      for (const nlRef of nlRefs) {
        if (!nlRef.resolved || !nlRef.resolvedTo) continue;
        const resolvedTo = nlRef.resolvedTo.name;
        if (resolvedTo === qualifiedField || resolvedTo === `${resolvedSchema.key}.${fieldName}`) {
          // Use the fully resolved path as the source so cross-schema refs
          // are correctly attributed (sl-uk9q)
          arrows.push({
            mapping: nlRef.namespace && nlRef.mapping?.startsWith(`${nlRef.namespace}::`)
              ? nlRef.mapping.slice(nlRef.namespace.length + 2)
              : nlRef.mapping,
            namespace: nlRef.namespace,
            sources: [resolvedTo],
            target: nlRef.targetField,
            transform_raw: `(NL ref)`,
            steps: [],
            classification: "nl-derived",
            derived: true,
            line: nlRef.line,
            file: nlRef.file,
          });
        }
      }

      // Apply direction filters — verify the queried schema is on the correct
      // side of the mapping, not just that the field name matches
      if (opts.asSource) {
        arrows = arrows.filter((a) => {
          const qMapping = a.namespace ? `${a.namespace}::${a.mapping}` : (a.mapping ?? "");
          const m = index.mappings.get(qMapping);
          return m?.sources.includes(resolvedSchema.key) &&
            a.sources.some((s) => s === fieldName || s === leafName);
        });
      } else if (opts.asTarget) {
        arrows = arrows.filter((a) => {
          const qMapping = a.namespace ? `${a.namespace}::${a.mapping}` : (a.mapping ?? "");
          const m = index.mappings.get(qMapping);
          return m?.targets.includes(resolvedSchema.key) &&
            (a.target === fieldName || a.target === leafName);
        });
      }

      if (arrows.length === 0) {
        console.log(`No arrows found for '${fieldRef}'.`);
        process.exit(1);
      }

      if (opts.json) {
        const jsonArrows = arrows.map((a) => {
          const qMapping = a.namespace ? `${a.namespace}::${a.mapping}` : a.mapping;
          const mapping = index.mappings.get(qMapping ?? "");
          const sourceSchemas = mapping?.sources ?? [];
          const targetSchemas = mapping?.targets ?? [];

          // Determine which schema the source field belongs to
          let sourceSchema: string;
          if (sourceSchemas.includes(resolvedSchema.key)) {
            sourceSchema = resolvedSchema.key;
          } else {
            sourceSchema = sourceSchemas[0] ?? resolvedSchema.key;
          }

          // Determine which schema the target field belongs to
          let targetSchema: string;
          if (targetSchemas.includes(resolvedSchema.key)) {
            targetSchema = resolvedSchema.key;
          } else {
            targetSchema = targetSchemas[0] ?? resolvedSchema.key;
          }

          const qualifyPath = (path: string | null, schema: string): string | null => {
            if (!path) return null;
            if (path.startsWith(schema + ".") || path === schema) return path;
            // If path is already schema-qualified (contains a dot and the prefix
            // is a known schema), don't double-qualify
            const dotIdx = path.indexOf(".");
            if (dotIdx > 0) {
              const prefix = path.slice(0, dotIdx);
              if (index.schemas.has(prefix)) return path;
            }
            return `${schema}.${path}`;
          };

          const result: Record<string, unknown> = {
            mapping: qMapping ? canonicalKey(qMapping) : null,
            source: a.sources.map((s) => canonicalKey(qualifyPath(s, sourceSchema) ?? s)).join(", "),
            target: a.target ? canonicalKey(qualifyPath(a.target, targetSchema) ?? a.target) : null,
            classification: a.classification,
            transform_raw: a.transform_raw,
            steps: a.steps,
            derived: a.derived,
            file: a.file,
            line: a.line + 1,
          };
          if (a.metadata && a.metadata.length > 0) {
            result.metadata = a.metadata;
          }
          return result;
        });
        console.log(JSON.stringify(jsonArrows, null, 2));
        return;
      }

      printDefault(fieldRef, arrows, index);
    });
}

/**
 * Check if an arrow's source/target path matches the user's requested nested path.
 * For example, if the arrow source is "CdtTrfTxInf.DbtrAgt.BIC" and the user
 * requested "CdtTrfTxInf.DbtrAgt.BIC", this returns true.
 * Also matches if the arrow path ends with the requested path (suffix match).
 */
function arrowPathMatches(arrowPath: string | null, requestedPath: string): boolean {
  if (!arrowPath) return false;
  if (arrowPath === requestedPath) return true;
  // Suffix match: arrow path ends with the requested path
  if (arrowPath.endsWith(`.${requestedPath}`)) return true;
  // The requested path ends with the arrow path (arrow has shorter dotted path)
  if (requestedPath.endsWith(`.${arrowPath}`)) return true;
  // Exact match on leaf only when the full path also has matching intermediate segments
  if (requestedPath.endsWith(arrowPath) && arrowPath === requestedPath.split(".").pop()) {
    // Leaf-only match — only accept if no deeper path was specified
    return false;
  }
  return false;
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
    const key = `${arrow.mapping}:${arrow.namespace}:${arrow.sources.join(",")}:${arrow.target}:${arrow.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(arrow);
    }
  }
  return results;
}

/**
 * Check if a field exists at a given path, supporting dotted notation
 * for nested record/list children (e.g. "address.street").
 */
function findFieldByPath(fields: FieldDecl[], path: string): boolean {
  const segments = path.split(".");
  let current = fields;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const field = current.find((f) => f.name === seg);
    if (!field) return false;
    if (i < segments.length - 1) {
      if (!field.children || field.children.length === 0) return false;
      current = field.children;
    }
  }
  return true;
}

/** Collect all field names including nested children (bare names only). */
function collectAllFieldNames(fields: FieldDecl[]): string[] {
  const names: string[] = [];
  for (const f of fields) {
    names.push(f.name);
    if (f.children) names.push(...collectAllFieldNames(f.children));
  }
  return names;
}

function printDefault(fieldRef: string, arrows: ArrowRecord[], index: WorkspaceIndex): void {
  const dot = fieldRef.indexOf(".");
  const schemaName = dot >= 0 ? fieldRef.slice(0, dot) : "";
  const fieldPath = dot >= 0 ? fieldRef.slice(dot + 1) : fieldRef;
  const leafName = fieldPath.split(".").pop();
  const matchesField = (val: string | null) =>
    val === fieldPath || val === leafName ||
    (val != null && (val.endsWith(`.${fieldPath}`) || val.endsWith(`.${leafName}`)));

  // Schema-aware source/target classification: verify the queried schema
  // is on the correct side of the mapping, not just that the field name matches
  const asSource = arrows.filter((a) => {
    if (!a.sources.some((s) => matchesField(s))) return false;
    const qMapping = a.namespace ? `${a.namespace}::${a.mapping}` : (a.mapping ?? "");
    const m = index.mappings.get(qMapping);
    return m ? m.sources.includes(schemaName) : true;
  });
  const asTarget = arrows.filter((a) => {
    if (!matchesField(a.target)) return false;
    const qMapping = a.namespace ? `${a.namespace}::${a.mapping}` : (a.mapping ?? "");
    const m = index.mappings.get(qMapping);
    return m ? m.targets.includes(schemaName) : true;
  });

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
      const src = a.sources.length > 0 ? a.sources.join(", ") : "(computed)";
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
