---
id: sl-ezpm
status: open
deps: []
links: []
created: 2026-03-21T08:03:42Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, mapping, exploratory-testing]
---
# mapping: arrowCount includes nested child arrows but arrows array does not

In `mapping --json` output, the `arrowCount` field counts child arrows inside nested arrow blocks, but the `arrows` array does not include them. This creates an inconsistency where `arrowCount` != `arrows.length`.

**What I did:**
```bash
satsuma mapping 'edi to mfcs' examples/ --json
```

**Expected:** `arrowCount` should match `arrows.length`, or the nested child arrows should be included.

**Actual:**
- 'cobol customer to avro event': arrowCount=17, actual arrows=15 (2 child arrows missing)
- 'edi to mfcs': arrowCount=12, actual arrows=8 (4 child arrows missing)
- 'sap po to mfcs': arrowCount=15, actual arrows=8 (7 child arrows missing)

The child arrows inside nested blocks are counted in `arrowCount` but not included in the `arrows` array. This is related to but distinct from the nested arrow children being missing from output — even if they're intentionally excluded, the count should match.

**Test files:**
- examples/edi-to-json.stm
- examples/sap-po-to-mfcs.stm
- examples/cobol-to-avro.stm

