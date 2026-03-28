---
id: sl-3ccy
status: open
deps: []
links: []
created: 2026-03-28T18:36:03Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [parser, grammar, tree-sitter, spreads, bug]
---
# bug: tree-sitter grammar consumes field declarations after ...spread as part of fragment name

The tree-sitter grammar for schema_body incorrectly parses field declarations that appear after a spread declaration as part of the spread's fragment name.

Example:
  schema s1 {
    ...f
    extra x
  }

Observed (satsuma validate):
  "Schema 's1' spreads undefined fragment 'f extra x'"

The parser treats 'f extra x' as the fragment name rather than parsing ...f as a spread of fragment f and extra x as a separate field declaration.

This means any schema that uses a spread and also declares additional fields after it will have all those inline fields silently consumed into the spread node. The issue persists regardless of whether the spread and field are on the same line or separate lines.

## Acceptance Criteria

- schema s1 { ...f\n  extra x } correctly parses as: spread of fragment 'f' + field declaration 'extra' of type x
- satsuma validate reports no error for this construct
- satsuma arrows s1.extra (for an inline field after a spread) returns the correct arrow
- Corpus test added covering spread + inline field in same schema body
- Smoke test test_09_inline_field_after_spread_not_found updated to expect exit 0

