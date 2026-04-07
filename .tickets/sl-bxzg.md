---
id: sl-bxzg
status: closed
deps: []
links: []
created: 2026-04-07T09:42:54Z
type: chore
priority: 3
assignee: Thorben Louw
parent: sl-63ix
---
# cleanup: unify three-headed validation pipeline

Validation logic is split across core semantic diagnostics, CLI validate, and LSP diagnostic adapter. Document divergence and unify behind smallest common interface. No behavior change. Feature 29 TODO #7.

## Acceptance Criteria

Single unified validation interface; CLI integration tests unchanged.

## Notes

**2026-04-07T15:36:50Z**

Cause: Validation orchestration still lived in consumer adapters: the CLI computed import reachability before calling core, while the LSP combined a partial core semantic adapter with its own missing-import pass.
Fix: Added `validateSemanticWorkspace` in `@satsuma/core` as the shared reachability-aware semantic validation entry point, updated CLI and LSP adapters to use it, and pinned the contract with core/LSP/CLI checks. (commit 94eefc5)
