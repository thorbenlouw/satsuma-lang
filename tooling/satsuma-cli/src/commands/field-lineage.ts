/**
 * field-lineage.ts — `satsuma field-lineage <schema.field>` command
 *
 * Traces the full field-level lineage of a single field in one command:
 * upstream (fields that feed into this field) and downstream (fields this
 * field flows into), following both declared arrows and NL-derived references.
 *
 * Flags:
 *   --upstream     only upstream chain
 *   --downstream   only downstream chain
 *   --depth <n>    limit traversal depth (default 10)
 *   --json         structured JSON output
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey, canonicalKey } from "../index-builder.js";
import { resolveAllNLRefs } from "../nl-ref-extract.js";
import { expandEntityFields } from "../spread-expand.js";
import type { WorkspaceIndex, FieldDecl } from "../types.js";

interface FieldEdgeEntry {
  from: string | null; // canonical field path or null for derived/no-source
  to: string;          // canonical field path
  via_mapping: string; // canonical mapping key
  classification: string;
}

interface FieldLineageResult {
  field: string;
  upstream: Array<{ field: string; via_mapping: string; classification: string }>;
  downstream: Array<{ field: string; via_mapping: string; classification: string }>;
}

export function register(program: Command): void {
  program
    .command("field-lineage <schema.field> [path]")
    .description("Trace the full upstream and downstream lineage of a single field")
    .option("--upstream", "only upstream chain")
    .option("--downstream", "only downstream chain")
    .option("--depth <n>", "maximum traversal depth", (v: string) => parseInt(v, 10), 10)
    .option("--json", "structured JSON output")
    .addHelpText("after", `
Traces all fields that flow into (upstream) and out of (downstream) the given
field, following declared arrows and NL-derived references. Detects cycles.

The field reference is <schema>.<field>. Namespace-qualified names work
(e.g. pos::stores.STORE_ID).

JSON output shape:
  {
    "field": "::schema.field",
    "upstream":   [{ "field": "::src.f", "via_mapping": "::m", "classification": "none" }, ...],
    "downstream": [{ "field": "::tgt.f", "via_mapping": "::m", "classification": "none" }, ...]
  }

Examples:
  satsuma field-lineage s2.a                     # full upstream + downstream
  satsuma field-lineage s2.a --upstream          # only upstream chain
  satsuma field-lineage s2.a --json              # structured output
  satsuma field-lineage ns::s2.a --downstream    # namespace-qualified`)
    .action(async (fieldRef: string, pathArg: string | undefined, opts: {
      upstream?: boolean;
      downstream?: boolean;
      depth: number;
      json?: boolean;
    }) => {
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

      // Resolve the schema
      const resolvedSchema = resolveIndexKey(schemaName, index.schemas);
      if (!resolvedSchema) {
        console.error(`Schema '${schemaName}' not found.`);
        process.exit(1);
      }

      // Validate field exists (including spread fields)
      const schema = resolvedSchema.entry;
      const spreadFields = expandEntityFields(schema, schema.namespace ?? null, index);
      const allFields = [...schema.fields, ...spreadFields];
      const fieldExists = findFieldByPath(allFields, fieldName) ||
        collectAllFieldNames(allFields).includes(fieldName);
      if (!fieldExists) {
        console.error(`Field '${fieldName}' not found in schema '${schemaName}'.`);
        process.exit(1);
      }

      const qualifiedField = `${resolvedSchema.key}.${fieldName}`;
      const canonicalField = canonicalKey(qualifiedField);

      // Build the field-level edge graph (declared + nl-derived)
      const edges = buildFieldEdgeGraph(index);

      // Determine which directions to trace.
      // If both flags are set (or neither), trace both directions.
      const doUpstream = opts.upstream || !opts.downstream;
      const doDownstream = opts.downstream || !opts.upstream;

      const upstream: Array<{ field: string; via_mapping: string; classification: string }> = [];
      const downstream: Array<{ field: string; via_mapping: string; classification: string }> = [];

      if (doUpstream) {
        traceUpstream(canonicalField, edges, opts.depth, upstream);
      }
      if (doDownstream) {
        traceDownstream(canonicalField, edges, opts.depth, downstream);
      }

      const result: FieldLineageResult = {
        field: canonicalField,
        upstream,
        downstream,
      };

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      printDefault(result, doUpstream, doDownstream);
    });
}

// ── Field-edge graph ──────────────────────────────────────────────────────────

/**
 * Build a list of all field-level edges from the workspace index,
 * including both declared arrows and NL-derived references.
 */
