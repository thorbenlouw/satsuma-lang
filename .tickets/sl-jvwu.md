---
id: sl-jvwu
status: open
deps: []
links: []
created: 2026-03-30T18:22:11Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [core, lsp, cli]
---
# epic: Complete core extraction consolidation (ADR-020)

Consolidate all CST extraction logic into satsuma-core so that CLI and LSP are thin consumers that only wire callbacks and adapt output shapes. See ADR-020 for the full rationale.

## Acceptance Criteria

- All extraction, classification, metadata, spread expansion, NL ref, and string utility logic lives exclusively in satsuma-core
- CLI and LSP contain zero reimplemented extraction logic — only adapter/wiring code
- Core test suite comprehensively covers all extraction; consumer tests cover only wiring and consumer-specific features
- No behavioural divergence between CLI and LSP for any shared concern
- All code meets AGENTS.md quality standards (module comments, doc-comments, section comments, named constants, small functions)

