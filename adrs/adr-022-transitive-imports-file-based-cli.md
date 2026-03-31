# ADR-022 — Transitive Imports and File-Based CLI Scope

**Status:** Accepted
**Date:** 2026-03

## Context

The Satsuma v2 spec (section 5.3) originally stated two import scoping rules:

1. "Imports are **not** re-exported" — if file A imports `X` from file B, file C must import `X` directly from B.
2. "A symbol is only in scope within a file if it appears in that file's import graph" — symbols in the same directory but not import-reachable are not in scope.

In practice, the CLI has always treated imports as transitive: importing a file brings its entire dependency tree into scope. This is simpler, matches user expectations (no one has filed a bug about transitive imports being visible), and avoids a class of confusing "symbol exists but is not in scope" errors.

A related issue arises with directory-level commands. When `satsuma validate <directory>` merges all files in a directory into a single scope, it bypasses import boundaries entirely. Two files in the same directory that don't import each other can reference each other's definitions — which is neither the strict-scoping model nor the transitive model, but an accidental third behavior.

## Decision

### 1. Imports are transitive

Importing a file brings all of its definitions — including those it transitively imports — into scope. There is no re-export mechanism because re-export is implicit and automatic.

This matches the current CLI behavior and is now the canonical spec position. The v2 spec section 5.3 has been updated accordingly.

### 2. CLI commands operate on file arguments only

All CLI commands that accept a path argument require a `.stm` file. **Directory arguments are not supported.** Passing a directory produces an error suggesting the user provide a specific file.

```bash
# Correct — file entry point
satsuma validate pipeline.stm
satsuma graph platform.stm --json

# Error — directory not accepted
satsuma validate examples/sfdc-to-snowflake/
# → Error: expected a .stm file, not a directory. Try: satsuma validate <file.stm>
```

When given a file, the CLI resolves its import graph transitively and builds a workspace index from the resulting file set. The import graph defines the workspace boundary, not the filesystem.

### 3. Entry files are the canonical workspace boundary

For multi-file platforms, a dedicated entry file (e.g., `platform.stm`) imports from all pipeline files. Running `satsuma graph platform.stm` produces the full platform graph by following the import tree. This is documented in CLAUDE.md as the "platform entry point" pattern.

### 4. LSP and VS Code are unaffected

The LSP builds its workspace index by scanning the VS Code workspace folder (standard IDE behaviour) and then scopes per-file via `createScopedIndex()` + `getImportReachableUris()`. This already follows the import graph for each operation. The validate subprocess (`validate-diagnostics.ts`) already passes a file path to the CLI, not a directory. No LSP or VS Code changes are needed — the file-based scope model is already how the LSP works internally.

## Consequences

**Positive:**
- Simpler mental model: importing a file gives you everything in it, transitively.
- No confusing "symbol exists but is not in scope" errors.
- File-based CLI scope is deterministic and reproducible — the same file always produces the same workspace.
- No ambiguous directory-merging semantics — the workspace is exactly what the import graph says it is.

**Negative:**
- Large import trees may bring many definitions into scope. This could slow index building for very large platforms (mitigated by caching in `buildIndex`).
- Users cannot selectively import only some definitions from a file while excluding others. This has not been requested and is unlikely to be needed given Satsuma's domain.
- Removing directory mode is a breaking change. All documentation, examples, tests, website, lessons, and CLI help text must be updated. Every example directory needs a clear entry file.
- The spec's original strict-scoping model was more theoretically correct. We are trading precision for pragmatism.
