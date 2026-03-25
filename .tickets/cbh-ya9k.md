---
id: cbh-ya9k
status: open
deps: []
links: []
created: 2026-03-25T11:20:21Z
type: bug
priority: 2
assignee: Thorben Louw
---
# fmt: --diff produces malformed unified diff with overlapping hunks

The fmt --diff output produces broken unified diff output where hunks overlap and old/new lines get mixed together in context sections. This means the diff cannot be reliably applied as a patch.

- Exact command: satsuma fmt --diff /tmp/satsuma-bug-hunt/schemas.stm
- Expected: Standard unified diff with clean, non-overlapping hunks that correctly show removed (-) and added (+) lines
- Actual: Hunks overlap each other. For example, the second hunk includes unchanged old-format lines in its context that should have been marked as removed in a previous hunk. The diff shows 'product_id' as removed without showing it re-added, making it look like a field was dropped (but stdin output confirms it is preserved). Similarly, comments appear duplicated in the diff but not in actual formatted output.
- Reproduction: Compare 'satsuma fmt --diff file.stm' against 'diff <(cat file.stm) <(cat file.stm | satsuma fmt --stdin)' to see the discrepancy
- Test file path: /tmp/satsuma-bug-hunt/schemas.stm, /tmp/satsuma-bug-hunt-fmt/messy.stm

