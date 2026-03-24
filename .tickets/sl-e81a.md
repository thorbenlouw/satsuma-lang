---
id: sl-e81a
status: closed
deps: []
links: []
created: 2026-03-24T08:13:47Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fields]
---
# fields --unmapped-by does not recognize arrows inside each/flatten blocks

When arrows are inside an `each` or `flatten` block, the `--unmapped-by` flag does not recognize them. Fields mapped inside these blocks still appear as unmapped.

Repro:
```bash
satsuma fields ledger_entry --unmapped-by 'pacs008 to ledger' bug-hunt/
# Shows 18 'unmapped' fields including amount, currency, value_date etc.
# But these ARE mapped inside: each CdtTrfTxInf -> ledger_entry {
#   .IntrBkSttlmAmt.Value -> .amount
#   .IntrBkSttlmAmt.Ccy -> .currency
#   .IntrBkSttlmDt -> .value_date
#   ... etc
# }
```

Only arrows outside the `each` block (instructing_agent_bic, instructed_agent_bic, end_to_end_id, original_msg_id, created_at) are correctly recognized as mapped.

Same issue likely affects `flatten` blocks (e.g. xml-to-parquet.stm order lines mapping).

## Acceptance Criteria

1. Arrows inside `each` blocks are recognized as mapping the target field
2. Arrows inside `flatten` blocks are recognized similarly
3. Both dot-prefixed paths (`.field -> .target`) and full paths are handled
4. Test with the existing xml-to-parquet.stm example's flatten block

