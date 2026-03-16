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


## Notes

**2026-03-16T14:59:55Z**

All child tasks enriched with detailed design notes and acceptance criteria derived from HIGHLIGHTING-TAXONOMY.md (stm-o50b output). Scope mappings, ambiguity strategies, fixture layouts, degradation criteria, theme verification targets, and semantic token plans are now embedded in each task. Dependency stm-55vc → stm-2m6y was confirmed. Ready work: stm-2m6y (scaffold), stm-5lbl (semantic design). Critical path: stm-2m6y → stm-55vc → stm-dy6t → stm-aybc/stm-0oad.
