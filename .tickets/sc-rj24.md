---
id: sc-rj24
status: closed
deps: []
links: []
created: 2026-03-22T21:30:54Z
type: bug
priority: 3
assignee: Thorben Louw
---
# context: cannot find language keywords like flatten, list_of, governance

The context command returns no results for keywords that appear prominently in files.

Repro:
  satsuma context 'flatten' examples/filter-flatten-governance.stm
  satsuma context 'governance' examples/filter-flatten-governance.stm
  satsuma context 'list_of' examples/filter-flatten-governance.stm

Expected: Returns the mapping block containing 'flatten', or the note block discussing governance.
Actual: 'No relevant blocks found.' (exit code 1) for all three.

The file contains flatten at line 197, governance in the top-level note block, and list_of in multiple schema definitions. The context search appears to only match against schema/mapping/metric names, not against keywords, comments, or structural constructs within blocks.

