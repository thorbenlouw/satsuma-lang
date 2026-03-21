---
id: sl-ij5p
status: open
deps: []
links: []
created: 2026-03-21T08:00:02Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, mapping, exploratory-testing]
---
# mapping: unnamed mapping returns empty arrows array in all output modes

When retrieving an unnamed (anonymous) mapping by its `<anon>@file:line` reference, both text and JSON output fail to include the actual arrows.

**What I did:**
```bash
satsuma mapping '<anon>@/tmp/satsuma-test-mapping/basic.stm:49' /tmp/satsuma-test-mapping/ --json
```

**Expected:** JSON output with `arrowCount: 2` and 2 arrows in the `arrows` array. Text output showing the arrows.

**Actual JSON:**
```json
{
  "name": null,
  "sources": ["source_basic"],
  "targets": ["target_basic"],
  "arrowCount": 2,
  "arrows": [],
  "file": "/tmp/satsuma-test-mapping/basic.stm",
  "row": 49
}
```
`arrowCount` says 2 but `arrows` is empty.

**Actual text:**
```
mapping {
  source { source_basic }
  target { target_basic }
  // 2 arrows
}
```
Shows `// 2 arrows` comment instead of the actual arrows.

**`--arrows-only` output:** Shows `source_basic -> target_basic` (schema-level) instead of field-level arrows.

**Test file:** /tmp/satsuma-test-mapping/basic.stm (line 49)

