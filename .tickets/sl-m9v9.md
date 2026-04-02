---
id: sl-m9v9
status: closed
deps: []
links: []
created: 2026-03-31T08:27:32Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, graph, exploratory-testing]
---
# summary arrowCount overcounts nl-derived edges by not deduplicating against declared sources

`summary --json` `mappings[].arrowCount` overcounts nl-derived edges: when an NL @ref resolves to a field that is already the explicitly declared source of the same arrow, `countNlDerivedByMapping` counted it as an additional nl-derived edge. `graph --json` correctly deduplicates these (via `alreadyCovered` check in `buildFieldEdges`), so the two commands reported different totals for the same workspace.

**Root cause:** `countNlDerivedByMapping` in `summary.ts` only skipped self-references but did not check whether the resolved @ref source→target pair was already covered by a declared (non-nl-derived) arrow in the same mapping.

**Example:** In `cobol-to-avro/pipeline.stm`, the arrow
`CUST_TYPE, PERSONAL_NAME.FIRST_NAME, … -> display_name { "@CUST_TYPE …" }` declares all referenced fields as sources. The old summary counted those @refs as nl-derived extras; graph correctly counted 0.

## Notes

**2026-04-02**

Cause: `summary.ts` `countNlDerivedByMapping` did not deduplicate nl-derived refs against declared arrows — it only excluded self-references. The graph builder already had the correct dedup (`alreadyCovered` check), so the two commands diverged. The diagnostic in the ticket (graph overcounts) had the causality backwards: graph was right, summary was wrong.

Fix: moved `qualifyField` from `commands/graph-builder.ts` to `index-builder.ts` (exported), added `countNlDerivedEdgesByMapping` to `nl-ref-extract.ts` implementing the full dedup (declared coverage + self-ref + unique-pair), and updated `summary.ts` to use the shared function instead of its local `countNlDerivedByMapping`. Integration test sl-mraa updated to use a fixture with genuine nl-derived edges.
