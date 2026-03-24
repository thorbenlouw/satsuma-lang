---
id: sl-bshy
status: open
deps: [sl-ewv7]
links: []
created: 2026-03-24T18:30:38Z
type: task
priority: 2
assignee: Thorben Louw
tags: [feat-20, phase-2]
---
# VS Code formatting tests

Test that Format Document in VS Code produces identical output to CLI. Test format-on-save. Test with parse-error files (no crash or corruption).

## Acceptance Criteria

- [ ] Format Document produces same output as satsuma fmt for same input
- [ ] format-on-save integration works
- [ ] Parse-error files handled gracefully (no crash, no corruption)
- [ ] Tests passing

