---
id: cbh-vgka
status: open
deps: []
links: [cbh-zybb, cbh-xj0m, cbh-0lhj, cbh-394k, cbh-qwyg, cbh-ya9k]
created: 2026-03-25T11:21:08Z
type: bug
priority: 2
assignee: Thorben Louw
---
# fmt: adds extra blank line between top-level blocks

The formatter inserts an additional blank line between top-level blocks (schemas, mappings, etc.), changing the spacing from 1 blank line to 2 blank lines.

- Exact command: cat /tmp/satsuma-bug-hunt/schemas.stm | satsuma fmt --stdin
- Expected: 1 blank line between closing '}' of one schema and the comment/declaration of the next (matching the original)
- Actual: 2 blank lines inserted between blocks. For example, between warehouse_products '}' and '// Schema with nested record', the original has 1 blank line but the formatted output has 2.
- This affects all top-level blocks consistently (schemas, mappings, fragments, transforms)
- Test file path: /tmp/satsuma-bug-hunt/schemas.stm, /tmp/satsuma-bug-hunt/fragments.stm

