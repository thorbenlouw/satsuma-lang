---
id: stm-aybc
status: open
deps: [stm-dy6t]
links: []
created: 2026-03-16T13:46:54Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-t1n8
---
# Verify, document, and quality-gate the STM VS Code extension

Finish the VS Code highlighter with full fixture validation, local extension verification, documentation, and scripted quality gates so it can be maintained alongside the parser work.

## Acceptance Criteria

Highlighting tests run against canonical STM examples and focused fixtures non-interactively.
Representative STM files are verified in a local VS Code or extension test environment, including at least one light and one dark theme.
The extension README documents installation, development workflow, grammar regeneration if needed, and known approximation limits.
Scripted checks cover extension manifest validity and syntax fixture tests.
Parser-related docs and the extension docs cross-link shared token mapping and dependency expectations.

