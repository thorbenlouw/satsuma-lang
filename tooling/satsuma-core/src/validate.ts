/**
 * validate.ts — Semantic validation for Satsuma workspaces
 *
 * Semantic checks catch errors that tree-sitter cannot: undefined references,
 * duplicate definitions, arrows pointing to undeclared fields, and NL @refs
 * that don't resolve to workspace entities. These require a fully-built
 * workspace index, not just individual file parses.
 *
 * The main export is collectSemanticDiagnostics(index). Its input is the
 * SemanticIndex structural interface, which the CLI WorkspaceIndex satisfies
 * via TypeScript duck typing. Outputs are plain SemanticDiagnostic objects
 * with no CLI- or LSP-specific types.
 *
 * Check categories (each has its own section below):
 *   1. Duplicate definitions — same name declared twice
 *   2. Fragment spread references — spreads to unknown fragments
 *   3. Mapping source/target references — mappings pointing to unknown schemas
 *   4. Metric source references — metrics referencing unknown schemas
 *   5. NL @ref validation — @refs in NL transforms that don't resolve
 *   6. Arrow field references — arrow paths not declared in their schema
 *   7. Transform spread references — ...spread in arrow transforms
 *   8. Ref metadata targets — (ref @schema) annotations pointing to unknown schemas
 */

import { capitalize } from "./string-utils.js";
import { extractAtRefs, classifyRef, resolveRef, isSchemaInMappingSources } from "./nl-ref.js";
import type { DefinitionLookup } from "./nl-ref.js";
import { expandSpreads, collectFieldPaths } from "./spread-expand.js";
import type { SpreadEntity } from "./spread-expand.js";
import { resolveScopedEntityRef } from "./canonical-ref.js";
import type { FieldDecl, MetaEntry, PipeStep } from "./types.js";

// ---------- Output type ----------

/**
 * A single semantic diagnostic produced by the validator.
 * All positions are 1-indexed (row and column both start at 1), matching
 * the convention used in CLI output. LSP consumers must subtract 1.
 */
export interface SemanticDiagnostic {
  /** Absolute path or URI of the source file containing the issue. */
  file: string;
  /** 1-indexed line number of the entity or arrow that triggered the diagnostic. */
  line: number;
  /** 1-indexed column number (always 1 for entity-level checks). */
  column: number;
  severity: "error" | "warning";
  /** Short machine-readable rule identifier, e.g. "duplicate-definition". */
  rule: string;
  /** Human-readable diagnostic message. */
  message: string;
}

// ---------- Structural input interface ----------
//
// SemanticIndex is the minimal structural interface that collectSemanticDiagnostics
// requires. The CLI WorkspaceIndex and LSP WorkspaceIndex both satisfy it via
// TypeScript structural typing — no code changes needed in consumers.

export interface SemanticSchema {
  name: string;
  namespace?: string;
  file: string;
  row: number;
  fields: FieldDecl[];
  spreads?: string[];
  hasSpreads?: boolean;
  blockMetadata?: MetaEntry[];
}

export interface SemanticFragment {
  name: string;
  namespace?: string;
  file: string;
  row: number;
  fields: FieldDecl[];
  spreads?: string[];
  hasSpreads?: boolean;
}

export interface SemanticMapping {
  name: string | null;
  namespace?: string;
  file: string;
  row: number;
  sources: string[];
  targets: string[];
}

export interface SemanticMetric {
  namespace?: string;
  file: string;
  row: number;
  sources?: string[];
}

export interface SemanticArrow {
  mapping: string | null;
  namespace: string | null;
  sources: string[];
  target: string | null;
  steps?: PipeStep[];
  line: number;
  file: string;
}

export interface SemanticNLRef {
  text: string;
  mapping: string;
  namespace: string | null;
  line: number;
  column: number;
  file: string;
}

export interface SemanticDuplicate {
  kind: string;
  name: string;
  file: string;
  row: number;
  previousKind: string;
  previousFile: string;
  previousRow: number;
  tag?: string;
  value?: string;
  previousValue?: string;
}

/**
 * Minimal workspace index required by the semantic validator.
 * The CLI WorkspaceIndex satisfies this interface structurally.
 * nlRefData and duplicates are optional — absent means "none found".
 */
