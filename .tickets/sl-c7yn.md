---
id: sl-c7yn
status: open
deps: []
links: [sl-xh3b]
created: 2026-03-21T07:58:49Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, warnings, exploratory-testing]
---
# warnings: JSON output lacks block context (schema/mapping/metric name)

The `satsuma warnings --json` output includes only `text`, `row`, and `file` for each item, but does not indicate which block (schema, mapping, metric) the comment belongs to. This makes it harder for agents and tooling to understand the context of a warning.

Other commands like `satsuma find --tag --json` include `block` and `blockType` fields that provide this context.

**What I did:**
```
satsuma warnings --json /tmp/satsuma-test-warnings/basic-warnings.stm
```

**Expected:** Each JSON item should include context fields like `block` (e.g. 'source_system') and `blockType` (e.g. 'schema', 'mapping', 'metric'), similar to `find --tag --json`.

**Actual output (truncated):**
```json
{
  "kind": "warning",
  "count": 9,
  "items": [
    {
      "text": "This is a file-level warning",
      "row": 1,
      "file": "/tmp/satsuma-test-warnings/basic-warnings.stm"
    },
    {
      "text": "Primary key may not be unique",
      "row": 5,
      "file": "/tmp/satsuma-test-warnings/basic-warnings.stm"
    }
  ]
}
```

Item keys are only: ['file', 'row', 'text']. Compare with `find --tag --json` which returns: ['block', 'blockType', 'field', 'file', 'row', 'tag'].

For file-level comments (not inside any block), the context could be null or 'file'.

**Repro file:** /tmp/satsuma-test-warnings/basic-warnings.stm

