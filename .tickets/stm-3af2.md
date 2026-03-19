---
id: stm-3af2
status: closed
deps: []
links: [stm-ku9i]
created: 2026-03-19T12:03:58Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, namespaces, lineage]
---
# lineage --to completely broken with namespace-qualified schemas

The `stm lineage --to` command fails to trace any upstream lineage for namespace-qualified schemas. It returns only the target schema itself with no parent chain.

Reproduce:
```bash
stm lineage --to 'mart::fact_revenue' examples/ns-platform.stm
# Output: mart::fact_revenue       <-- no upstream trace

stm lineage --to 'staging::stg_gl_entries' examples/ns-merging.stm
# Output: staging::stg_gl_entries  <-- no upstream trace
```

The same command works correctly for non-namespaced schemas:
```bash
stm lineage --to analytics_db examples/multi-source-hub.stm
# Output: crm_system -> crm to analytics -> analytics_db    <-- correct
```

Root cause is likely that the reverse-lineage graph lookup uses unqualified target names from the index (same root cause as the --from unqualified target bug stm-ku9i), so the qualified name passed by the user never matches any graph entry.

## Acceptance Criteria

1. `stm lineage --to 'mart::fact_revenue' examples/ns-platform.stm` traces upstream through `mart::build fact_revenue` to source `raw::erp_invoices`.
2. `stm lineage --to 'mart::dim_contact' examples/ns-platform.stm` traces upstream through `mart::build dim_contact` to `vault::hub_contact`, and further to `vault::load hub_contact` from `raw::crm_contacts`.
3. `stm lineage --to 'staging::stg_gl_entries' examples/ns-merging.stm` traces upstream through `staging::stage gl entries` to `source::finance_gl`.
4. JSON output includes the full upstream chain with namespace-qualified node names.
5. Non-namespaced lineage --to continues to work as before.

