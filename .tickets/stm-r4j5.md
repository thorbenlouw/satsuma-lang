---
id: stm-r4j5
status: closed
deps: []
links: []
created: 2026-03-18T21:29:38Z
type: bug
priority: 2
assignee: Thorben Louw
parent: stm-r58z
tags: [validator, cli, feature-12]
---
# Bug 5: Eliminate duplicate warnings from field-not-in-schema

Most field-not-in-schema warnings appear twice for the same arrow at the same line. The fieldArrows index likely stores each arrow twice (once keyed by source field, once by target field) and the validation loop in src/validate.js visits both entries. This roughly doubles the warning count (121 total, ~60 unique). Root cause: fieldArrows iteration in validate.js lines 119-153 loops over all entries for every mapping without deduplication.

## Acceptance Criteria

Each arrow produces at most one warning per rule. Total warning count is not inflated by duplicate entries. Dedup test coverage added.

