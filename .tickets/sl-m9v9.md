---
id: sl-m9v9
status: open
deps: []
links: []
created: 2026-03-31T08:27:32Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, graph, exploratory-testing]
---
# graph stats.arrows count includes nl-derived synthetic edges, inconsistent with summary arrowCount

The `graph --json` `stats.arrows` field includes nl-derived synthetic edges in the count, while `summary --json` `mappings[].arrowCount` only counts actual declared arrows. This creates an inconsistency where the same workspace shows different arrow totals depending on which command is used.

**Commands to reproduce:**
```bash
npx satsuma graph /tmp/satsuma-test-lineage-graph/nlref.stm --json | jq '.stats.arrows'
# Returns: 6 (includes 3 nl-derived synthetic edges)

npx satsuma summary /tmp/satsuma-test-lineage-graph/nlref.stm --json | jq '[.mappings[].arrowCount] | add'
# Returns: 3 (only declared arrows)
```

The graph edges breakdown: 2 'none' + 1 'nl' + 3 'nl-derived' = 6. But only 3 arrows are actually declared in the source file (id->id, code->code, ->description). The nl-derived edges are synthetic and should not be counted in stats.arrows, or stats should break them out separately.

**Fixture:** /tmp/satsuma-test-lineage-graph/nlref.stm

