---
id: stm-t1n8
status: open
deps: [stm-14x]
links: []
created: 2026-03-16T13:46:22Z
type: epic
priority: 1
assignee: Thorben Louw
---
# VS Code syntax highlighter for STM

Deliver a VS Code extension for STM with baseline TextMate syntax highlighting, language configuration, fixture-driven validation, and a documented path to parser-backed semantic tokens. The work must reuse parser fixtures and shared syntax inventory rather than creating a disconnected language definition.

## Acceptance Criteria

A parent ticket exists for the STM VS Code syntax highlighter feature and links implementation tasks under a single dependency graph.
Baseline VS Code support is planned around a TextMate grammar and language configuration, with parser-backed semantic tokens explicitly deferred.
Dependencies on the tree-sitter parser work are captured in the ticket graph where needed.
The resulting task breakdown covers extension scaffolding, grammar implementation, fixture coverage, verification, and follow-on semantic-token planning.

