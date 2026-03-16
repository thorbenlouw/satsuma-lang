---
id: stm-0oad
status: open
deps: [stm-dy6t]
links: []
created: 2026-03-16T13:46:54Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-t1n8
---
# Add multi-schema highlighting support to the VS Code extension

Extend the STM VS Code grammar and fixtures for namespace/workspace syntax if the multi-schema feature is part of the current language surface consumed by examples and parser fixtures.

## Acceptance Criteria

If multi-schema syntax is in scope, the grammar highlights namespace, workspace, from, and :: namespace-qualified paths correctly.
Fixtures cover workspace files, namespace declarations, cross-namespace map headers, and namespaced field references.
If the feature is blocked on language-surface timing, the ticket records the dependency explicitly instead of shipping speculative syntax.
The extension remains backward compatible with non-namespaced STM files.

