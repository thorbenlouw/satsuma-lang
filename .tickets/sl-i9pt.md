---
id: sl-i9pt
status: closed
deps: []
links: []
created: 2026-03-30T06:38:49Z
type: chore
priority: 2
assignee: Thorben Louw
---
# extract.ts: document ERROR-node recovery in sourceRefNameNs() and magic index logic in extractMetrics()

tooling/satsuma-core/src/extract.ts has two readability defects:

1. Lines 156-172: sourceRefNameNs() walks ERROR nodes during source reference extraction (lines 158-163). This is error-recovery logic but there is no comment explaining why ERROR nodes are walked, what partial parse state is being recovered from, or what the output looks like when recovery fires.

2. Lines 280-284: displayName extraction in extractMetrics() uses indexOf/findIndex comparison logic with no explanation. The magic index arithmetic is hard to follow without understanding the CST shape of a metric declaration. A comment explaining the node structure being navigated would make this readable.

## Acceptance Criteria

- sourceRefNameNs() has a comment explaining the ERROR-node traversal: what parse failure produces this tree shape, and why traversing ERROR children is the correct recovery strategy
- The displayName extraction in extractMetrics() has a comment explaining the CST node layout for a metric declaration and why the index comparison selects the display name node
- All existing extract tests pass

