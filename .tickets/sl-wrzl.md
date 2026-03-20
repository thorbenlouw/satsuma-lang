---
id: sl-wrzl
status: open
deps: []
links: []
created: 2026-03-20T16:25:22Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fragment-spread]
---
# match-fields ignores fields from fragment spreads

The satsuma match-fields command does not include fields from fragment spreads when comparing source and target schemas. Fields that both schemas share via the same spread are not matched.

## Acceptance Criteria

Given two schemas that both spread ...address fields (containing street_line_1, city, etc.), running satsuma match-fields --source src --target tgt should show those spread fields as matched pairs. Currently they are completely absent from the output. The command should expand fragment spreads before comparing field lists.

