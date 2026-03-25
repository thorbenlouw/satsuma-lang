---
id: cbh-0lhj
status: closed
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


## Notes

**2026-03-25T12:29:10Z**

**2026-03-25T12:50:00Z**

Cause: topLevelSep unconditionally used "\n" for consecutive header comments, ignoring source blank lines.
Fix: Added hasBlankBetween check so blank lines between file header comments and section comments are preserved. Also reformatted all 21 example files to match the new 1-blank-line spacing, and added fmt --check to scripts/run-repo-checks.sh.
