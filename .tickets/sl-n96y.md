---
id: sl-n96y
status: open
deps: []
links: [sl-m02g]
created: 2026-03-21T07:58:35Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, find, exploratory-testing]
---
# find: JSON output uses 0-indexed row while text output uses 1-indexed line numbers

The `satsuma find --tag` command produces inconsistent line number indexing between text and JSON output modes.

**What I did:**
```
satsuma find --tag pii /tmp/satsuma-test-find/diverse-tags.stm
satsuma find --tag pii /tmp/satsuma-test-find/diverse-tags.stm --json
```

**What I expected:**
The line/row number should be consistent between text and JSON output. Both should use 1-indexed line numbers matching actual file lines.

**What actually happened:**
Text output shows `line 6` for the `email` field (correct, matches file line 6).
JSON output shows `"row": 5` for the same field (0-indexed, off by one from the file line).

Text output:
```
schema tag_test  (/tmp/satsuma-test-find/diverse-tags.stm)
  email                   [pii]  line 6
```

JSON output:
```json
{
  "blockType": "schema",
  "block": "tag_test",
  "field": "email",
  "tag": "pii",
  "file": "/tmp/satsuma-test-find/diverse-tags.stm",
  "row": 5
}
```

The file has `email` on line 6 (1-indexed). Text says line 6 (correct). JSON says row 5 (0-indexed). This inconsistency can confuse downstream consumers.

**Test fixture:** /tmp/satsuma-test-find/diverse-tags.stm

