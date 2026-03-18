---
id: stm-q2cz
status: open
deps: []
links: []
created: 2026-03-18T18:56:24Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [parser, tree-sitter, examples]
---
# Parser gaps from example corpus

Track the remaining tree-sitter grammar gaps exposed by the canonical examples under examples/ and the new feature spec in features/11-parser-gaps.

## Acceptance Criteria

All example files under examples/ parse without ERROR nodes.
Every gap category documented in features/11-parser-gaps/PRD.md has focused corpus coverage.
Ambiguous constructs are either specified and parsed or normalized out of the examples with rationale.

