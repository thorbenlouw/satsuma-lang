---
id: sl-ztet
status: open
deps: []
links: []
created: 2026-03-31T08:26:45Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fmt, exploratory-testing]
---
# parser-edge: fmt drops first comment in mapping body (before source block)

The formatter (satsuma fmt) drops the first comment in a mapping body when it appears before the source block. Subsequent comments between arrows are preserved.

Repro:
  echo 'schema s { a STRING }
schema t { b STRING }
mapping {
  // First comment before source block
  source { s }
  target { t }
  a -> b
}' > /tmp/test.stm && npx satsuma fmt --diff /tmp/test.stm

Expected: comment '// First comment before source block' preserved
Actual: comment silently dropped

This is the same family as sl-h3tu (schema body first-comment drop) and also affects fragment bodies.

Fixture: /tmp/satsuma-test-parser-edge/52-mapping-body-first-comment.stm

