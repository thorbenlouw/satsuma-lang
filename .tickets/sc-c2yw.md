---
id: sc-c2yw
status: open
deps: []
links: []
created: 2026-03-20T16:04:01Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, schema]
---
# schema show misreads fragment_spread label (uses block_label instead of spread_label)

In schema.js line 102, the code looks for 'block_label' inside a fragment_spread node, but the tree-sitter grammar produces 'spread_label' as the child of fragment_spread. This means the spread name is never extracted and the output shows '...' with no label. Same bug pattern as existed in where-used.js (which already handles both spread_label and block_label as a fallback).

## Acceptance Criteria

1. `satsuma schema` output shows spread labels correctly (e.g. `...audit_fields` not just `...`)
2. A test covers fragment_spread rendering in schema output

