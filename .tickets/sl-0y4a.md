---
id: sl-0y4a
status: closed
deps: []
links: []
created: 2026-04-07T09:43:10Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# tests: unit tests for custom LSP requests

satsuma/vizModel, vizFullLineage, vizLinkedFiles, fieldLocations, mappingCoverage, actionContext have no unit tests. Add one file per request. Feature 29 TODO #17.

## Acceptance Criteria

Each custom LSP request has ≥1 unit test invoking the handler against a multi-file workspace index.


## Notes

**2026-04-07T15:38:07Z**

Cause: handlers vizModel/vizFullLineage/vizLinkedFiles had no test coverage. Fix: added viz-model.test.js, viz-full-lineage.test.js, viz-linked-files.test.js mirroring the handler logic against multi-file workspace indexes (9 tests).
