---
id: sl-y0sz
status: closed
deps: []
links: []
created: 2026-04-07T09:42:36Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# cleanup: remove or de-mark temporary shims

Grep for 'temporary'/'shim'/'migration' in source headers; delete or justify each. Feature 29 TODO #5.

## Acceptance Criteria

No file header claims to be temporary without a justification comment.


## Notes

**2026-04-07T10:50:33Z**

Cause: nl-ref-extract.ts and spread-expand.ts headers still claimed they would be 'collapsed in sl-n4wb', but sl-n4wb is closed and the shims are intentional permanent bridges from WorkspaceIndex to satsuma-core's callback APIs (ADR-005/006). Fix: rewrote both file headers to describe them as bridges and explain what they own vs what stays in core.
