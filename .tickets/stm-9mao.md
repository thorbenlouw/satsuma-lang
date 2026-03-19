---
id: stm-9mao
status: closed
deps: []
links: []
created: 2026-03-19T12:04:37Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespaces, fields]
---
# fields --unmapped-by broken with namespace-scoped mappings

The `stm fields --unmapped-by` filter returns ALL fields instead of only unmapped fields when the mapping is inside a namespace block.

Reproduce:
```bash
stm fields 'mart::dim_contact' --unmapped-by 'build dim_contact' examples/ns-platform.stm
# Output: all 8 fields including contact_sk, contact_bk, full_name, email, company
# Expected: only 3 unmapped fields — is_current, valid_from, valid_to
```

The mapping `mart::build dim_contact` maps 5 of 8 target fields:
- contact_bk -> contact_bk (direct)
- -> contact_sk (computed)
- -> full_name (computed)
- -> email (computed)
- -> company (computed)

So only `is_current`, `valid_from`, and `valid_to` should be returned.

The same feature works correctly without namespaces:
```bash
stm fields analytics_db --unmapped-by 'crm to analytics' examples/multi-source-hub.stm
# Output: total_spent, transaction_count, last_transaction_date  <-- correct
```

Root cause is likely that the unmapped filter can't resolve the mapping name to its arrows when the mapping is inside a namespace — either the mapping lookup fails silently or the arrow target fields aren't matched against the schema fields.

## Acceptance Criteria

1. `stm fields 'mart::dim_contact' --unmapped-by 'build dim_contact' examples/ns-platform.stm` returns only `is_current`, `valid_from`, `valid_to`.
2. Using the namespace-qualified mapping name (`--unmapped-by 'mart::build dim_contact'`) also works.
3. `stm fields 'staging::stg_employees' --unmapped-by 'stage employees' examples/ns-merging.stm` returns only `is_active` (the one computed/NL field without a direct source mapping).
4. Non-namespaced --unmapped-by continues to work correctly.

