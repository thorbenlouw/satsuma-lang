---
id: sl-mraa
status: closed
deps: []
links: []
created: 2026-03-31T08:32:28Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, consistency, exploratory-testing]
---
# consistency: summary total arrowCount disagrees with graph edge count beyond nl-derived arrows

Commands: satsuma summary --json vs satsuma graph --json

The sum of arrowCount across all mappings in summary --json does not match the edge count in graph --json. The nl-derived edges account for some of the difference, but even after excluding nl-derived edges, the counts still disagree.

Example — sfdc-to-snowflake:
  summary total arrows: 10
  graph edges: 12 (10 non-nl-derived + 2 nl-derived)
  Non-nl-derived edges: 10 (matches ✓, but only by coincidence)

Example — cobol-to-avro:
  summary total arrows: 16
  graph edges: 20 (20 non-nl-derived + 0 nl-derived)
  Non-nl-derived graph edges: 20 ≠ summary 16

The extra 4 graph edges in cobol-to-avro come from NL @ref analysis expanding a single mapping arrow (CUST_TYPE -> display_name) into 4 edges (one for each @ref'd source field). These extra edges have derived=False and classification=nl, NOT classification=nl-derived. This means:

1. A consumer cannot reconcile summary and graph counts by filtering on classification=nl-derived
2. Some NL-inferred edges are classified as nl-derived (when no declared source mapping exists) and others are plain nl/mixed (when the graph expands multi-source @refs into multiple edges)
3. The mapping command shows 1 arrow but the arrows command for the same field lists 4 sources

This creates a contract ambiguity: how many arrows does this mapping actually have? The answer depends on which command you ask.

Affected workspaces: cobol-to-avro, db-to-db, edi-to-json, filter-flatten-governance, json-api-to-parquet, multi-source, protobuf-to-parquet, sap-po-to-mfcs, sfdc-to-snowflake, xml-to-parquet.


## Notes

**2026-03-31T12:12:51Z**

Cause: summary arrowCount only counted declared arrows from extract.ts, while graph edges included nl-derived edges — causing disagreements.
Fix: Added countNlDerivedByMapping() in summary.ts using resolveAllNLRefs. arrowCount now includes nl-derived edges. Mappings with nl-derived arrows expose nlDerivedArrowCount breakdown field. Also moved stripNLRefScopePrefix to core as a shared utility.
