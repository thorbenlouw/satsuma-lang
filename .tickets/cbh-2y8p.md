---
id: cbh-2y8p
status: open
deps: []
links: [cbh-ukcx, cbh-so1o, cbh-kyv3, cbh-7ji8, cbh-9cqh, cbh-b0w8, cbh-e01s]
created: 2026-03-25T11:16:52Z
type: bug
priority: 2
assignee: Thorben Louw
---
# meta: schema-level note truncated in text output mode

When running satsuma meta on a schema with a long triple-quoted note, the text output truncates the note.

- Exact command: satsuma meta customer_master /tmp/satsuma-bug-hunt/
- Expected: Full note text displayed (including Data Quality section with bullet points about deduplication, phone normalization, address validation)
- Actual: Note truncated at '## Data Qual...' — only first ~100 chars shown
- JSON output (--json) shows the complete note correctly, so this is a text-mode rendering bug
- Test file: /tmp/satsuma-bug-hunt/schemas.stm (customer_master schema, lines 62-97)

