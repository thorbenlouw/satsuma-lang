---
id: sl-i2k9
status: open
deps: [sl-via3, sl-z6ps]
links: [sl-4afx]
created: 2026-03-30T18:24:49Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-jvwu
tags: [lsp]
---
# lsp: migrate viz-model.ts CST text helpers and ref resolution to core

viz-model.ts has local CST text helpers that duplicate core's cst-utils:

- pathText() — strips backticks from path text → core's entryText() or labelText()
- sourceRefText() — extracts source_ref text → core's entryText()
- fieldNameText() — extracts field name text → core's entryText()
- stripQuotes() — removes quote delimiters → core's stringText()
- nodeLocation() — converts CST node to SourceLocation → no core equivalent (LSP-specific)

Also, viz-model.ts implements resolveMappingRef() for resolving schema references in mapping source/target blocks. Core provides canonicalRef() and resolveScopedEntityRef() for this.

**Which implementation to prefer:**
Core's text helpers — they're canonical and handle edge cases consistently. For ref resolution, core's resolveScopedEntityRef() is the canonical resolver (see ADR-005 callback pattern).

nodeLocation() is genuinely LSP-specific (converts to SourceLocation type) and stays.

**Work:**
1. Replace pathText(), sourceRefText(), fieldNameText() with core's entryText() or labelText().
2. Replace stripQuotes() with core's stringText() (after sl-via3 adds escape handling).
3. Replace resolveMappingRef() with core's canonicalRef() + resolveScopedEntityRef().
4. Keep nodeLocation() as the only local helper (LSP-specific, clearly documented).
5. Delete replaced helpers and deduplicate tests.

**Validation before PR:**
- Viz renders identically
- Code meets AGENTS.md standards: nodeLocation() has doc-comment explaining why it's not in core

## Design

Depends on sl-via3 (escape handling in stringText) completing first so stripQuotes replacement is correct.

## Acceptance Criteria

- Local text helpers pathText/sourceRefText/fieldNameText/stripQuotes deleted from viz-model.ts
- All text extraction uses core cst-utils
- resolveMappingRef() deleted; uses core canonical-ref
- Only nodeLocation() remains as LSP-specific helper
- Tests consolidated

