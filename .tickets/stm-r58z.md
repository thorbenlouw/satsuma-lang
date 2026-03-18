---
id: stm-r58z
status: closed
deps: []
links: []
created: 2026-03-18T21:28:34Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [validator, cli, feature-12]
---
# Validator bugs: false positives from stm validate

Fix the 5 classes of false-positive warnings emitted by stm validate on the canonical examples/ corpus. See features/12-validator-bugs/PRD.md.

## Acceptance Criteria

stm validate examples/ produces 0 errors and 0 false-positive warnings. Existing true-positive detection is not regressed.

