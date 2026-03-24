---
id: sl-j0yf
status: closed
deps: [sl-zf33]
links: []
created: 2026-03-24T18:29:17Z
type: task
priority: 1
assignee: Thorben Louw
tags: [feat-20, phase-1]
---
# Schema and fragment block formatting

Implement formatting for schema_block and fragment_block: indentation, braces, block metadata (single-line/multi-line), two-pass field column alignment (name/type/metadata caps at 24/14). Fragment spreads as non-aligned standalone lines.

## Acceptance Criteria

- [ ] Schema blocks formatted with correct indentation and brace placement
- [ ] Multi-line metadata: opening ( on keyword line, entries indented, closing ) { together
- [ ] Field names column-aligned (capped at 24 chars)
- [ ] Type column-aligned (capped at 14 chars)
- [ ] Metadata column-aligned with 2-space minimum gap
- [ ] Fragment blocks use same field alignment rules
- [ ] Fragment spreads (...name) not aligned, standalone at block indent
- [ ] Inline trailing comments preserve 2-space minimum gap
- [ ] Tests for all schema/fragment formatting rules


## Notes

**2026-03-24T19:08:40Z**

Cause: New feature. Fix: Implemented schema/fragment formatting in format.ts with two-pass field column alignment (name cap 24, type cap 14), multi-line record field handling, fragment spread formatting, and block trailing comment collection. 55 tests passing.
