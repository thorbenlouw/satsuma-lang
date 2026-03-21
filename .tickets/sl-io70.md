---
id: sl-io70
status: open
deps: [sl-cdvp]
links: [sl-xh3b]
created: 2026-03-21T07:58:42Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, find, exploratory-testing]
---
# find: output omits field type and full metadata from results

The `satsuma find --tag` command output (both text and JSON) does not include the field's type or full metadata list, making it less useful for downstream consumers.

**What I did:**
```
satsuma find --tag pii /tmp/satsuma-test-find/diverse-tags.stm
satsuma find --tag pii /tmp/satsuma-test-find/diverse-tags.stm --json
```

**What I expected:**
Each result should show the field's type and full metadata, not just the matched tag. For example, for a field defined as `email STRING (pii, format email, required)`:
- Text: should show `email  STRING  [pii, format email, required]`
- JSON: should include `"type": "STRING"` and `"metadata": ["pii", "format email", "required"]`

**What actually happened:**
Text output only shows the matched tag in brackets:
```
schema tag_test  (/tmp/satsuma-test-find/diverse-tags.stm)
  email                   [pii]  line 6
```

JSON output only includes the matched tag, with no type or metadata:
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

Missing type and full metadata reduces the value of find results — consumers must make follow-up `satsuma meta` calls to get the complete picture.

**Test fixture:** /tmp/satsuma-test-find/diverse-tags.stm (line 6: `email STRING (pii, format email, required)`)

