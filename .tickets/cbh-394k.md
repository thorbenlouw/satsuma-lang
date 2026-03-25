---
id: cbh-394k
status: open
deps: []
links: []
created: 2026-03-25T11:20:25Z
type: bug
priority: 2
assignee: Thorben Louw
---
# fmt: drops trailing comments in mapping blocks

The formatter silently removes comments that appear after the last arrow in a mapping block. This is a data loss bug since //! warning comments and //? question comments carry semantic meaning.

- Exact command: cat /tmp/satsuma-bug-hunt/warnings.stm | satsuma fmt --stdin
- Expected: The comment '//! location field has no target — data will be lost' on line 28 of warnings.stm should be preserved in the formatted output
- Actual: The comment is silently dropped. Verified with diff showing line 28 removed with no replacement.
- Minimal reproduction: A mapping block with a comment after the last arrow: 'mapping { source { `s1` } target { `s2` } id -> id //! trailing comment }' — the trailing comment is removed.
- Test file paths: /tmp/satsuma-bug-hunt/warnings.stm, /tmp/satsuma-bug-hunt-fmt/trailing-comment.stm

