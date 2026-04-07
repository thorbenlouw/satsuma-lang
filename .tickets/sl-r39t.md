---
id: sl-r39t
status: open
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

