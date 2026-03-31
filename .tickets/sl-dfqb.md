---
id: sl-dfqb
status: open
deps: []
links: []
created: 2026-03-31T08:32:07Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, consistency, exploratory-testing]
---
# consistency: mapping arrowCount does not match arrows array length for each/flatten blocks

Commands: satsuma mapping <name> --json
The arrowCount field in mapping JSON output counts recursive leaf arrows (including children of each/flatten blocks), but the arrows array is hierarchical — each/flatten blocks appear as a single entry with nested children.

This means arrowCount != arrows.length for any mapping containing each or flatten blocks. A JSON consumer that expects arrowCount to equal the length of the arrows array will get incorrect results.

Affected mappings across the corpus (5 total):
- cobol-to-avro / 'cobol customer to avro event': arrowCount=16 arrows.length=15
- filter-flatten-governance / 'order line facts': arrowCount=11 arrows.length=7
- json-api-to-parquet / 'order lines': arrowCount=14 arrows.length=7
- sap-po-to-mfcs / 'sap po to mfcs': arrowCount=14 arrows.length=8
- xml-to-parquet / 'order lines': arrowCount=14 arrows.length=7

The original bug cbh-zdk3 fixed double-counting of the container itself, but the semantic mismatch remains: arrowCount counts leaves while arrows[] is a tree.

Either arrowCount should equal arrows.length (counting containers but not their children), or there should be two fields (e.g., arrowCount for top-level, leafArrowCount for recursive total).

