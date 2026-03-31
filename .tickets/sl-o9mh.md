---
id: sl-o9mh
status: open
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
