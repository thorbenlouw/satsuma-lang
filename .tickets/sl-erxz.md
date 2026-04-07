---
id: sl-erxz
status: open
deps: []
links: []
created: 2026-04-07T09:42:36Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# cleanup: resolve WorkspaceIndex naming collision

Two unrelated WorkspaceIndex types (CLI + LSP) share a name. Rename one to a more specific name and update references. Feature 29 TODO #2.

## Acceptance Criteria

No two exported types share a name across packages without documented reason.

