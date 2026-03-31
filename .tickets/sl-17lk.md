---
id: sl-17lk
status: closed
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


## Notes

**2026-03-31T11:23:04Z**

## Notes

**2026-03-31T12:00:00Z**

Cause: Tree-sitter places comments between { and the body node as children of the block, not the body. The formatter only iterated body.children, missing these gap comments.
Fix: Added collectBlockLeadingComments() and collectBlockTrailingComments() calls in all block formatters. Same root cause and fix as sl-h3tu.
