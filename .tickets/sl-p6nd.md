---
id: sl-p6nd
status: closed
deps: [sl-z6ps]
links: [sl-4afx]
created: 2026-03-30T18:23:48Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-jvwu
tags: [lsp, core]
---
# lsp: migrate viz-model.ts classification to core classifyTransform()

viz-model.ts implements extractTransform() which classifies arrows as 'pipeline' | 'nl' | 'mixed' | 'map'. Core's classifyTransform() returns 'structural' | 'nl' | 'mixed' | 'none' | 'nl-derived'.

**Enum value mapping:**
- Core 'structural' = Viz 'pipeline' (same semantics, different name)
- Core 'nl' = Viz 'nl'
- Core 'mixed' = Viz 'mixed'
- Core 'none' = bare copy arrow (viz doesn't distinguish this — maps to 'pipeline' or omitted)
- Core 'nl-derived' = synthetic arrow from NL refs (not relevant to viz extraction)
- Viz 'map' = map_literal or fragment_spread in pipe chain (core lumps this under 'structural')

**Which implementation to prefer:**
Core's classification logic is correct and well-tested. The viz 'map' refinement is a viz-layer concern — it can be derived by inspecting pipe steps after core classification.

**Work:**
1. In viz-model.ts, replace the local classification logic with a call to core's classifyTransform().
2. Add an adapter that maps core Classification to viz TransformInfo.kind:
   - 'structural' → check for map_literal/fragment_spread → 'map' or 'pipeline'
   - 'nl' → 'nl'
   - 'mixed' → 'mixed'
   - 'none' → 'pipeline' (or whatever viz convention is for bare arrows)
3. If core needs to expose pipe step node types for the 'map' check, ensure the necessary CST info is available.
4. Delete local classification code from viz-model.ts.
5. Move classification tests to core; keep only mapping tests in LSP.

**Validation before PR:**
- Viz arrow classification display unchanged
- Core tests cover all classification values
- Code meets AGENTS.md standards: adapter function has doc-comment explaining the mapping

## Acceptance Criteria

- viz-model.ts uses core classifyTransform() for all arrow classification
- Local classification logic deleted from viz-model.ts
- Adapter maps core enum to viz enum with doc-comment
- Classification tests consolidated in core

