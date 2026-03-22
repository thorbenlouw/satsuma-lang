---
id: sc-1ar0
status: closed
deps: []
links: []
created: 2026-03-22T21:30:06Z
type: bug
priority: 1
assignee: Thorben Louw
---
# mapping: flatten/each block arrows silently dropped from text and JSON output

The mapping command completely omits arrows inside flatten and each blocks from both text and JSON output.

Repro:
  satsuma mapping 'order line facts' examples/filter-flatten-governance.stm
  satsuma mapping 'order line facts' examples/filter-flatten-governance.stm --json

Expected: All 12 arrows shown (including 5 flatten inner arrows + 1 container arrow).
Actual: Only 6 non-flatten arrows shown. The entire flatten block is silently dropped.

The --json output reports arrowCount: 12 but the arrows array contains only 6 entries — the count is computed correctly but the arrows are not serialized.

Same issue for each blocks: a mapping with only each arrows shows arrowCount: 2 but arrows: [].

This also causes fields --unmapped-by to produce false positives for flatten-mapped fields.


## Notes

**2026-03-22T22:11:20Z**

Cause: collectArrows() and printDefault() only handled map_arrow, computed_arrow, nested_arrow — missing flatten_block and each_block. Fix: added flatten/each handling to collectArrows(), new printBlockNode() for text output.
