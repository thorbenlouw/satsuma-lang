---
id: lsp-ve2s
status: open
deps: [lsp-jpli]
links: []
created: 2026-03-25T17:36:08Z
type: chore
priority: 2
assignee: Thorben Louw
tags: [phase-4, examples]
---
# P4.5: Migrate example .stm files to backtick labels

Run satsuma fmt on all examples/*.stm files to convert 95+ single-quoted labels to backtick labels.

## Acceptance Criteria

- No single-quoted labels in any example file
- All examples parse cleanly
- satsuma validate passes on all examples
- satsuma fmt --check examples/ exits 0

