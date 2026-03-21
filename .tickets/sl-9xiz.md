---
id: sl-9xiz
status: open
deps: []
links: []
created: 2026-03-21T08:00:09Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, mapping, exploratory-testing]
---
# mapping: arrow metadata (note) not shown in text or JSON output

Metadata on arrows (e.g. `(note "...")`) is silently dropped from both text and JSON output of `satsuma mapping`.

**What I did:**
```bash
satsuma mapping 'sap po to mfcs' examples/
```

**Expected:** The nested arrow `Items[] -> items[] (note "One MFCS target line per SAP purchase order item.") { ... }` should show its metadata.

**Actual:** Output shows `Items[] -> items[]` with no metadata. The `(note ...)` is completely dropped.

Also tested with a custom fixture:
```bash
satsuma mapping 'mixed transforms' /tmp/satsuma-test-mapping/
```
The arrow `first_name -> full_name (note "Concatenated with last_name") { trim | title_case }` renders as `first_name -> full_name { trim | title_case }` — metadata dropped.

In JSON output, arrow objects have no metadata field at all.

**Test files:**
- examples/sap-po-to-mfcs.stm (line 148)
- examples/edi-to-json.stm (line 139)
- /tmp/satsuma-test-mapping/edge-cases.stm (mixed transforms mapping)

