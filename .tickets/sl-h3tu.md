---
id: sl-h3tu
status: closed
deps: []
links: []
created: 2026-03-31T08:25:45Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fmt, exploratory-testing]
---
# parser-edge: fmt drops first comment in schema body (before first field)

The formatter (satsuma fmt) silently drops the first comment in a schema body when it appears before the first field declaration. This affects all comment types: //, //!, and //?.

Related to sl-a0wf (closed) which reported the same issue for 'satsuma schema' output. This ticket is specifically about fmt data loss.

Repro:
  echo 'schema test {
  //! Data quality warning
  a STRING
  //! Second warning
  b STRING
}' > /tmp/test.stm && npx satsuma fmt --diff /tmp/test.stm

Expected: both //! comments preserved
Actual: first //! comment before field 'a' is dropped; second //! comment before field 'b' is preserved. The pattern is consistent: the FIRST comment in a schema body is always dropped, all subsequent comments are preserved.

This is particularly dangerous for //! warning comments that document known data quality issues — fmt silently deletes them.

Fixture: /tmp/satsuma-test-parser-edge/44e-first-comment-all-types.stm


## Notes

**2026-03-31T11:22:50Z**

## Notes

**2026-03-31T12:00:00Z**

Cause: Tree-sitter places comments between { and the body node as children of the block, not the body. The formatter only iterated body.children, missing these gap comments.
Fix: Added collectBlockLeadingComments() helper and applied in all block formatters (schema, fragment, mapping, metric, transform, multi-line field).