function buildFieldEdgeGraph(index: WorkspaceIndex): FieldEdgeEntry[] {
  const edges: FieldEdgeEntry[] = [];
  const seen = new Set<string>();

  // Declared arrows from the field arrows index
  for (const [, records] of index.fieldArrows) {
    for (const record of records) {
      const dedupKey = `${record.file}:${record.line}:${record.target}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const mappingKey = canonicalKey(
        record.namespace ? `${record.namespace}::${record.mapping}` : (record.mapping ?? ""),
      );

      const mapping = index.mappings.get(
        record.namespace ? `${record.namespace}::${record.mapping}` : (record.mapping ?? ""),
      );
      const sourceSchemas = mapping?.sources ?? [];
      const targetSchemas = mapping?.targets ?? [];

      const toField = record.target
        ? canonicalKey(qualifyField(record.target, targetSchemas))
        : null;
      if (!toField) continue;

      for (const src of record.sources.length > 0 ? record.sources : [null]) {
        const fromField = src
          ? canonicalKey(qualifyField(src, sourceSchemas))
          : null;
        edges.push({
          from: fromField,
          to: toField,
          via_mapping: mappingKey,
          classification: record.classification,
        });
      }
    }
  }

  // NL-derived field edges from @ref mentions
  const nlRefs = resolveAllNLRefs(index);
  const nlSeen = new Set<string>();
  for (const nlRef of nlRefs) {
    if (!nlRef.resolved || !nlRef.resolvedTo || nlRef.resolvedTo.kind !== "field") continue;
    if (!nlRef.targetField) continue;

    const rawMappingKey = nlRef.namespace
      ? `${nlRef.namespace}::${nlRef.mapping}`
      : nlRef.mapping;
    const mapping = index.mappings.get(rawMappingKey);
    if (!mapping) continue;

    const sourceField = nlRef.resolvedTo.name; // already canonical
    const rawTarget = qualifyField(nlRef.targetField, mapping.targets);
    const targetField = canonicalKey(rawTarget);

    if (sourceField === targetField) continue;

    const dedupKey = `${sourceField}|${targetField}|${rawMappingKey}`;
    if (nlSeen.has(dedupKey)) continue;
    nlSeen.add(dedupKey);

    // Skip if there's already a declared (non-nl-derived) arrow from the same
    // source to the same target in the same mapping
    const mappingCanonical = canonicalKey(rawMappingKey);
    const alreadyCovered = edges.some(
      (e) => e.from === sourceField && e.to === targetField &&
             e.via_mapping === mappingCanonical && e.classification !== "nl-derived",
    );
    if (alreadyCovered) continue;

    edges.push({
      from: sourceField,
      to: targetField,
      via_mapping: mappingCanonical,
      classification: "nl-derived",
    });
  }

  return edges;
}

/**
 * Qualify a bare field name with its schema, handling leading dots (nested fields)
 * and already-qualified paths.
 */
function qualifyField(field: string, schemas: string[]): string {
  if (schemas.length === 0) return field;
  if (field.includes("::")) return field; // already canonical
  if (field.startsWith(".")) return `${schemas[0]}.${field.slice(1)}`;
  const dotIdx = field.indexOf(".");
  if (dotIdx > 0) {
    const prefix = field.slice(0, dotIdx);
    if (schemas.includes(prefix)) return field;
    for (const s of schemas) {
      const nsIdx = s.indexOf("::");
      const bare = nsIdx !== -1 ? s.slice(nsIdx + 2) : s;
      if (bare === prefix) return field;
    }
  }
  return `${schemas[0]}.${field}`;
}

// ── Traversal ─────────────────────────────────────────────────────────────────

/**
 * Trace upstream: fields that flow INTO `start` (start is a target).
 * BFS up to `maxDepth` hops. Returns one entry per source field reached.
 */
function traceUpstream(
  start: string,
  edges: FieldEdgeEntry[],
  maxDepth: number,
  result: Array<{ field: string; via_mapping: string; classification: string }>,
): void {
  const visited = new Set<string>([start]);
  const queue: Array<{ field: string; depth: number }> = [{ field: start, depth: 0 }];

  while (queue.length > 0) {
    const { field, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    for (const edge of edges) {
      if (edge.to !== field || edge.from === null) continue;
      if (visited.has(edge.from)) continue;
      visited.add(edge.from);
      result.push({
        field: edge.from,
        via_mapping: edge.via_mapping,
        classification: edge.classification,
      });
      queue.push({ field: edge.from, depth: depth + 1 });
    }
  }
}

/**
 * Trace downstream: fields that `start` flows INTO (start is a source).
 * BFS up to `maxDepth` hops. Returns one entry per target field reached.
 */
function traceDownstream(
  start: string,
  edges: FieldEdgeEntry[],
  maxDepth: number,
  result: Array<{ field: string; via_mapping: string; classification: string }>,
): void {
  const visited = new Set<string>([start]);
  const queue: Array<{ field: string; depth: number }> = [{ field: start, depth: 0 }];

  while (queue.length > 0) {
    const { field, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    for (const edge of edges) {
      if (edge.from !== field) continue;
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      result.push({
        field: edge.to,
        via_mapping: edge.via_mapping,
        classification: edge.classification,
      });
      queue.push({ field: edge.to, depth: depth + 1 });
    }
  }
}

// ── Schema/field helpers ──────────────────────────────────────────────────────

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

function collectAllFieldNames(fields: FieldDecl[]): string[] {
  const names: string[] = [];
  for (const f of fields) {
    names.push(f.name);
    if (f.children) names.push(...collectAllFieldNames(f.children));
  }
  return names;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function printDefault(
  result: FieldLineageResult,
  doUpstream: boolean,
  doDownstream: boolean,
): void {
  const total = result.upstream.length + result.downstream.length;
  console.log(`${result.field} — ${total} lineage connection${total !== 1 ? "s" : ""}`);
  console.log();

  if (doUpstream) {
    if (result.upstream.length === 0) {
      console.log("  upstream: (none)");
    } else {
      console.log(`  upstream (${result.upstream.length}):`);
      for (const u of result.upstream) {
        console.log(`    ${u.field}  via ${u.via_mapping}  [${u.classification}]`);
      }
    }
    console.log();
  }

  if (doDownstream) {
    if (result.downstream.length === 0) {
      console.log("  downstream: (none)");
    } else {
      console.log(`  downstream (${result.downstream.length}):`);
      for (const d of result.downstream) {
        console.log(`    ${d.field}  via ${d.via_mapping}  [${d.classification}]`);
      }
    }
    console.log();
  }
}
