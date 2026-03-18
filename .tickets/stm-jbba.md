---
id: stm-jbba
status: closed
deps: [stm-ohgr, stm-j51n]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 7: Metric blocks

Parse metric <label> <display_name>? (<metadata>) { <metric_body> }. Vocabulary tokens: source, grain, slice, filter. Measure tag on fields. Ensure metric_block is distinct from schema_block. Add corpus test/corpus/metrics.txt.

## Acceptance Criteria

- metric blocks parse with all metadata keys
- Multi-schema source (brace list) works
- measure fields parse correctly
- metric_block distinct from schema_block
- test/corpus/metrics.txt passes

