---
id: sl-p7nj
status: closed
deps: []
links: []
created: 2026-03-24T08:13:35Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, arrows]
---
# arrows text output says '0 arrows' for nested fields that have arrows

The text output of `satsuma arrows` shows '0 arrows ()' in the header even when arrows are found and displayed below. This happens for fields inside nested records.

Repro:
```bash
satsuma arrows pacs008.Ccy bug-hunt/
# Output:
# pacs008.Ccy — 0 arrows ()     ← WRONG: says 0
#
#   mapping 'pacs008 to ledger':
#     CdtTrfTxInf.IntrBkSttlmAmt.Ccy -> ledger_entry.currency ...  ← 1 arrow found

satsuma arrows pacs008.BIC bug-hunt/
# pacs008.BIC — 0 arrows ()     ← WRONG: says 0
# ... lists 7 arrows below
```

The JSON output (`--json`) correctly returns the arrows. Only the text header count is wrong.

## Acceptance Criteria

1. Text output header shows correct arrow count for nested fields
2. Count matches the number of arrows actually listed in the output
3. Works for leaf fields at various nesting depths


## Notes

**2026-03-24T08:21:20Z**

Additional inconsistency: `arrows ledger_entry.currency` shows '2 arrows (2 as source, 1 as target)' in the header but lists 3 arrows below (including 1 NL-derived). The parenthetical counts (2+1=3) don't match the main count (2). Either the main count excludes NL-derived arrows without saying so, or the count is wrong.
