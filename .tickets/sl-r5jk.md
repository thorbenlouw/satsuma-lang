---
id: sl-r5jk
status: open
deps: [sl-n4wb, sl-ysy4, sl-s1gt]
links: []
created: 2026-03-29T18:52:06Z
type: task
priority: 2
assignee: Thorben Louw
---
# feat(26): ARCHITECTURE.md + retrospective ADRs for satsuma-lang tooling

Produce the two documentation outputs that are explicit deliverables of Feature 26:

1. ARCHITECTURE.md at the repo root — describes the tooling layer design as it exists after the migration:
   - Package map: tree-sitter-satsuma, satsuma-core, satsuma-cli, vscode-satsuma, satsuma-viz and their roles
   - Dependency diagram (ASCII or Mermaid): which packages depend on which
   - Data flow: source text → tree-sitter parse → satsuma-core extraction → CLI WorkspaceIndex / LSP VizModel / LSP DefinitionIndex
   - Module structure within satsuma-core (cst-utils, extract, spread-expand, nl-ref, classify, canonical-ref, meta-extract, types)
   - Key type hierarchy: SyntaxNode → ExtractedSchema/Field/Arrow → CLI WorkspaceIndex vs LSP VizModel
   - Extension points: how to add a new extraction consumer
   - Test strategy: where tests live per package, golden snapshot approach

2. adrs/ directory at the repo root with retrospective ADRs:
   - ADR-001: tree-sitter as the parsing foundation
   - ADR-002: WASM over native tree-sitter bindings (shared by CLI and LSP)
   - ADR-003: satsuma-core as the shared extraction library (this feature)
   - ADR-004: CLI implementation preferred as base for satsuma-core extraction
   - ADR-005: EntityFieldLookup callback abstraction for spread-expand (decouples from CLI's WorkspaceIndex)
   - ADR-006: NL ref resolution split (pure extraction in core, resolution in CLI)
   - ADR-007: formatter in satsuma-core (retrospective for that earlier decision)

Each ADR follows the standard format: Status, Context, Decision, Consequences.

Also update features/26-extraction-consolidation/PRD.md status to COMPLETE.

## Acceptance Criteria

1. ARCHITECTURE.md exists at repo root, covers all 7 sections listed 2. adrs/ directory exists with 7 ADR files (adr-001.md through adr-007.md) 3. Each ADR has Status, Context, Decision, Consequences sections 4. PRD status updated to COMPLETE 5. HOW-DO-I.md updated to point to ARCHITECTURE.md for architectural questions 6. AI-AGENT-REFERENCE.md updated if it has any stale tooling architecture references

