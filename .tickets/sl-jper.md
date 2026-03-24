---
id: sl-jper
status: closed
deps: [sl-jzkp]
links: []
created: 2026-03-24T18:30:10Z
type: task
priority: 1
assignee: Thorben Louw
tags: [feat-20, phase-1]
---
# Core formatter tests

Comprehensive unit tests for the formatter: every block type, field alignment, comment handling, blank line rules, single-line vs multi-line decisions. Edge cases: deeply nested records, long metadata, inline comments at alignment boundaries, empty blocks. Use example corpus as golden fixtures. Round-trip structural equivalence tests (parse(format(src)) matches parse(src)).

## Acceptance Criteria

- [ ] Unit tests for schema, fragment, mapping, transform, metric, note, import formatting
- [ ] Tests for field column alignment including cap overflow
- [ ] Tests for all three comment types and positioning
- [ ] Tests for blank line normalisation
- [ ] Tests for single-line vs multi-line block decisions
- [ ] Edge case tests: deeply nested records, long metadata, empty blocks
- [ ] Golden fixture tests against examples/*.stm
- [ ] Round-trip structural equivalence tests for all corpus fixtures
- [ ] All tests passing


## Notes

**2026-03-24T19:47:52Z**

Cause: New feature. Fix: Expanded test suite to 81 formatter tests covering all block types, field alignment, comment handling, blank line rules, edge cases (nested records, backtick names, list_of fields, namespaces, multi-source blocks, inline maps, comparison keys, arithmetic ops), golden fixtures (parse-clean output for all 16 corpus files), and structural equivalence. 760 total tests passing.
