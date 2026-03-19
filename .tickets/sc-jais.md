---
id: sc-jais
status: closed
deps: [sc-c09h]
links: [sc-81p5, sc-gokg, sc-mbc5, sc-aij8, sc-akx6]
created: 2026-03-19T18:43:31Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [stm-cli, lineage, nl-refs]
---
# stm lineage: include NL backtick refs as field-level edges

Extend stm lineage to treat backtick references in NL transform bodies as lineage edges. Currently lineage only follows structural arrows (source_field -> target_field). NL blocks like '"Lookup department from `source::hr_employees` using `posted_by` -> `employee_id`"' contain implicit field-level lineage that should appear in the graph. These edges should be marked as NL-derived so consumers can distinguish them from structural arrows.

## Acceptance Criteria

- NL backtick schema refs create schema-level lineage edges
- NL backtick field refs create field-level lineage edges
- NL-derived edges are flagged (e.g. edge.source = 'nl') to distinguish from structural arrows
- stm lineage --from and --to follow NL-derived edges
- JSON output includes NL edges with source location
- Tests covering: cross-namespace NL refs, field-level NL refs, mixed structural + NL lineage

