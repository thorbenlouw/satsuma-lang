---
id: sl-wjb9
status: open
deps: []
links: [sl-z4ya]
created: 2026-03-21T07:59:45Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, mapping, exploratory-testing]
---
# mapping: nested arrow child arrows missing from output

The `satsuma mapping` command drops all child arrows inside nested arrow blocks (array mappings). Both text and JSON output show only the outer arrow, losing all child mappings.

**What I did:**
```bash
satsuma mapping 'edi to mfcs' examples/ --json
```

**Expected:** The nested arrow `POReferences[] -> ShipmentHeader.asnDetails[]` should include its 4 child arrows (e.g. `.REFNUM -> .orderNo`, `LineItems[] -> .items[]`, etc.).

**Actual:** JSON reports `arrowCount: 12` but only returns 8 arrows. The 4 child arrows inside the nested block are counted in `arrowCount` but not present in the `arrows` array. Text output shows only `POReferences[] -> ShipmentHeader.asnDetails[]` with no children.

Same issue in SAP mapping: `arrowCount: 15` but only 8 arrows returned (7 child arrows missing).

Also reproducible with `satsuma mapping 'cobol customer to avro event' examples/` — the `PHONE_NUMBERS[] -> contact_info.phones[]` block has 2 child arrows that are completely lost.

**Affected files:**
- examples/edi-to-json.stm (lines 139-161)
- examples/sap-po-to-mfcs.stm (lines 148-188)
- examples/cobol-to-avro.stm (lines 155-169)
- /tmp/satsuma-test-mapping/edge-cases.stm (nested arrays mapping)

