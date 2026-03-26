---
id: sc-i8k8
status: open
deps: []
links: []
created: 2026-03-26T06:50:38Z
type: task
priority: 2
assignee: Thorben Louw
tags: [testing, hygiene]
---
# Audit tests that depend on canonical examples having errors/warnings

Tests should never depend on canonical example .stm files having validation errors or warnings. Examples are the gold standard of correct Satsuma — if a test needs a warning or error condition, it should use a dedicated fixture in test/fixtures/. One instance was already fixed (sl-5dyc import warning test moved to missing-import.stm fixture). Audit all tests that use EXAMPLES paths and verify none assert on error/warning conditions from canonical examples.

## Acceptance Criteria

- All tests using resolve(EXAMPLES, ...) audited
- Any test asserting on warnings/errors from canonical examples migrated to dedicated fixtures
- Canonical examples remain clean demonstration files with no test-required defects
- All tests pass after migration

