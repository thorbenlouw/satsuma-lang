---
id: sl-emra
status: open
deps: []
links: []
created: 2026-03-31T08:27:56Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate/lint: canonical examples/ directory produces errors when validated as workspace

Running `satsuma validate examples/` on the canonical example corpus produces 10 duplicate-definition errors because independent example files (in different subdirectories) reuse common schema names like crm_customers, dim_customer, order_headers_parquet, etc.

Additionally, two individual example subdirectories produce warnings when validated alone:
- examples/multi-source/: 'Schema customer_360 spreads undefined fragment audit columns'
- examples/sfdc-to-snowflake/: 'Mapping opportunity ingestion references undefined source fx_spot_rates'

The examples/ directory is the 'canonical example corpus' per CLAUDE.md and should pass clean validation. Either:
1. The examples need to be updated to avoid cross-file name collisions (e.g., via namespaces)
2. Validate should support per-subdirectory scoping
3. The incomplete references in multi-source/ and sfdc-to-snowflake/ should be fixed

## Notes

**2026-03-31**

Resolution: this is not a CLI correctness bug in itself, but the usage expectation needs documenting. `examples/` is a corpus containing many independent example workspaces, so validating that top-level directory as one workspace will surface expected duplicate names. Per ADR-022, directory mode is being removed and example workspaces should be validated through explicit entry files such as `examples/sfdc-to-snowflake/pipeline.stm`. The two individual workspace warnings (multi-source, sfdc-to-snowflake) should still be investigated separately.
