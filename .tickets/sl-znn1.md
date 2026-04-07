---
id: sl-znn1
status: closed
deps: []
links: []
created: 2026-04-07T09:42:36Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# cleanup: consolidate duplicated utilities into satsuma-core

Audit CLI and LSP for duplicated utilities; move canonical impls (with tests) into satsuma-core; delete consumer copies. See feature 29 TODO #1.

## Acceptance Criteria

No utility function exists in two consumer packages. Dependency graph unchanged. All tests pass.

## Notes

**2026-04-07T15:56:36Z**

Cause: CLI and LSP consumer packages still carried local copies of Satsuma CST reference text helpers and field path utilities after the core extraction work. This made the shared extraction contract easier to drift across command and editor surfaces.
Fix: Moved `qualifyField`, `findFieldByPath`, and `collectFieldNames` into `satsuma-core`, reused existing core CST helpers from LSP files, deleted consumer helper bodies, and added focused core tests plus the Feature 29 audit checklist update. (commit d402314)
