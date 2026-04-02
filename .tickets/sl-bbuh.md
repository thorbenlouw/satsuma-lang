---
id: sl-bbuh
status: closed
deps: [sl-3tv5]
links: []
created: 2026-04-02T09:21:01Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-m2s6
---
# examples: update canonical corpus to idiomatic post-simplification style

Audit and update the canonical examples in examples/ to demonstrate good post-simplification Satsuma style. The vocabulary tokens (trim, lowercase, etc.) remain valid as NL — they don't need to be rewritten. However: (1) arithmetic-operator-style steps like { * 100 } must be rewritten as NL prose (e.g., { "Multiply by 100" }), (2) function-call-style steps like round(2) and parse("MM/DD/YYYY") should be reviewed — they're valid as NL text but may read more clearly as prose, (3) at least one example should showcase the idiomatic simplified style for the docs. This ticket is about example quality, not parse correctness — existing files already parse correctly as NL after the grammar change.

## Acceptance Criteria

1. No example file uses arithmetic operator syntax { * N }
2. At least one example demonstrates clean post-simplification NL pipe step style
3. All examples still parse without errors after grammar changes
4. The examples that informed classification bugs (sl-xy4s, sl-lzcp) are updated or removed if they relied on structural semantics

