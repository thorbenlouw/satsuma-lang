---
id: sl-ari1
status: closed
deps: []
links: [sl-armj]
created: 2026-03-21T08:00:18Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, mapping, exploratory-testing]
---
# mapping: --json output missing transform body content on arrows

The `satsuma mapping --json` output does not include the actual transform body text for arrows. Each arrow only has `hasTransform: true/false` but no field containing the transform pipeline or NL string.

**What I did:**
```bash
satsuma mapping 'basic test' /tmp/satsuma-test-mapping/ --json
```

**Expected:** Arrow objects with transforms should include the transform body text, e.g.:
```json
{"src": "name", "tgt": "display_name", "hasTransform": true, "transform": "trim | title_case"}
```

**Actual:** Arrow objects only have `kind`, `src`, `tgt`, `hasTransform`. No transform content at all:
```json
{"kind": "map", "src": "name", "tgt": "display_name", "hasTransform": true}
```

This means the JSON output loses all transform information. Agents processing the JSON cannot see what transforms are applied without falling back to the text output or calling `satsuma arrows` per field.

**Test file:** /tmp/satsuma-test-mapping/basic.stm


## Notes

**2026-03-22T02:00:00Z**

Cause: Arrow JSON serialization didn't include transform text.
Fix: Arrows with transforms now include a 'transform' field containing the pipe_chain text (commit bd37aa4).
