---
id: lsp-tze4
status: open
deps: [lsp-pqbu]
links: []
created: 2026-03-25T17:36:08Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-4, cli]
---
# P4.3: Update CLI extraction and formatter for backtick labels

Update labelText() in extract.ts and format.ts to handle backtick_name only (no quoted_name).

## Acceptance Criteria

- labelText() handles identifier and backtick_name only
- Formatter renders labels with backticks (not single quotes)
- satsuma fmt auto-converts 'label' to `label` for migration
- CLI tests pass

