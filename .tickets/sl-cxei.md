---
id: sl-cxei
status: closed
deps: [sl-95f9]
links: []
created: 2026-04-02T09:19:59Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-m2s6
---
# cli: remove structural/mixed from all command outputs

Update all CLI commands that emit a classification field so they never output structural or mixed. Affected commands: arrows, field-lineage, graph, mapping. Update the satsuma nl command so it returns ALL pipe step content including bare tokens (previously structural steps were excluded). Update CLI TypeScript types: Classification type in types.ts collapses to 'none' | 'nl' | 'nl-derived'.

## Acceptance Criteria

1. satsuma arrows --json: classification field is only none/nl/nl-derived in all test fixtures
2. satsuma field-lineage --json: same constraint
3. satsuma graph --json: same constraint
4. satsuma mapping --json: same constraint
5. satsuma nl mapping_name: returns ALL pipe step content including bare tokens like trim, lowercase
6. CLI TypeScript Classification type updated — structural and mixed removed
7. All CLI tests updated with new expected outputs and passing

