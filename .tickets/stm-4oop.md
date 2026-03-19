---
id: stm-4oop
status: closed
deps: []
links: []
created: 2026-03-19T12:04:24Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespaces, where-used]
---
# where-used fails to find fragment spreads and transform references inside namespaces

The `stm where-used` command does not detect references to global fragments or transforms when those references occur inside namespace blocks. It also has incomplete results for schema references.

Reproduce with `examples/ns-platform.stm`:

**Fragment spreads not tracked:**
```bash
stm where-used standard_metadata examples/ns-platform.stm
# Output: No references to 'standard_metadata' found.
# Expected: 7 references — the fragment is spread (...standard_metadata) in:
#   raw::crm_contacts, raw::crm_deals, raw::erp_invoices,
#   vault::hub_contact, vault::sat_contact_details, vault::hub_deal,
#   vault::link_contact_deal
```

**Transform references not tracked:**
```bash
stm where-used dv_hash_key examples/ns-platform.stm
# Output: No references to 'dv_hash_key' found.
# Expected: 5 references — used in transform bodies of:
#   vault::load hub_contact (2x), vault::load sat_contact,
#   vault::load hub_deal, vault::load link_contact_deal (2x)

stm where-used normalize_email examples/ns-platform.stm
# Output: No references to 'normalize_email' found.
# Expected: 1 reference in vault::load sat_contact
```

**Incomplete schema references:**
```bash
stm where-used hub_contact examples/ns-platform.stm
# Output: 1 reference (mart::build dim_contact)
# Missing: vault::load hub_contact targets hub_contact,
#   vault::sat_contact_details refs hub_contact.contact_hk,
#   vault::link_contact_deal refs hub_contact.contact_hk
```

The underlying issue is likely that the reference scanner only looks at top-level definitions and doesn't descend into namespace block children.

## Acceptance Criteria

1. `stm where-used standard_metadata examples/ns-platform.stm` returns all 7 fragment spread references inside namespace blocks.
2. `stm where-used dv_hash_key examples/ns-platform.stm` returns all transform invocations inside namespace mappings.
3. `stm where-used normalize_email examples/ns-platform.stm` returns the reference in `vault::load sat_contact`.
4. `stm where-used hub_contact examples/ns-platform.stm` returns all mapping source/target references AND field-level ref references.
5. Both qualified (`vault::hub_contact`) and unqualified (`hub_contact`) queries find the same references.
6. Non-namespaced where-used continues to work correctly.

