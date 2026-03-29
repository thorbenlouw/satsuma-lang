---
id: sl-ikzl
status: closed
deps: [sl-kuos]
links: []
created: 2026-03-29T18:50:01Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): satsuma-core — main extraction functions (extract.ts)

Move the primary extraction functions from satsuma-cli/src/extract.ts into satsuma-core/src/extract.ts. The CLI version is the canonical implementation — it is more complete, has cycle detection, and is covered by the most tests.

Functions to move (861-line source file):
- extractNamespaces(rootNode): NamespaceInfo[]
- extractSchemas(rootNode): ExtractedSchema[]  — includes extractFieldTree (make public)
- extractMetrics(rootNode): ExtractedMetric[]
- extractMappings(rootNode): ExtractedMapping[]
- extractFragments(rootNode): ExtractedFragment[]
- extractTransforms(rootNode): ExtractedTransform[]
- extractArrowRecords(rootNode): ExtractedArrow[]
- extractNotes(rootNode): ExtractedNote[]
- extractWarnings(rootNode): ExtractedWarning[]
- extractQuestions(rootNode): ExtractedQuestion[]
- extractImports(rootNode): ExtractedImport[]

Key design decision: extractFieldTree() must be exported as a first-class public function, not a private helper. This is what allows consumers to get the full recursive FieldDecl tree rather than a flat list.

All functions take only a SyntaxNode (the tree root) and return structured records. They have no I/O and no cross-file state. They import from cst-utils, classify, canonical-ref, meta-extract, and types — all of which will be in satsuma-core after the previous ticket.

The private helper functions (child, children, etc.) inside extract.ts should be removed — they are now in cst-utils and imported from there.

After this ticket, CLI's extract.ts becomes a thin re-export shim.

## Acceptance Criteria

1. satsuma-core/src/extract.ts exports all listed functions 2. extractFieldTree() is exported publicly 3. All functions import their helpers from satsuma-core's own cst-utils, classify, canonical-ref, meta-extract modules 4. satsuma-core builds without errors 5. New unit tests in satsuma-core/test/extract.test.js cover: schema extraction with nested record fields, mapping with each/flatten blocks, metric extraction, import extraction 6. CLI extract.ts becomes a re-export shim and existing CLI extract.test.js passes unchanged 7. Golden snapshot test (from sl-8pj3) still passes


## Notes

**2026-03-29T20:35:37Z**

Cause: Extraction logic for schemas/fields/mappings/arrows/metrics/fragments/transforms/notes/warnings/questions/imports existed only in the CLI. Fix: Created satsuma-core/src/extract.ts with all extraction functions (importing from core's own cst-utils/classify/canonical-ref/meta-extract). CLI extract.ts is now a thin re-export shim. Added 59 satsuma-core unit tests. All 866 CLI tests pass.
