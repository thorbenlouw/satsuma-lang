---
id: sl-txbo
status: done
deps: []
links: [sl-zufn, sl-i4go]
created: 2026-03-26T13:54:57Z
type: bug
priority: 2
assignee: Thorben Louw
---
# LSP find-references: @refs and backtick refs in NL strings not indexed

Find All References does not find @ref or backtick references inside NL strings. Go-to-definition works for these (via tryNlRefContext() in definition.ts), but workspace-index.ts never walks NL string content to create reference entries.

## Acceptance Criteria

1. Find All References on a schema name includes @ref mentions in NL strings
2. Find All References on a schema name includes backtick mentions in NL strings
3. Find All References on a field includes @ref and backtick mentions

## Notes

**2026-03-26T14:30:00Z**

Cause: `workspace-index.ts` never walked NL string content to create reference entries, even though `definition.ts` had `tryNlRefContext()` for go-to-definition.
Fix: Added `indexNlRefs()` that walks all `nl_string` and `multiline_string` descendants in mapping bodies, extracts `@ref` and backtick references via regex, and registers them with context `"arrow"`. Added 5 workspace-index tests and 1 references integration test.

