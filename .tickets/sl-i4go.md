---
id: sl-i4go
status: done
deps: []
links: [sl-zufn, sl-txbo]
created: 2026-03-26T13:55:00Z
type: bug
priority: 2
assignee: Thorben Louw
---
# LSP find-references: transform usage in arrows not tracked

Find All References works for ...spread references but not for transform usage. Transform definitions are indexed but their spread references in arrows are not tracked in the workspace reference index.

## Acceptance Criteria

1. Find All References on a transform block name shows all spread usages in arrows
2. Results include cross-file references

## Notes

**2026-03-26T14:30:00Z**

Cause: This was already working. Transform spreads in arrows use the `fragment_spread` CST node type, and `indexArrowSpreadRefs()` already walked all descendants looking for `fragment_spread` nodes. The bug report was based on incorrect analysis.
Fix: No code change needed. Added a test confirming transform spread references in arrows are correctly indexed.

