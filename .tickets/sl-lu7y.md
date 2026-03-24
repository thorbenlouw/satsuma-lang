---
id: sl-lu7y
status: closed
deps: [sl-zf33]
links: []
created: 2026-03-24T18:29:27Z
type: task
priority: 1
assignee: Thorben Louw
tags: [feat-20, phase-1]
---
# Mapping block formatting

Implement formatting for mapping_block: source/target sub-blocks (single-line/multi-line), arrow declarations (simple, inline transform, computed with NL body), pipe chains, each/flatten nested structures, note sub-blocks within mappings.

## Acceptance Criteria

- [ ] source/target sub-blocks: single-line when short (<80 chars), multi-line otherwise
- [ ] Simple arrows: single space around ->
- [ ] Inline transform arrows: { trim | lowercase } with single spaces
- [ ] Computed arrows: opening { on same line, body indented, closing } at arrow indent
- [ ] Pipe chains: | with single space on each side
- [ ] NL strings in computed arrows preserved verbatim
- [ ] each/flatten nested blocks formatted recursively
- [ ] note sub-blocks within mappings formatted correctly
- [ ] Tests for all mapping formatting patterns


## Notes

**2026-03-24T19:08:41Z**

Cause: New feature. Fix: Implemented mapping formatting with source/target sub-blocks (single/multi-line), map_arrow, computed_arrow, nested_arrow, each/flatten blocks, pipe chains (inline/multi-line), map literals, arithmetic steps. 55 tests passing.
