---
id: sl-bxzg
status: in_progress
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

