/**
 * extract.ts — re-export shim
 *
 * All extraction logic now lives in satsuma-core/src/extract.ts.
 * This file re-exports everything for backwards compatibility with
 * internal CLI imports during the migration. It will be removed in sl-n4wb
 * when all callers are updated to import from @satsuma/core directly.
 */

export {
  extractFieldTree,
  extractNamespaces,
  extractSchemas,
  extractMetrics,
  extractMappings,
  extractFragments,
  extractTransforms,
  extractNotes,
  extractWarnings,
  extractQuestions,
  extractImports,
  extractArrowRecords,
} from "@satsuma/core";

export type {
  ExtractedNamespace as NamespaceInfo,
  ExtractedSchema,
  ExtractedMetric,
  ExtractedMapping,
  ExtractedFragment,
  ExtractedTransform,
  ExtractedNote,
  ExtractedWarning,
  ExtractedQuestion,
  ExtractedImport,
  ExtractedArrow,
} from "@satsuma/core";
