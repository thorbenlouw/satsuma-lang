---
id: sl-d0je
status: open
deps: [sl-via3, sl-z6ps]
links: [sl-o4by]
created: 2026-03-30T18:23:17Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-jvwu
tags: [lsp]
---
# lsp: migrate workspace-index.ts CST text helpers to core cst-utils

workspace-index.ts defines local text extraction helpers that duplicate core's cst-utils:

- sourceRefText() — extracts text from source_ref nodes (backtick or identifier children)
- qualifiedNameText() — extracts namespace::name from qualified_name nodes
- importNameText() — extracts import name text
- spreadLabelText() — extracts spread label
- fieldNameText() — extracts field name handling backticks
- extractArrowFullPath() — strips dots and backticks from arrow paths
- walkDescendants() — generic descendant traversal

Core provides: labelText(), stringText(), entryText(), child(), children(), allDescendants().

**Which implementation to prefer:**
Core's helpers are generic and well-tested. The LSP's helpers are specialised wrappers. Most can be replaced with core calls:
- sourceRefText() → entryText() (already handles backtick_name and identifier)
- spreadLabelText() → labelText() or entryText()
- fieldNameText() → entryText() with backtick stripping
- walkDescendants() → allDescendants()

Some LSP helpers (qualifiedNameText, extractArrowFullPath) do namespace-specific work that core doesn't cover. These should either:
a) Stay as thin adapters calling core primitives, or
b) Move to core if they represent general-purpose CST extraction.

**Work:**
1. Replace each local helper with core equivalent where possible.
2. For helpers with no exact core match, evaluate if they belong in core or are LSP-specific adapters.
3. Delete replaced helpers and their tests.
4. Consolidate tests: core tests cover the primitives, LSP tests cover only adapter-specific paths.

**Validation before PR:**
- All LSP features work
- Grep confirms no remaining duplicate text helpers
- Code meets AGENTS.md standards

## Acceptance Criteria

- Local text helpers replaced with core cst-utils imports where equivalent
- Remaining helpers documented as LSP-specific adapters with doc-comments explaining why they're not in core
- No duplicate traversal helpers (walkDescendants deleted in favour of allDescendants)
- Tests consolidated

