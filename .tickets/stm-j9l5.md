---
id: stm-j9l5
status: open
deps: [stm-mpw7]
links: []
created: 2026-03-19T19:52:20Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-mt1d
tags: [stm-cli, lint, autofix, nl-refs]
---
# Add hidden-source-in-nl lint rule with safe autofix

Implement a lint rule for mappings whose NL content references schemas not declared in `source {}` or `target {}`. Support `--fix` for the unambiguous namespace-qualified schema case by updating the mapping source list deterministically.

## Design

The rule should be parser-backed and workspace-aware. Autofix must:
- only add missing schema refs when the reference is namespace-qualified and resolves uniquely
- preserve STM semantics
- avoid duplicate insertions
- be idempotent across repeated runs
- leave non-fixable findings as diagnostics

## Acceptance Criteria

1. A `hidden-source-in-nl` (or equivalently named) lint rule exists.
2. The rule flags mappings whose NL references introduce undeclared schema dependencies.
3. `stm lint --fix` can add missing schema refs to `source {}` for the unambiguous namespace-qualified case.
4. The autofix does not duplicate existing refs and is idempotent.
5. Tests cover fixable, non-fixable, and already-clean cases.

