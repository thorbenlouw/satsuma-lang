---
id: sl-o9mh
status: closed
deps: []
links: []
created: 2026-03-31T09:45:31Z
type: task
priority: 1
assignee: Thorben Louw
tags: [cli, adr-022, breaking-change]
---
# ADR-022: make CLI commands file-based while preserving explicit import visibility

Per ADR-022, path-taking CLI commands must accept only `.stm` file arguments, not directories. This task is to remove directory mode while preserving strict import scoping inside the loaded files.

Files to change: all relevant files in `tooling/satsuma-cli/src/commands/`, plus `workspace.ts` and any index-building code that currently conflates file discovery with symbol visibility.

Key changes:
- Directory arguments are rejected with a clear error
- Help text explains that a command applies to a file entry point
- Broad repository-level examples are replaced with file-entry examples where appropriate
- Semantic resolution continues to require explicit imports plus only the exact transitive dependencies those imports require
- Tests cover both file-entry workspace selection and selective transitive dependency visibility
- Any IDE/LSP-facing workspace helpers used by the CLI path model are aligned to the same file/import-graph boundary

## Notes

**2026-03-31T11:41:57Z**

**2026-03-31T16:00:00Z**

Cause: CLI commands accepted directory arguments, creating accidental merged workspaces that conflated file discovery with symbol visibility. ADR-022 requires file-based workspace scope everywhere.

Fix: Modified `resolveInput()` in workspace.ts to reject directories with a clear error. Updated `fmt.ts` to use `resolveInput()` instead of its own directory-walking logic. Updated help text across all 22 commands to show file-based examples. Created `examples/platform.stm` as a canonical platform entry file. Updated all integration tests (integration.test.js, graph.test.js, golden-graph.test.js, bug-purge.test.js) to use specific .stm files instead of directory arguments. Added directory rejection regression tests. Updated SATSUMA-CLI.md documentation. Regenerated golden graph snapshot.
