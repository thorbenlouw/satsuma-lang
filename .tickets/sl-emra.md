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

Resolution: this is not a bug. Per ADR-022, all CLI commands operate on a file entry point and build the workspace by following that file's import graph transitively. `satsuma validate examples/` is not a valid operation — there is no directory-level mode. Each example subdirectory should have an entry file (or each .stm file can be validated individually). The duplicate-definition errors are an artifact of the old directory-merging behaviour which is being removed. The two individual file warnings (multi-source, sfdc-to-snowflake) should still be investigated separately.

