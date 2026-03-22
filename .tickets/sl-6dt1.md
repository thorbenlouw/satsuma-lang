---
id: sl-6dt1
status: closed
deps: [sl-9uh0]
links: []
created: 2026-03-22T07:44:29Z
type: bug
priority: 1
assignee: Thorben Louw
parent: sl-3alz
tags: [cli, graph, exploratory-testing-2]
---
# graph: last nested list arrow reported as derived with from:null

In graph --json output, the last arrow inside a nested list mapping (e.g., Items[] -> items[]) is reported with "from": null and "derived": true, even when it has a named source field.

## Reproduction

Run: `satsuma graph examples/sap-po-to-mfcs.stm --json`

Look at the nested arrows for Items[] -> items[]:
- .EBELP -> .referenceLine — correctly resolved as sap_purchase_order.Items[].EBELP
- .MATNR -> .item — correctly resolved
- .MENGE -> .orderedQty — correctly resolved
- .EINDT -> .needByDate — correctly resolved
- .TXZ01 -> .description { trim | max_length(250) } — WRONG: from=null, derived=true

Expected: from="sap_purchase_order.Items[].TXZ01", derived=false
Actual: from=null, derived=true

Only the last nested arrow in the block is affected. All preceding siblings are correctly resolved.

## Root cause

Likely related to the nested arrow bare children contamination bug (see sibling ticket) — the last arrow's source is consumed by the preceding arrow's target text.


## Notes

**2026-03-22T08:10:29Z**

**2026-03-22T08:18:00Z**

Cause: Downstream effect of sl-9uh0 — the grammar's relative_field_path rule consumed dots across newlines, causing the last bare arrow's source to be merged into the preceding arrow's target text. This made the last arrow appear as derived with from:null.
Fix: Grammar fix in grammar.js — use token.immediate(".") for path continuation dots so paths cannot span lines. (Same commit as sl-9uh0 fix)
