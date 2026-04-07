---
id: sl-r39t
status: closed
deps: []
links: []
created: 2026-04-07T09:42:36Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# cleanup: remove or actually use dead resolveAndLoad

resolveAndLoad has no callers; ~20 commands reimplement workspace loading inline. Either delete or refactor commands to use it. Feature 29 TODO #4.

## Acceptance Criteria

No dead resolveAndLoad in tree, OR all command sites use it.


## Notes

**2026-04-07T10:47:13Z**

Cause: resolveAndLoad was added as a planned helper but never adopted; ~20 CLI commands kept inlining workspace loading. Fix: deleted resolveAndLoad from satsuma-cli/src/errors.ts since it had zero callers.

**2026-04-07T11:25:58Z**

Cause: resolveAndLoad existed as a planned helper but had zero callers; ~20 CLI commands kept inlining resolveInput + parseFile + buildIndex. Fix: superseded the prior 'delete it' decision after PR review feedback. Introduced satsuma-cli/src/load-workspace.ts (loadWorkspace returning {files, index}) and migrated 18 commands to use it; fmt, diff, and validate retain custom error handling because their resolve-failure semantics genuinely differ. Added unit tests in test/load-workspace.test.ts; removed redundant per-command directory-rejection integration tests in favour of testing the shared loader once. Net ~140 lines of boilerplate removed across the CLI.
