---
id: sl-av4p
status: open
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

## Proposed Structure

Reorganise into named workspace subdirectories, each self-contained with a `README.md`:

```
examples/
  cobol-to-avro/
    README.md          # explains the scenario and what to look for
    pipeline.stm       # renamed from cobol-to-avro.stm
  db-to-db/
    README.md
    pipeline.stm
  edi-to-json/
    README.md
    pipeline.stm
  metrics-platform/
    README.md
    common.stm         # shared schemas (currently examples/common.stm)
    metric_sources.stm
    metrics.stm        # imports from metric_sources.stm
  filter-flatten-governance/
    README.md
    governance.stm
    filter-flatten-governance.stm
  multi-source/
    README.md
    multi-source-arrows.stm
    multi-source-hub.stm
    multi-source-join.stm
  namespaces/
    README.md
    namespaces.stm
    ns-merging.stm
    ns-platform.stm
  ... (one subfolder per logical scenario)
  lib/                 # shared fragments/transforms used by multiple workspaces
    README.md
    ... (current examples/lib/ contents)
  lookups/
    README.md
    ... (current examples/lookups/ contents)
```

Each `README.md` should describe:
1. The business scenario being modelled
2. Which Satsuma features are demonstrated
3. The entry-point file (for multi-file workspaces using imports)

## Impact — Files That Must Be Updated

This rename has wide impact. Before starting, audit and update all of the following:

- **Tree-sitter corpus tests** (`tooling/tree-sitter-satsuma/test/corpus/`) — many fixtures reference paths or filenames from `examples/`
- **CLI tests** (`tooling/satsuma-cli/src/**/*.test.ts`) — smoke tests and integration tests pass `examples/` paths
- **LSP server tests** (`tooling/vscode-satsuma/server/test/viz-model.test.js`) — the `example file coverage` suite reads every `.stm` from `examples/`
- **SATSUMA-CLI.md** — command examples reference `examples/` files by name
- **AI-AGENT-REFERENCE.md** — example snippets may reference example filenames
- **SATSUMA-V2-SPEC.md** — complete examples section uses filenames from `examples/`
- **PROJECT-OVERVIEW.md** — may reference example filenames
- **CLAUDE.md** — references `examples/` in its layout section
- **features/ PRDs** — feature docs may reference specific example files
- **scripts/** — any scripts that reference example paths

Use `grep -r 'examples/' . --include='*.ts' --include='*.js' --include='*.md'` (excluding `node_modules`, `archive`, `.git`) to build the full impact list before moving files.

## Acceptance Criteria

- [ ] All examples are reorganised into named workspace subdirectories under `examples/`
- [ ] Each subdirectory has a `README.md` explaining the scenario, features demonstrated, and entry point
- [ ] Multi-file workspaces (those using `import`) have their imports updated to reflect the new relative paths
- [ ] All tree-sitter corpus tests pass with updated paths
- [ ] All CLI tests pass with updated paths
- [ ] `viz-model.test.js` `example file coverage` suite updated and passing
- [ ] All documentation references updated (`SATSUMA-CLI.md`, `AI-AGENT-REFERENCE.md`, `SATSUMA-V2-SPEC.md`, `PROJECT-OVERVIEW.md`, `CLAUDE.md`)
- [ ] `satsuma agent-reference` output (generated from `AI-AGENT-REFERENCE.md`) reflects new paths
- [ ] No broken relative import paths in any example file
