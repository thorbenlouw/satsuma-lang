---
id: cbh-0lhj
status: open
deps: []
links: [cbh-zybb, cbh-xj0m, cbh-vgka, cbh-394k, cbh-qwyg, cbh-ya9k]
created: 2026-03-25T11:21:10Z
type: bug
priority: 2
assignee: Thorben Louw
---
# fmt: removes blank line between file header comment and section comment

The formatter removes the blank line that separates a file-level header comment from the first section comment, merging them visually.

- Exact command: cat /tmp/satsuma-bug-hunt/schemas.stm | satsuma fmt --stdin
- Expected: Blank line preserved between '// schemas.stm — comprehensive schema test fixtures' and '// Basic schema with all common types'
- Actual: The blank line is removed, making the two comments appear as a single block:
  // schemas.stm — comprehensive schema test fixtures
  // Basic schema with all common types
- Original has clear visual separation with a blank line between the file header and the section description
- Test file path: /tmp/satsuma-bug-hunt/schemas.stm

