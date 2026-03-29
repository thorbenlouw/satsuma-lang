---
id: sl-pxw5
status: open
deps: [sl-ikzl]
links: []
created: 2026-03-29T18:50:35Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): satsuma-core — NL ref text extraction (pure functions)

Move the pure text-processing functions from satsuma-cli/src/nl-ref-extract.ts into satsuma-core/src/nl-ref.ts. These functions parse and classify backtick/@ref mentions in NL strings without needing the WorkspaceIndex.

Functions to move to satsuma-core:
- BacktickRef interface { ref: string; offset: number }
- extractBacktickRefs(text: string): BacktickRef[]
  Parses @ref and backtick-delimited references from a raw NL string.
  Pure text function — no CST, no index.
- RefKind type + classifyRef(ref: string): RefKind
  Classifies a ref string as: namespace-qualified-field, namespace-qualified-schema, dotted-field, bare-schema, bare-field.
  Pure string analysis.

Functions that STAY in satsuma-cli/src/nl-ref-extract.ts (require WorkspaceIndex):
- resolveRef() — resolves a ref against a WorkspaceIndex
- extractNLRefData() — walks CST and indexes NL string positions
- resolveAllNLRefs() — batch resolution against WorkspaceIndex

The CLI nl-ref-extract.ts imports extractBacktickRefs and classifyRef from @satsuma/core/nl-ref and re-exports them alongside its resolution functions.

## Acceptance Criteria

1. satsuma-core/src/nl-ref.ts exports BacktickRef, RefKind, extractBacktickRefs, classifyRef 2. satsuma-core/src/index.ts exports from nl-ref 3. All existing CLI nl-ref-extract.test.js tests for extractBacktickRefs and classifyRef pass (they now exercise satsuma-core code) 4. satsuma-core builds 5. Unit tests in satsuma-core/test/nl-ref.test.js cover: @ref parsing, backtick parsing, mixed @ref+backtick, ref classification patterns

