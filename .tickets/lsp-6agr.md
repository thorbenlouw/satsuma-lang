---
id: lsp-6agr
status: open
deps: [lsp-vm73]
links: []
created: 2026-03-25T17:29:21Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-3, cli]
---
# P3.8: Switch nl-ref-extract.ts to @ref extraction

Replace backtick regex scanning with @ref extraction. Scan for @identifier, @backtick_name, and @dotted.path patterns in NL text.

## Acceptance Criteria

- @ref mentions extracted from NL strings and pipe text
- Bare backticks in NL are ignored (cosmetic only)
- @ref with backtick segments works: @`order-headers`.status
- Extraction tests updated and passing

