---
id: sc-1tcm
status: open
deps: []
links: []
created: 2026-03-26T07:01:13Z
type: task
priority: 2
assignee: Thorben Louw
tags: [testing, feature-22, hygiene]
---
# Audit test corpus for Feature 22 simplification redundancies

Feature 22 simplified the grammar (collapsed metadata value forms, unified quoting to backtick-only, added @ref, removed single quotes, simplified pipe steps). Some existing tests may now be redundant, test removed syntax, or no longer make sense post-simplification. Audit the full test suite (824 tests across integration, bug-purge, unit tests) and the tree-sitter corpus (482 cases) for: tests that validate removed syntax (single quotes, old kv_value forms), tests whose assertions no longer match the simplified behavior, snapshot expectations that reflect pre-simplification output, and corpus cases that test grammar rules that were collapsed or removed.

## Acceptance Criteria

- All test files in tooling/satsuma-cli/test/ audited
- All corpus files in tooling/tree-sitter-satsuma/test/corpus/ audited
- Redundant or invalid tests identified and either removed or updated
- No tests remain that validate removed v1/pre-Feature-22 syntax
- All remaining tests pass
- Test count may decrease — that is expected and acceptable

