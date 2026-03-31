---
id: sl-1cn3
status: closed
deps: []
links: []
created: 2026-03-31T08:23:33Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, parser, exploratory-testing]
---
# parser-edge: empty backtick identifier is accepted as valid field name

An empty backtick identifier (``) is accepted by the parser as a valid field name. The field shows up with an empty name in 'satsuma fields' output and can even be queried via 'satsuma meta'.

Repro:
  echo 'schema bt_test { `` STRING }' > /tmp/test.stm && npx satsuma validate /tmp/test.stm

Expected: parse error or validation error — an empty identifier has no semantic meaning
Actual: validates clean, 'satsuma fields bt_test' shows a field with empty name, 'satsuma meta bt_test.' returns type: STRING

Fixture: /tmp/satsuma-test-parser-edge/29-backtick-edge.stm

