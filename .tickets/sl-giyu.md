---
id: sl-giyu
status: closed
deps: []
links: []
created: 2026-04-07T09:42:54Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# docs: inline 'why' comments for complex algorithms

Add intent-level comments to: resolveRef (NL ref cascade), spread expander, viz-model.ts extract* builders, diff.ts comparators, index-builder.ts buildIndex. Feature 29 TODO #8.

## Acceptance Criteria

Each named function has a doc-comment explaining intent and precedence rules beyond what the signature shows.


## Notes

**2026-04-07T15:53:12Z**

Cause: Feature 29 TODO #8 — complex algorithms (resolveRef, expandSpreads, viz-model extract* builders, diff.ts comparators, buildIndex) lacked intent-level doc-comments explaining why precedence rules exist beyond what the signature shows.
Fix: Added doc-comments to extractCommentText/Schema/SchemaLabel/Fragment/Mapping/SourceBlock/Arrow/ComputedArrow/EachBlock/FlattenBlock/Metric/MetricMetadata/MetricFields/Measure/NoteBlock/Notes in viz-model.ts; diffSchema/Metric/Fragment/Transform/FieldList/Mapping in diff-engine.ts; buildIndex in index-builder.ts; and enriched expandSpreads in spread-expand.ts. resolveRef already had a thorough doc-comment from prior work. (commit f682cc8)
