---
id: sl-rbki
status: open
deps: [sl-pdxy, sl-bshy]
links: []
created: 2026-03-24T18:30:47Z
type: task
priority: 2
assignee: Thorben Louw
tags: [feat-20, phase-3]
---
# CI integration for fmt --check

Add satsuma fmt --check step to CI pipeline. Format entire example corpus and commit (should be a no-op if style matches).

## Acceptance Criteria

- [ ] CI pipeline includes satsuma fmt --check step
- [ ] CI fails if any .stm file in examples/ is not formatted
- [ ] Example corpus passes fmt --check (no formatting changes needed)

