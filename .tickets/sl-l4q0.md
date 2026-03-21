---
id: sl-l4q0
status: open
deps: []
links: [sl-4m85]
created: 2026-03-21T08:04:59Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, mapping, exploratory-testing]
---
# mapping: backtick-quoted field names retain backticks in JSON src/tgt values

When a field name is backtick-quoted in the source (e.g. \`Special-Field!\`), the `mapping --json` output retains the backticks in the `src` value, while regular field names do not have any quoting.

**What I did:**
```bash
satsuma mapping 'mixed transforms' /tmp/satsuma-test-mapping/ --json
```

**Expected:** Backticks should be stripped from field names in JSON output, yielding `"src": "Special-Field!"`.

**Actual:**
```json
{"kind": "map", "src": "\`Special-Field!\`", "tgt": "special_out", "hasTransform": true}
```
The backticks are part of the value string. Consumers must check for and strip backticks when processing JSON, which is inconsistent with regular field names that appear bare.

For comparison, the `arrows` command strips backticks:
`satsuma arrows 'sfdc_opportunity.ARR_Override__c' examples/` shows the field without backticks.

**Test file:** /tmp/satsuma-test-mapping/edge-cases.stm (mixed transforms mapping)

