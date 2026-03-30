---
id: sl-ueij
status: closed
deps: []
links: []
created: 2026-03-30T06:39:00Z
type: chore
priority: 2
assignee: Thorben Louw
---
# index-builder.ts: document anonymous mapping resolution and fieldArrows indexing scheme

tooling/satsuma-cli/src/index-builder.ts has two readability defects:

1. Lines 271-293: anonymous mapping resolution sorts anonMappingRows and finds 'the last anon mapping whose start row is <='. This is a clever spatial algorithm but is completely undocumented. A reader cannot tell what problem is being solved (how do you associate an arrow with an anonymous mapping when there is no name to key on?), why sorting by row is the right approach, or what breaks if two anonymous mappings are adjacent.

2. Lines 378-434: buildFieldArrows() builds a multi-key index with both prefixed and bare field names. The indexing scheme (why both forms? when is each used?) is not explained. The canonical form transformation is not documented.

## Acceptance Criteria

- The anonymous mapping resolution block (lines 271-293) has a comment explaining: what an anonymous mapping is, why positional/row-based matching is needed, and the invariant assumed (arrows appear in source after the mapping block they belong to)
- buildFieldArrows() has a comment explaining the dual-key indexing strategy: what prefixed vs bare names represent and which callers rely on each form
- All existing index-builder tests pass

