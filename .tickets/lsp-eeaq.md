---
id: lsp-eeaq
status: closed
deps: [lsp-oj5r]
links: []
created: 2026-03-25T17:28:46Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-2, grammar]
---
# P2.2: Add multi-source arrow corpus tests

Create test/corpus/multi_source_arrows.txt with comprehensive corpus tests for multi-source arrow syntax.

## Acceptance Criteria

- Tests for 2, 3+ source fields
- Tests for bare and schema-qualified sources
- Tests for mixed bare/qualified sources
- Tests for multi-source with transforms
- All corpus tests pass


## Notes

**2026-03-25T18:49:05Z**

## Notes

**2026-03-25T18:15:00Z**

Cause: New multi-source arrow grammar needed corpus test coverage.
Fix: Created multi_source_arrows.txt with 9 corpus tests covering 2/3+ sources, schema-qualified, namespace-qualified, mixed, with transforms, with metadata, and regression check for single-source. (commit pending)