export interface SemanticIndex {
  schemas: Map<string, SemanticSchema>;
  fragments: Map<string, SemanticFragment>;
  mappings: Map<string, SemanticMapping>;
  metrics: Map<string, SemanticMetric>;
  /** Transform name map — only Map membership is checked (no field access needed). */
  transforms: Map<string, unknown>;
  fieldArrows: Map<string, SemanticArrow[]>;
  nlRefData?: SemanticNLRef[];
  duplicates?: SemanticDuplicate[];
}

// ---------- Entry point ----------

/**
 * Run all semantic checks against a workspace index, returning a flat list of
 * diagnostics. All positions in the output are 1-indexed.
 *
 * The checks are independent: a failure in one category does not suppress
 * diagnostics from another. Order within each category matches declaration order.
 */
export function collectSemanticDiagnostics(index: SemanticIndex): SemanticDiagnostic[] {
  const diagnostics: SemanticDiagnostic[] = [];

  checkDuplicates(index, diagnostics);
  checkFragmentSpreads(index, diagnostics);
  checkMappingRefs(index, diagnostics);
  checkMetricRefs(index, diagnostics);
  checkNLRefs(index, diagnostics);
  checkArrowFieldRefs(index, diagnostics);
  checkTransformSpreads(index, diagnostics);
  checkRefMetadata(index, diagnostics);

  return diagnostics;
}

// ---------- Section 1: Duplicate definitions ----------

/**
 * Report every entry in the duplicates log. Two sub-cases:
 *   - namespace-metadata-conflict: conflicting @label values in the same namespace
 *   - duplicate-definition: same name used for two entities (possibly of different kinds)
 */
