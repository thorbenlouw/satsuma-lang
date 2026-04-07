---
id: sl-5xsy
status: closed
deps: []
links: []
created: 2026-04-07T09:43:10Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# tests: raise coverage gates

Measure current coverage on core/CLI/LSP. Raise gates to current rounded down to nearest 5%, target 85% floor for core. Feature 29 TODO #18.

## Acceptance Criteria

Coverage gates raised in .c8rc.json (or per-package equivalents); CI passes.


## Notes

**2026-04-07T16:26:49Z**

Cause: Coverage gates were still at the old CLI-only 70% threshold and core/LSP had no package-level c8 gate, so CI would not catch meaningful coverage regressions across the main tooling packages.
Fix: Measured current line coverage for core, CLI, and LSP, added core/LSP c8 configs, raised the CLI gate, and documented the measured thresholds in Feature 29 TODO (commit 2a20742).
