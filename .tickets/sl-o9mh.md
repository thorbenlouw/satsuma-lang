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
# ADR-022: update all CLI commands to require file argument, remove directory support

Per ADR-022, all CLI commands must accept only .stm file arguments, not directories. Directory arguments should produce an error message suggesting a file instead. The CLI resolves imports transitively from the entry file to build the workspace.

Files to change: all files in tooling/satsuma-cli/src/commands/ (~20 files), plus resolve-input.ts and index-builder.ts.

Key changes:
- resolveInput() rejects directory paths
- All [path] parameters documented as requiring a .stm file
- satsuma fmt accepts a file or --stdin only
- satsuma diff <a> <b> accepts two entry files
- All --help text updated
- All CLI tests updated to use file arguments

