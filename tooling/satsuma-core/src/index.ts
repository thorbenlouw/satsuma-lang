export { capitalize, normalizeName } from "./string-utils.js";
export { collectSemanticDiagnostics } from "./validate.js";
export type {
  SemanticDiagnostic,
  SemanticIndex,
  SemanticSchema,
  SemanticFragment,
  SemanticMapping,
  SemanticMetric,
  SemanticArrow,
  SemanticNLRef,
  SemanticDuplicate,
} from "./validate.js";
export { initParser, getParser, getLanguage, createQuery } from "./parser.js";
export type { ParserInitOptions } from "./parser.js";
export { collectParseErrors } from "./parse-errors.js";
export type { ParseErrorEntry } from "./parse-errors.js";
export { addPathAndPrefixes } from "./coverage.js";
export type { FieldCoverageEntry, SchemaCoverageResult, MappingCoverageResult } from "./coverage.js";
export { format } from "./format.js";
export type { SyntaxNode, Tree, Classification, PipeStep, MetaEntry, MetaEntryTag, MetaEntryKV, MetaEntryEnum, MetaEntryNote, MetaEntrySlice, FieldDecl } from "./types.js";
export { child, children, allDescendants, labelText, stringText, entryText, qualifiedNameText, sourceRefText, sourceRefStructuralText, fieldNameText, walkDescendants } from "./cst-utils.js";
export { classifyTransform, classifyArrow } from "./classify.js";
export { canonicalRef, canonicalEntityName, resolveScopedEntityRef } from "./canonical-ref.js";
export { extractMetadata } from "./meta-extract.js";
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
} from "./extract.js";
export {
  collectFieldPaths,
  expandSpreads,
  expandEntityFields,
  expandNestedSpreads,
  makeEntityRefResolver,
} from "./spread-expand.js";
export {
  extractAtRefs,
  classifyRef,
  resolveRef,
  extractNLRefData,
  resolveAllNLRefs,
  isSchemaInMappingSources,
  stripNLRefScopePrefix,
} from "./nl-ref.js";
export type {
  AtRef,
  RefClassification,
  Resolution,
  MappingSourcesTargets,
  DefinitionLookup,
  NLRefDataItem,
  NLRefDataItemNoFile,
  ResolvedNLRef,
} from "./nl-ref.js";
export type {
  SpreadEntity,
  ExpandedField,
  SpreadDiagnostic,
  EntityRefResolver,
  SpreadEntityLookup,
} from "./spread-expand.js";
export type {
  ExtractedNamespace,
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
} from "./extract.js";
