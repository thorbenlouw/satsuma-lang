---
id: sl-erxz
status: closed
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


## Notes

**2026-04-07T10:56:32Z**

Cause: CLI's WorkspaceIndex (an extraction-result struct: schemas/mappings/arrows/diagnostics) and viz-backend's WorkspaceIndex (a definition/reference cross-file index used by LSP and viz for navigation) shared a name despite being unrelated. Fix: renamed CLI's type to ExtractedWorkspace across 25 files (src + tests + README); viz-backend keeps WorkspaceIndex as the naturally editor-shaped index. Type was package-internal so no cross-package import sites needed updating. All 876 CLI tests pass.
