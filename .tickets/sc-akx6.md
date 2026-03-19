---
id: sc-akx6
status: closed
deps: [sc-c09h]
links: [sc-81p5, sc-gokg, sc-mbc5, sc-aij8, sc-jais]
created: 2026-03-19T18:43:44Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [stm-cli, arrows, nl-refs]
---
# stm arrows: include NL backtick field refs as implicit arrows

Extend stm arrows to surface field references found in NL backtick blocks. When a transform body says '"Lookup `full_name` from `source::hr_employees`"', that's an implicit arrow from source::hr_employees.full_name to the target field. These should appear in arrows output, classified as 'nl-derived' rather than 'direct' or 'transform'.

## Acceptance Criteria

- NL-derived arrows appear in stm arrows output for the relevant fields
- Classification is 'nl-derived' to distinguish from structural arrows
- --as-source and --as-target filters apply to NL-derived arrows
- JSON output includes NL arrow metadata
- Tests with ns-merging.stm as fixture

