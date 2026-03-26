---
id: lsp-6agr
status: closed
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


## Notes

**2026-03-26T01:17:00Z**

**2026-03-26T16:30:00Z**

Cause: nl-ref-extract only scanned for backtick references; @ref syntax was not detected.
Fix: Added @ref regex pattern (AT_REF_RE) that extracts @identifier, @schema.field, @ns::schema.field, and @`backtick`.field from NL strings. Backtick extraction kept as backward-compatible fallback (skips ranges already covered by @refs). CST-level at_ref nodes in pipe_text are available for future direct extraction.
