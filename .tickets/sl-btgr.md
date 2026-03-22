---
id: sl-btgr
status: closed
deps: []
links: [sl-9xiz, sl-6ctd, sl-in1y, sl-531q]
created: 2026-03-21T21:53:18Z
type: epic
priority: 2
assignee: Thorben Louw
tags: [cli, arrows, meta]
---
# Epic: Metadata/arrow visibility

Arrow-level metadata not shown/queryable, arithmetic transforms misclassified.


## Notes

**2026-03-22T02:00:00Z**

Cause: Arrow-level and mapping-level metadata were not exposed in CLI output.
Fix: Systematically surfaced metadata at arrow, mapping, and field levels across text and JSON output (commit cf955f7).
