---
id: sl-5ms4
status: open
deps: []
links: []
created: 2026-03-23T09:55:03Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [feature-13, validator]
---
# Validator: duplicate schema definitions across files cause false field-not-in-schema warnings

## Acceptance Criteria

When a schema is declared in multiple files with different field subsets, validate does not emit false field-not-in-schema warnings. Test coverage added.

