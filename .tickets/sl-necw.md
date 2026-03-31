---
id: sl-necw
status: open
deps: []
links: []
created: 2026-03-31T08:31:36Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fmt, exploratory-testing]
---
# fmt: drops first-child comments in nested record bodies

The formatter (satsuma fmt) drops comments that appear as the first child inside nested record { } blocks within schemas. This is the same root cause as sl-h3tu (schema body first-comment drop) but extends to nested levels.

Repro:
  echo 'schema nested_test {
  id INT (pk)
  address record {
    // Street address components
    street STRING(200)
    city STRING(100)
  }
}' | npx satsuma fmt --stdin

Expected: comment '// Street address components' preserved
Actual: comment silently dropped

Also affects list_of record bodies and deeply nested record-in-record structures.

Fixture: /tmp/satsuma-test-fmt-semantic/originals/24-nested-record-comments.stm

