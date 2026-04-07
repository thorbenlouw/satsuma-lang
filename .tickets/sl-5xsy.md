---
id: sl-5xsy
status: open
deps: []
links: []
created: 2026-04-07T09:43:10Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# tests: raise coverage gates

Measure current coverage on core/CLI/LSP. Raise gates to current rounded down to nearest 5%, target 85% floor for core. Feature 29 TODO #18.

## Acceptance Criteria

Coverage gates raised in .c8rc.json (or per-package equivalents); CI passes.

