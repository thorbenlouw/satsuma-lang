/**
 * field-coverage.ts — Shared mapping-detail coverage helpers for satsuma-viz.
 *
 * The web component should consume the same nested-field coverage semantics as
 * the LSP coverage path utilities instead of comparing leaf names ad hoc.
 */

import { buildCoveredFieldSet } from "@satsuma/core/coverage-paths";
import type { ArrowEntry, MappingBlock, SchemaCard, VizModel } from "./model.js";

/**
 * Return true when the schema declares the exact local dotted field path.
 */
export function schemaHasFieldPath(schema: SchemaCard, fieldPath: string): boolean {
  const parts = fieldPath.split(".");
  let fields = schema.fields;
  for (const part of parts) {
    const field = fields.find((candidate) => candidate.name === part);
    if (!field) return false;
    fields = field.children;
  }
  return true;
}

/**
 * Resolve an arrow field reference to the schema-local dotted field path for a
 * specific schema card.
 *
 * Examples:
 * - `customer_profiles.region` + schema `customer_profiles` -> `region`
 * - `customer.email` + schema `order_events` -> `customer.email`
 * - `other_schema.id` + schema `order_events` -> null
 */
export function resolveSchemaLocalFieldPath(
  fieldRef: string,
  schema: SchemaCard,
  sourceRefs: string[],
): string | null {
  if (fieldRef.startsWith(`${schema.qualifiedId}.`)) {
    return fieldRef.slice(schema.qualifiedId.length + 1);
  }

  const explicitOtherSchema = sourceRefs.some(
    (sourceRef) => sourceRef !== schema.qualifiedId && fieldRef.startsWith(`${sourceRef}.`),
  );
  if (explicitOtherSchema) return null;

  return schemaHasFieldPath(schema, fieldRef) ? fieldRef : null;
}

/**
 * Walk all arrows in a mapping, including nested each_blocks and flatten_blocks.
 */
export function forEachMappingArrow(
  mapping: MappingBlock,
  visit: (arrow: ArrowEntry) => void,
): void {
  const visitEach = (eachBlocks: MappingBlock["eachBlocks"]): void => {
    for (const each of eachBlocks) {
      for (const arrow of each.arrows) visit(arrow);
      visitEach(each.nestedEach);
    }
  };

  for (const arrow of mapping.arrows) visit(arrow);
  visitEach(mapping.eachBlocks);
  for (const flatten of mapping.flattenBlocks) {
    for (const arrow of flatten.arrows) visit(arrow);
  }
}

/**
 * Build schema-local covered-field sets for one mapping detail view.
 */
export function buildMappingCoveredFields(
  mapping: MappingBlock,
  sourceSchemas: SchemaCard[],
  targetSchema: SchemaCard | null,
): { sourceMapped: Map<string, Set<string>>; targetMapped: Set<string> } {
  const sourceFieldRefs = new Map<string, string[]>();
  for (const schema of sourceSchemas) sourceFieldRefs.set(schema.qualifiedId, []);

  const targetFieldRefs: string[] = [];

  forEachMappingArrow(mapping, (arrow) => {
    if (targetSchema) {
      const targetPath = resolveSchemaLocalFieldPath(arrow.targetField, targetSchema, [mapping.targetRef]);
      if (targetPath) targetFieldRefs.push(targetPath);
    }

    for (const sourceField of arrow.sourceFields) {
      for (const schema of sourceSchemas) {
        const localPath = resolveSchemaLocalFieldPath(sourceField, schema, mapping.sourceRefs);
        if (localPath) sourceFieldRefs.get(schema.qualifiedId)!.push(localPath);
      }
    }
  });

  const sourceMapped = new Map<string, Set<string>>();
  for (const [schemaId, refs] of sourceFieldRefs) {
    sourceMapped.set(schemaId, buildCoveredFieldSet(refs));
  }

  return {
    sourceMapped,
    targetMapped: buildCoveredFieldSet(targetFieldRefs),
  };
}

/**
 * Build the overview-level mapped-field index across the whole VizModel.
 */
export function buildMappedFieldsIndex(model: VizModel): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  const allSchemas = new Map(
    model.namespaces.flatMap((ns) => ns.schemas.map((schema) => [schema.qualifiedId, schema] as const)),
  );

  for (const ns of model.namespaces) {
    for (const mapping of ns.mappings) {
      const sourceSchemas = mapping.sourceRefs
        .map((schemaId) => allSchemas.get(schemaId))
        .filter((schema): schema is SchemaCard => schema != null);
      const targetSchema = allSchemas.get(mapping.targetRef) ?? null;
      const { sourceMapped, targetMapped } = buildMappingCoveredFields(mapping, sourceSchemas, targetSchema);

      for (const [schemaId, covered] of sourceMapped) {
        if (!index.has(schemaId)) index.set(schemaId, new Set());
        for (const path of covered) index.get(schemaId)!.add(path);
      }

      if (targetSchema) {
        if (!index.has(targetSchema.qualifiedId)) index.set(targetSchema.qualifiedId, new Set());
        for (const path of targetMapped) index.get(targetSchema.qualifiedId)!.add(path);
      }
    }
  }

  return index;
}
