---
id: sl-thqe
status: closed
deps: [sl-sp7g]
links: []
created: 2026-04-02T09:20:22Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-m2s6
---
# viz: remove pipeline/mixed rendering branches and orange edge colour

Update satsuma-viz rendering to remove the separate branches for 'pipeline' and 'mixed' transform kinds. Affected files: sz-edge-layer.ts (lines ~243-246: remove conditional for pipeline/mixed kinds; remove orange --sz-edge-pipeline CSS variable), sz-mapping-detail.ts (line ~626: remove pipeline/mixed branch that renders steps as span.transform-pipeline), sz-overview-edge-layer.ts (remove pipeline-specific stroke colour). All transform edges render as NL style. Update layout test fixtures that use kind: 'pipeline' to kind: 'nl'.

## Acceptance Criteria

1. sz-edge-layer.ts: no pipeline or mixed rendering branches
2. --sz-edge-pipeline CSS variable removed
3. sz-mapping-detail.ts: no pipeline/mixed step rendering branch
4. sz-overview-edge-layer.ts: no pipeline-specific stroke style
5. Layout test fixtures updated (kind: 'nl' replaces kind: 'pipeline')
6. satsuma-viz tests pass
7. No visual regressions in the Playwright harness tests (manual verification)

