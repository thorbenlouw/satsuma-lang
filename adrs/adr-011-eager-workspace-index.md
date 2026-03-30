# ADR-011 — Eager Workspace Index for Cross-File Intelligence

**Status:** Accepted
**Date:** 2026-03 (retrospective, PR #50)

## Context

LSP Phase 1 (ADR-010) delivered single-file features — symbols, diagnostics, folding, hover. Phase 2 required cross-file operations: go-to-definition across files, workspace-wide find-references, completions drawing from all schemas/fragments/transforms in the workspace, and rename refactoring.

Two indexing strategies were considered:

- **Lazy / on-demand** — parse and index files only when a cross-file query arrives. Lower startup cost, but every first query for a new file incurs a parse penalty, and keeping the index consistent across incremental edits is complex.
- **Eager / up-front** — scan and index the entire workspace at server startup, then update incrementally on save, text change, and file-system watch events. Higher startup cost (proportional to workspace size), but all queries are fast and the index is always current.

## Decision

Build an eager, in-memory workspace index (`workspace-index.ts`) that:

1. **On startup:** scans all `.stm` files in the workspace, parses each with tree-sitter, and populates a symbol table with definitions, references, imports, field info, and namespace bindings.
2. **On save / text change:** re-parses the changed document and updates only its entries in the index.
3. **On file-system watch events:** adds or removes entries when `.stm` files are created, renamed, or deleted. The client synchronizes file-watcher events to the server.

All navigation features (go-to-definition, find-references, completions, rename, code lens, coverage) query this index rather than re-parsing on demand. The index is namespace-aware and resolves qualified names (`ns::schema`).

## Consequences

**Positive:**
- All cross-file queries are sub-millisecond after startup — no parse-on-first-query latency
- The index is the single authoritative view of the workspace, reducing duplication across feature modules
- Incremental updates on save keep the index current without re-scanning the full workspace
- File-watcher integration means new/deleted files are reflected immediately

**Negative:**
- Startup time scales with workspace size — a very large Satsuma workspace could have a noticeable delay (not yet a real problem given typical workspace sizes)
- The index is purely in-memory — restarting the server rebuilds it from scratch
- Every feature module takes a dependency on the index's data structures, making it a central coupling point
