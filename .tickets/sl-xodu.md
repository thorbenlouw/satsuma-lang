---
id: sl-xodu
status: closed
deps: []
links: []
created: 2026-03-27T09:03:22Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [viz, ux]
---
# Fix Mapping Viz layout regressions in overview mode

Fix overview layout regressions in the VS Code Mapping Viz: account for mapping label width, align overview labels with padded edge coordinates, resolve namespaced mapping refs correctly, ignore invalid source refs in overview edges, and compute namespace bounding boxes from rendered card geometry so boxes stay behind cards and fully enclose notes/metrics/fragments.

## Acceptance Criteria

- Overview edges reserve space for long mapping labels and labels align with rendered arrows\n- Multi-source mappings with join-description text still render overview arrows\n- Namespaced mappings resolve local source/target refs to qualified schema ids so namespace arrows render\n- Namespace bounding boxes enclose actual rendered cards and sit behind edges/cards\n- Relevant viz and server tests pass locally

## Notes

**2026-03-27T09:06:35Z**

Cause: Overview-mode layout used mismatched geometry sources: overview labels did not reserve or align to padded edge space, namespaced mapping refs could remain unresolved, and namespace bounds were derived from abstract node sizes rather than rendered cards. Fix: Updated the viz layout/model pipeline to size cards and label gaps more accurately, resolve mapping refs in namespace context, ignore invalid overview edges, and measure namespace boxes from rendered card bounds. (commit 08c84fa)

**2026-03-27T14:45:00Z**

Cause: Overview mode rendered schema, metric, and fragment cards at sizes that diverged from the compact layout assumptions, and the shell viewport did not recompute fit/minimap geometry after panel resizes.
Fix: Added true compact rendering for overview cards, measured namespace/content bounds from rendered geometry for fit and box placement, and updated the webview shell to stretch and rerender on resize so minimap anchoring stays correct.
