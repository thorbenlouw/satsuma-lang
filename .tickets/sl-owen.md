---
id: sl-owen
status: closed
deps: [sl-sp7g, sl-95f9]
links: []
created: 2026-04-02T09:20:09Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-m2s6
---
# lsp: simplify coreClassificationToVizKind and extractTransform

Update satsuma-lsp (and satsuma-viz-backend) to reflect the collapsed classification. In viz-model.ts: simplify coreClassificationToVizKind() — remove the 'structural' → 'pipeline' and 'mixed' → 'mixed' branches; all non-map, non-none transforms map to 'nl'. Simplify extractTransform() — no need to separate NL text from pipeline step text; everything is NL. Update semantic token scopes: pipe step tokens get a uniform NL scope rather than function/keyword scopes.

## Acceptance Criteria

1. coreClassificationToVizKind(): only maps to 'nl' or 'map' (no pipeline/mixed)
2. extractTransform(): all pipe step content extracted uniformly as NL text
3. Semantic token provider: pipe step tokens use NL scope, not function/keyword scope
4. satsuma-lsp tests updated and passing
5. TypeScript compiles without errors

