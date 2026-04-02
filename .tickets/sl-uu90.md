---
id: sl-uu90
status: closed
deps: [sl-95f9, sl-sp7g]
links: []
created: 2026-04-02T09:20:34Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-m2s6
---
# vscode: remove ClassificationFilter dropdown and structural CSS from field-lineage webview

Update the VS Code extension's field-lineage webview to remove the classification filter UI. Affected files: field-lineage.ts (remove ClassificationFilter type, filter dropdown, keepClassification() function — all arrows with transforms are nl, filtering by structural no longer makes sense), field-lineage.css (remove .cls-structural border/stroke/fill rules, simplify arrowhead markers to none/nl/nl-derived only), lineage.ts (remove isNl check on line ~137 — all transforms are NL). Semantic token provider: pipe steps get uniform NL scope.

## Acceptance Criteria

1. ClassificationFilter type and dropdown removed from field-lineage.ts
2. keepClassification() function removed
3. .cls-structural CSS rules removed from field-lineage.css
4. Arrowhead marker definitions simplified to none/nl/nl-derived
5. lineage.ts: isNl check removed — all transforms are NL
6. VS Code extension compiles and packages without errors
7. Field lineage panel renders correctly without classification filter

