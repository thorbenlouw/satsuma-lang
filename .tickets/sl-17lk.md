---
id: sl-17lk
status: open
deps: []
links: []
created: 2026-03-31T08:31:26Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fmt, exploratory-testing]
---
# fmt: drops first and trailing comments in transform bodies

The formatter (satsuma fmt) silently drops BOTH the first and trailing comments inside transform body blocks. This is distinct from sl-h3tu (schema body) and sl-1kzh (metric body) as transform bodies use pipe_chain rather than schema_body or metric_body.

Repro:
  echo 'transform with_comments {
  // Comment before first pipe step
  trim | lowercase
  // Trailing comment
}' | npx satsuma fmt --stdin

Expected: both comments preserved
Actual: both comments dropped, only 'trim | lowercase' remains

Fixture: /tmp/satsuma-test-fmt-semantic/originals/33-transform-comments.stm

