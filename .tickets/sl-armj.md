---
id: sl-armj
status: closed
deps: [sl-cdvp]
links: [sl-rbvk, sl-pq65, sl-s8xn, sl-5pa2, sl-shwl, sl-ari1, sl-0x23, sl-x8yp, sl-09bo, sl-i1b8, sl-xifk, sl-se2f, sl-tkex]
created: 2026-03-21T21:53:02Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [cli, json-output]
---
# Epic: JSON output missing data

JSON output across multiple commands omits important fields like metadata, namespace, classification, transform bodies.


## Notes

**2026-03-22T02:00:00Z**

Cause: Multiple commands omitted metadata, namespace, classification, and other fields from JSON output.
Fix: Systematic enrichment of JSON output across schema, metric, mapping, and summary commands (commit 51d92a5).
