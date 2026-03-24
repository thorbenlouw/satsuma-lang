---
id: sl-zf33
status: closed
deps: []
links: []
created: 2026-03-24T18:29:09Z
type: task
priority: 1
assignee: Thorben Louw
tags: [feat-20, phase-1]
---
# Core formatter scaffolding

Implement format(tree, source) pure function skeleton in tooling/satsuma-cli/src/format.ts. Set up CST walk over node.children (not just namedChildren). Emit pass-through as baseline.

## Acceptance Criteria

- [ ] format.ts exists with format(tree, source): string signature
- [ ] Full CST walk visits all children including anonymous tokens and comments
- [ ] Pass-through mode: format(parse(src)) reproduces original source
- [ ] Basic test file exists with round-trip test


## Notes

**2026-03-24T18:38:40Z**

Cause: New feature — no prior implementation existed.
Fix: Created format.ts with format(tree, source) pure function that walks all CST children (including anonymous tokens and comments) via collectLeaves(). Pass-through baseline reproduces original source by collecting leaf nodes and emitting inter-node gaps. Added startIndex/endIndex to SyntaxNode type. 22 tests (6 targeted + 16 corpus round-trip) all passing.
