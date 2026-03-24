---
id: sl-pdxy
status: closed
deps: [sl-jper]
links: []
created: 2026-03-24T18:30:20Z
type: task
priority: 1
assignee: Thorben Louw
tags: [feat-20, phase-1]
---
# Exploratory testing and corpus validation

Run satsuma fmt --check against all examples/*.stm files. Fix any formatting divergence between the formatter output and the canonical corpus. Run against deliberately messy/agent-generated .stm files. Verify idempotency across full corpus. Document any surprising results.

## Acceptance Criteria

- [ ] satsuma fmt --check examples/ exits 0
- [ ] Formatter is idempotent on all corpus files
- [ ] Tested with deliberately messy .stm input (bad indentation, wrong alignment, extra blank lines)
- [ ] Any surprising results documented in features/20-stm-fmt/NOTES.md
- [ ] No regressions in existing CLI or parser tests


## Notes

**2026-03-24T19:49:35Z**

Cause: New feature. Fix: Ran satsuma fmt on all 18 .stm files in examples/. All pass --check (exit 0). Idempotency verified. Structural equivalence verified. 760 tests still passing with reformatted corpus.
