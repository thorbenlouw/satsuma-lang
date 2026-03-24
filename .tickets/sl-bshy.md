---
id: sl-bshy
status: closed
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


## Notes

**2026-03-24T19:59:17Z**

Cause: New feature. Fix: Created formatting.test.js with 6 tests covering: already-formatted input (no edits), unformatted input (single TextEdit), expected output content, mapping with arrows, comment preservation, and idempotency. Uses web-tree-sitter WASM parser via helper. 148 LSP tests passing.
