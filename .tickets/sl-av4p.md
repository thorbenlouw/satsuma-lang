---
id: sl-av4p
status: closed
deps: []
links: []
created: 2026-03-29T16:06:28Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [examples, docs, refactor]
---
# refactor(examples): reorganise examples/ into workspace-style subfolders with READMEs

## Problem

All example `.stm` files currently live flat in `examples/` (plus `examples/lib/` and `examples/lookups/`). This makes the corpus hard to browse:

- No indication of what scenario each file demonstrates
- Files that belong together (e.g. `metric_sources.stm` + `metrics.stm`) have no grouping
- No entry-point for multi-file workspace examples that use imports
- Newcomers cannot tell at a glance which files are standalone vs. part of a multi-file pipeline

## Acceptance Criteria

- [x] All examples are reorganised into named workspace subdirectories under `examples/`
- [x] Each subdirectory has a `README.md` explaining the scenario, features demonstrated, and entry point
- [x] Multi-file workspaces (those using `import`) have their imports updated to reflect the new relative paths
- [x] All tree-sitter corpus tests pass with updated paths
- [x] All CLI tests pass with updated paths
- [x] `viz-model.test.js` `example file coverage` suite updated and passing
- [x] All documentation references updated (`SATSUMA-CLI.md`, `SATSUMA-V2-SPEC.md`, `HOW-DO-I.md`, `README.md`, `ROADMAP.md`, and others)
- [x] No broken relative import paths in any example file

## Notes

**2026-03-29T17:30:00Z**

Cause: All 21 example `.stm` files lived flat in `examples/`, with no grouping by scenario, making the corpus hard to browse and preventing per-workspace READMEs.

Fix: Moved all files into 14 named scenario subdirectories (`cobol-to-avro/`, `db-to-db/`, etc.). Single-pipeline scenarios renamed to `pipeline.stm`; multi-file workspaces kept their original filenames. `common.stm` moved to `lib/`. Updated imports in 5 files, all 21 tree-sitter fixture JSONs, 8 CLI test files, 2 LSP server test files, and 15+ documentation files. 865 CLI tests + 280 LSP server tests pass.
