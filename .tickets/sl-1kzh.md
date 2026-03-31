---
id: sl-1kzh
status: closed
deps: []
links: []
created: 2026-03-31T08:26:42Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fmt, exploratory-testing]
---
# parser-edge: fmt drops ALL comments from metric bodies

The formatter (satsuma fmt) silently drops ALL comments from metric body blocks — both the first and subsequent comments are removed. This is more severe than the schema/fragment first-comment-only bug (sl-h3tu).

Repro:
  echo 'schema orders { total INT }
metric test_metric (source orders) {
  // First comment in metric body
  total INT
  // Second comment
}' > /tmp/test.stm && npx satsuma fmt --diff /tmp/test.stm

Expected: both comments preserved
Actual: both comments dropped, only 'total INT' remains in formatted output

Fixture: /tmp/satsuma-test-parser-edge/51-metric-first-comment.stm


## Notes

**2026-03-31T11:23:04Z**

## Notes

**2026-03-31T12:00:00Z**

Cause: Tree-sitter places comments between { and the body node as children of the block, not the body. The formatter only iterated body.children, missing these gap comments.
Fix: Added collectBlockLeadingComments() and collectBlockTrailingComments() calls in all block formatters. Same root cause and fix as sl-h3tu.
