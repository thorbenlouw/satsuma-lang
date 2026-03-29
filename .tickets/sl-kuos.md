---
id: sl-kuos
status: open
deps: [sl-sado]
links: []
created: 2026-03-29T18:49:44Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): satsuma-core — pure helper modules (classify, canonical-ref, meta-extract) + shared extracted types

Move the pure helper modules and shared record type definitions from satsuma-cli into satsuma-core. These files have no cross-package dependencies — they only import SyntaxNode from types.ts.

Modules to move:
1. classify.ts (56 lines) → satsuma-core/src/classify.ts
   - classifyTransform(steps): Classification
   - classifyArrow(arrowNode, sourceFields, targetField): Classification
   - Depends only on Classification, SyntaxNode types

2. canonical-ref.ts (39 lines) → satsuma-core/src/canonical-ref.ts
   - canonicalRef(namespace, schema, field?): string
   - Pure string function, no CST dependencies

3. meta-extract.ts (82 lines) → satsuma-core/src/meta-extract.ts
   - extractMetadata(metaNode): MetaEntry[]
   - MetaEntry union type (MetaEntryTag | MetaEntryKV | MetaEntryEnum | MetaEntryNote | MetaEntrySlice)
   - Depends only on SyntaxNode

4. Extend satsuma-core/src/types.ts with CLI record types:
   - Classification, PipeStep, FieldDecl, MetaEntry (and its variants)
   - ExtractedSchema, ExtractedMapping, ExtractedArrow, ExtractedMetric, ExtractedFragment, ExtractedTransform, ExtractedNote, ExtractedWarning, ExtractedQuestion, ExtractedImport, NamespaceInfo
   - These are the output shapes of all extract* functions

CLI source files are NOT deleted yet — they still exist but should be refactored to re-export from satsuma-core (thin pass-throughs) so no CLI import paths break.

## Acceptance Criteria

1. All 3 modules exist in satsuma-core/src/ with identical logic to CLI originals 2. All MetaEntry and ExtractedRecord types are defined in satsuma-core/src/types.ts 3. satsuma-core exports all new modules from index 4. satsuma-core builds and its own tests pass 5. CLI files for classify, canonical-ref, meta-extract become re-export shims (import from @satsuma/core, re-export) — no logic duplication 6. All existing CLI tests that cover classify.test.js pass unchanged

