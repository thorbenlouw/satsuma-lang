---
id: stm-58nl
status: open
deps: []
links: []
created: 2026-03-19T19:52:20Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-mt1d
tags: [stm-cli, lint, design]
---
# Define stm lint architecture and diagnostic contract

Define the implementation contract for `stm lint` before command and rule work begins. Capture the separation between validate and lint responsibilities, the lint diagnostic schema, exit-code semantics, fix reporting shape, and rule registration model.

## Design

Produce a concise design artifact in the repo describing:
- which checks stay in `stm validate` vs move or duplicate into `stm lint`
- lint diagnostic shape for text and JSON output
- exit-code behavior for findings vs internal errors
- how fixable rules declare fixes
- constraints for safe/idempotent autofix
- how workspace-aware lint rules access the shared parser/index pipeline

## Acceptance Criteria

1. A repo-local design doc or feature note exists for `stm lint` architecture and command semantics.
2. The doc defines a stable lint diagnostic schema including rule id, severity, file, line, column, message, and `fixable`.
3. The doc defines exit-code behavior for clean runs, lint findings, and internal failures.
4. The doc explicitly separates `stm validate` responsibilities from `stm lint` responsibilities.
5. The doc defines the safety bar for `--fix`, including idempotence and non-speculative rewrites.