function checkDuplicates(index: SemanticIndex, diagnostics: SemanticDiagnostic[]): void {
  for (const dup of index.duplicates ?? []) {
    // kind "namespace-metadata" is how the index builder records conflicting
    // namespace-level metadata (e.g. two files disagree on the @note for "pos").
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

// ---------- Section 2: Fragment spread references ----------

/**
 * A schema that spreads a fragment must reference a fragment that exists in
 * the index. Cross-namespace spreads require a qualified reference.
 */
function checkFragmentSpreads(index: SemanticIndex, diagnostics: SemanticDiagnostic[]): void {
  for (const [name, schema] of index.schemas) {
    const currentNs = schema.namespace ?? null;
    for (const spread of (schema.spreads ?? [])) {
      if (!resolveScopedEntityRef(spread, currentNs, index.fragments as Map<string, unknown>)) {
        diagnostics.push({
          file: schema.file,
          line: schema.row + 1,
          column: 1,
          severity: "warning",
          rule: "undefined-ref",
          message: `Schema '${name}' spreads undefined fragment '${spread}'`,
        });
      }
    }
  }
}

// ---------- Section 3: Mapping source/target references ----------

/**
 * Every schema reference in a mapping's source and target lists must resolve
 * to a known schema or fragment. A hint is appended when the name exists in
 * another namespace, making the likely fix obvious.
 */
function checkMappingRefs(index: SemanticIndex, diagnostics: SemanticDiagnostic[]): void {
  const allDefinitions = new Map([
    ...index.schemas as Map<string, unknown>,
    ...index.fragments as Map<string, unknown>,
  ]);

  for (const [name, mapping] of index.mappings) {
    const currentNs = mapping.namespace ?? null;
    for (const src of mapping.sources) {
      if (!resolveScopedEntityRef(src, currentNs, allDefinitions)) {
        let msg = `Mapping '${name}' references undefined source '${src}'`;
        const hints = suggestAlternatives(src, allDefinitions);
        if (hints.length > 0) msg += `\n  hint: did you mean ${hints.map((h) => `'${h}'`).join(" or ")}?`;
        diagnostics.push({ file: mapping.file, line: mapping.row + 1, column: 1, severity: "warning", rule: "undefined-ref", message: msg });
      }
    }
    for (const tgt of mapping.targets) {
      if (!resolveScopedEntityRef(tgt, currentNs, allDefinitions)) {
        let msg = `Mapping '${name}' references undefined target '${tgt}'`;
        const hints = suggestAlternatives(tgt, allDefinitions);
        if (hints.length > 0) msg += `\n  hint: did you mean ${hints.map((h) => `'${h}'`).join(" or ")}?`;
        diagnostics.push({ file: mapping.file, line: mapping.row + 1, column: 1, severity: "warning", rule: "undefined-ref", message: msg });
      }
    }
  }
}

// ---------- Section 4: Metric source references ----------

/**
 * Metric source references must resolve to known schemas (not fragments).
 */
function checkMetricRefs(index: SemanticIndex, diagnostics: SemanticDiagnostic[]): void {
  for (const [name, metric] of index.metrics) {
    const currentNs = metric.namespace ?? null;
    for (const src of (metric.sources ?? [])) {
      if (!resolveScopedEntityRef(src, currentNs, index.schemas as Map<string, unknown>)) {
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

// ---------- Section 5: NL @ref validation ----------

/**
 * @refs in NL transform text must resolve to known workspace entities AND
 * must reference schemas that appear in the mapping's source or target list.
 * Refs inside note: contexts are excluded — notes are free-form prose.
 */
function checkNLRefs(index: SemanticIndex, diagnostics: SemanticDiagnostic[]): void {
  if (!index.nlRefData) return;

  for (const item of index.nlRefData) {
    const refs = extractAtRefs(item.text);
    const mappingKey = item.namespace ? `${item.namespace}::${item.mapping}` : item.mapping;
    const mapping = index.mappings.get(mappingKey);
    const mappingContext = {
      sources: mapping?.sources ?? [],
      targets: mapping?.targets ?? [],
      namespace: item.namespace,
    };

    // Notes have no binding mapping context — skip ref checks entirely.
    const isNoteContext = mappingKey.startsWith("note:");
    const lookup = makeSemanticLookup(index);

    for (const { ref, offset } of refs) {
      const classification = classifyRef(ref);
      const resolution = resolveRef(ref, mappingContext, lookup);

      if (!resolution.resolved) {
        if (!isNoteContext) {
          diagnostics.push({
            file: item.file,
            line: item.line + 1,
            column: item.column + offset + 1,
            severity: "warning",
            rule: "nl-ref-unresolved",
            message: `NL reference \`${ref}\` in mapping '${mappingKey}' does not resolve to any known identifier`,
          });
        }
      } else {
        // Check that a resolved schema ref is part of the mapping's source/target list.
        const referencedSchema = extractReferencedSchema(classification, resolution, index);
        if (referencedSchema && !isNoteContext && !isSchemaInMappingSources(referencedSchema, mapping)) {
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
}

/**
 * Extract the schema key from a resolved @ref, used to check mapping membership.
 * Returns null when the ref doesn't point to a schema directly or via a field.
 */
function extractReferencedSchema(
  classification: string,
  resolution: { resolved: boolean; resolvedTo: { kind: string; name: string } | null },
  index: SemanticIndex,
): string | null {
  if (classification === "namespace-qualified-schema" || classification === "bare") {
    if (resolution.resolvedTo?.kind === "schema") return resolution.resolvedTo.name;
  } else if (classification === "dotted-field" || classification === "namespace-qualified-field") {
    if (resolution.resolvedTo?.kind === "field") {
      const fieldPath = resolution.resolvedTo.name;
      const parts = fieldPath.split(".");
      for (let i = parts.length - 1; i > 0; i--) {
        const candidate = parts.slice(0, i).join(".");
        if (index.schemas.has(candidate)) return candidate;
      }
      if (fieldPath.includes("::")) {
        const dotIdx = fieldPath.indexOf(".", fieldPath.indexOf("::") + 2);
        if (dotIdx > 0) return fieldPath.slice(0, dotIdx);
      }
    }
  }
  return null;
}

// ---------- Section 6: Arrow field references ----------

/**
 * Arrow source and target paths must be declared in the mapping's source/target
 * schemas. Convention-inferred fields (Data Vault, Kimball) are excluded from
 * false-positive reporting. Field checks are suppressed for schemas with
 * unresolved spreads (can't know their full field set).
 */
function checkArrowFieldRefs(index: SemanticIndex, diagnostics: SemanticDiagnostic[]): void {
  if (!index.fieldArrows) return;

  // De-duplicate arrows (the same arrow may appear under multiple index keys).
  const seenArrows = new Set<SemanticArrow>();
  const uniqueArrows: SemanticArrow[] = [];
  for (const [, arrows] of index.fieldArrows) {
    for (const arrow of arrows) {
      if (!seenArrows.has(arrow)) { seenArrows.add(arrow); uniqueArrows.push(arrow); }
    }
  }

  for (const [, mapping] of index.mappings) {
    const currentNs = mapping.namespace ?? null;

    const resolvedSrcKeys = mapping.sources
      .map((s) => resolveScopedEntityRef(s, currentNs, index.schemas as Map<string, unknown>))
      .filter((k): k is string => k != null);
    const resolvedTgtKey = mapping.targets[0]
      ? resolveScopedEntityRef(mapping.targets[0], currentNs, index.schemas as Map<string, unknown>)
      : null;

    const srcSchema = resolvedSrcKeys[0];

    // Build the set of valid source field paths (flat, possibly multi-schema).
    const srcFieldPaths = new Set<string>();
    for (const s of resolvedSrcKeys) {
      collectFieldPaths(index.schemas.get(s)?.fields ?? [], "", srcFieldPaths);
    }
    if (resolvedSrcKeys.length > 1) {
      for (let i = 0; i < mapping.sources.length; i++) {
        const key = resolveScopedEntityRef(mapping.sources[i]!, currentNs, index.schemas as Map<string, unknown>);
        if (!key) continue;
        collectFieldPaths(index.schemas.get(key)?.fields ?? [], mapping.sources[i]! + ".", srcFieldPaths);
      }
    }

    const tgtFieldPaths = new Set<string>();
    collectFieldPaths(resolvedTgtKey ? (index.schemas.get(resolvedTgtKey)?.fields ?? []) : [], "", tgtFieldPaths);

    // Expand spreads; suppress field checks if any spread is unresolvable.
    const resolveRef = (ref: string, _ns: string | null) =>
      resolveScopedEntityRef(ref, currentNs, index.fragments as Map<string, unknown>);
    const lookupFragment = (key: string): SpreadEntity | undefined => {
      const f = index.fragments.get(key);
      return f ? { fields: f.fields, hasSpreads: f.hasSpreads ?? false, spreads: f.spreads, file: f.file, row: f.row } : undefined;
    };
    const lookupSchema = (key: string): SpreadEntity | undefined => {
      const s = index.schemas.get(key);
      return s ? { fields: s.fields, hasSpreads: s.hasSpreads ?? false, spreads: s.spreads, file: s.file, row: s.row } : undefined;
    };
    const srcHasUnresolved = expandSpreads(resolvedSrcKeys, currentNs, resolveRef, lookupFragment, srcFieldPaths, diagnostics as never[], lookupSchema);
    const tgtHasUnresolved = resolvedTgtKey
      ? expandSpreads([resolvedTgtKey], currentNs, resolveRef, lookupFragment, tgtFieldPaths, diagnostics as never[], lookupSchema)
      : false;

    // Add convention-inferred fields so they don't trigger false positives.
    for (const key of resolvedSrcKeys) {
      const sch = index.schemas.get(key);
      if (sch) for (const f of getConventionFields(sch)) srcFieldPaths.add(f);
    }
    for (let i = 0; i < mapping.sources.length; i++) {
      const key = resolveScopedEntityRef(mapping.sources[i]!, currentNs, index.schemas as Map<string, unknown>);
      if (!key) continue;
      const sch = index.schemas.get(key);
      if (sch) for (const f of getConventionFields(sch)) srcFieldPaths.add(`${mapping.sources[i]}.${f}`);
    }
    if (resolvedTgtKey) {
      const sch = index.schemas.get(resolvedTgtKey);
      if (sch) for (const f of getConventionFields(sch)) tgtFieldPaths.add(f);
    }

    for (const arrow of uniqueArrows) {
      if (arrow.mapping !== mapping.name || (arrow.namespace ?? null) !== currentNs) continue;
      if (arrow.file !== mapping.file) continue; // guard against cross-file duplicate mapping names

      for (const source of arrow.sources) {
        if (
          srcSchema && index.schemas.has(srcSchema) && !srcHasUnresolved &&
          !resolveFieldPath(source, resolvedSrcKeys, index, srcFieldPaths)
        ) {
          diagnostics.push({
            file: arrow.file, line: arrow.line + 1, column: 1, severity: "warning",
            rule: "field-not-in-schema",
            message: `Arrow source '${source}' not declared in schema '${srcSchema}'`,
          });
        }
      }
      if (
        arrow.target && resolvedTgtKey && index.schemas.has(resolvedTgtKey) && !tgtHasUnresolved &&
        !resolveFieldPath(arrow.target, [resolvedTgtKey], index, tgtFieldPaths)
      ) {
        diagnostics.push({
          file: arrow.file, line: arrow.line + 1, column: 1, severity: "warning",
          rule: "field-not-in-schema",
          message: `Arrow target '${arrow.target}' not declared in schema '${resolvedTgtKey}'`,
        });
      }
    }
  }
}

// ---------- Section 7: Transform spread references ----------

/**
 * Fragment spread steps inside arrow transforms (...fragName) must reference
 * a known transform (not a schema fragment — these are transform fragments).
 */
function checkTransformSpreads(index: SemanticIndex, diagnostics: SemanticDiagnostic[]): void {
  if (!index.fieldArrows) return;
  const seen = new Set<SemanticArrow>();
  for (const [, arrows] of index.fieldArrows) {
    for (const arrow of arrows) {
      if (seen.has(arrow)) continue;
      seen.add(arrow);
      for (const step of arrow.steps ?? []) {
        if (step.type === "fragment_spread") {
          const spreadName = step.text.replace(/^\.\.\./, "");
          const currentNs = arrow.namespace ?? null;
          if (!resolveScopedEntityRef(spreadName, currentNs, index.transforms)) {
            diagnostics.push({
              file: arrow.file, line: arrow.line + 1, column: 1, severity: "warning",
              rule: "undefined-ref",
              message: `Arrow in mapping '${arrow.mapping}' spreads undefined transform '${spreadName}'`,
            });
          }
        }
      }
    }
  }
}

// ---------- Section 8: Ref metadata targets ----------

/**
 * Fields annotated with (ref @schema) or (ref @schema.field) must point to a
 * known schema. Recurses into record children.
 */
function checkRefMetadata(index: SemanticIndex, diagnostics: SemanticDiagnostic[]): void {
  for (const [schemaName, schema] of index.schemas) {
    checkFieldRefMetadata(schema.fields, schemaName, schema.file, schema.row, schema.namespace ?? null, index, diagnostics);
  }
  for (const [fragName, frag] of index.fragments) {
    checkFieldRefMetadata(frag.fields, fragName, frag.file, frag.row, frag.namespace ?? null, index, diagnostics);
  }
}

function checkFieldRefMetadata(
  fields: FieldDecl[],
  entityName: string,
  file: string,
  row: number,
  currentNs: string | null,
  index: SemanticIndex,
  diagnostics: SemanticDiagnostic[],
): void {
  for (const field of fields) {
    if (field.metadata) {
      for (const m of field.metadata) {
        if (m.kind === "kv" && m.key === "ref") {
          const refTarget = m.value.replace(/^@/, "").split(".")[0]!;
          if (!resolveScopedEntityRef(refTarget, currentNs, index.schemas as Map<string, unknown>)) {
            diagnostics.push({
              file, line: row + 1, column: 1, severity: "warning",
              rule: "undefined-ref",
              message: `Field '${field.name}' in '${entityName}' references undefined schema '${refTarget}' via (ref ${m.value})`,
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

// ---------- Helpers ----------

/**
 * Suggest fully-qualified alternatives when a bare name exists in other namespaces.
 * Only fires for unqualified refs — callers of ns::name already know exactly what they want.
 */
function suggestAlternatives(ref: string, entityMap: Map<string, unknown>): string[] {
  if (ref.includes("::")) return [];
  const hints: string[] = [];
  for (const key of entityMap.keys()) {
    if (key.endsWith(`::${ref}`)) hints.push(key);
  }
  return hints;
}

/**
 * Compute convention-inferred field names for a schema based on its metadata tokens.
 *
 * Data Vault conventions (source: Data Vault 2.0 standard):
 *   hub        → {name}_hk, load_date, record_source
 *   link       → {name}_hk, load_date, record_source, {hub}_hk (per link_hubs kv)
 *   satellite  → load_date, load_end_date, hash_diff, record_source, {parent}_hk
 *
 * Kimball conventions (source: The Data Warehouse Toolkit):
 *   dimension + scd 2 or 6 → surrogate_key, valid_from, valid_to, is_current, row_hash
 *   fact       → etl_batch_id, loaded_at
 *
 * These fields are pre-populated in the valid-path set so arrows targeting them
 * do not trigger false "field not in schema" warnings.
 */
function getConventionFields(schema: SemanticSchema): Set<string> {
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
    for (const kv of kvs) {
      if (kv.key === "link_hubs") {
        for (const hub of kv.value.split(",").map((h) => h.trim())) {
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
    for (const kv of kvs) {
      if (kv.key === "parent") fields.add(`${kv.value}_hk`);
    }
  }
  if (tags.has("dimension")) {
    const hasScd2or6 = kvs.some((kv) => kv.key === "scd" && (kv.value === "2" || kv.value === "6"));
    if (hasScd2or6) {
      fields.add("surrogate_key");
      fields.add("valid_from");
      fields.add("valid_to");
      fields.add("is_current");
      fields.add("row_hash");
    }
  }
  if (tags.has("fact")) {
    fields.add("etl_batch_id");
    fields.add("loaded_at");
  }
  return fields;
}

/**
 * Resolve an arrow field path against the known field paths for the mapping's schema.
 * Returns true when the path is valid (no diagnostic needed).
 *
 * Special cases:
 *  - Paths starting with "." are always valid (computed / expression paths).
 *  - The schema name itself is valid (for container arrows targeting the schema root).
 *  - Qualified paths like "source_schema.field" are resolved by stripping the prefix.
 */
function resolveFieldPath(path: string, schemaNames: string[], index: SemanticIndex, fieldPaths: Set<string>): boolean {
  if (path.startsWith(".")) return true;
  if (fieldPaths.has(path)) return true;
  if (schemaNames.includes(path)) return true;

  const dotIdx = path.indexOf(".");
  if (dotIdx > 0) {
    const qualifier = path.slice(0, dotIdx);
    const matchedSchema = schemaNames.find((s) => {
      if (s === qualifier) return true;
      const nsIdx = s.indexOf("::");
      return nsIdx !== -1 && s.slice(nsIdx + 2) === qualifier;
    });
    if (matchedSchema) {
      const rest = path.slice(dotIdx + 1);
      const qualPaths = new Set<string>();
      collectFieldPaths(index.schemas.get(matchedSchema)?.fields ?? [], "", qualPaths);
      if (qualPaths.has(rest)) return true;
    }
  }
  return false;
}

/**
 * Build a DefinitionLookup (for resolveRef in nl-ref.ts) from a SemanticIndex.
 * The lookup bridges the callback interface to the SemanticIndex's Maps.
 */
function makeSemanticLookup(index: SemanticIndex): DefinitionLookup {
  return {
    hasSchema: (key) => index.schemas.has(key),
    getSchema: (key) => {
      const s = index.schemas.get(key);
      return s ? { fields: s.fields, hasSpreads: s.hasSpreads ?? false, spreads: s.spreads, namespace: s.namespace } : null;
    },
    hasFragment: (key) => index.fragments.has(key),
    getFragment: (key) => {
      const f = index.fragments.get(key);
      return f ? { fields: f.fields, hasSpreads: f.hasSpreads ?? false, spreads: f.spreads } : null;
    },
    hasTransform: (key) => index.transforms.has(key),
    getMapping: (key) => {
      const m = index.mappings.get(key);
      return m ? { sources: m.sources, targets: m.targets, namespace: m.namespace ?? null } : null;
    },
    iterateSchemas: () => index.schemas.entries() as unknown as Iterable<[string, { fields: FieldDecl[]; hasSpreads: boolean; namespace?: string | null; spreads?: string[] }]>,
  };
}
