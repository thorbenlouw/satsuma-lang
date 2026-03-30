---
id: sl-hnbv
status: closed
deps: []
links: []
created: 2026-03-30T06:39:32Z
type: chore
priority: 3
assignee: Thorben Louw
---
# coverage.ts: document outerSrcBase/outerTgtBase nullability in collectEachPaths()

tooling/vscode-satsuma/server/src/coverage.ts lines 125-164: collectEachPaths() is a recursive function that tracks outer path bases for source and target. The parameters outerSrcBase and outerTgtBase are nullable, but there is no comment explaining when they are null (top-level call with no enclosing each_block?) vs non-null (nested each_block with an inherited prefix).

A reader following the recursion cannot tell what null represents semantically without tracing all call sites.

## Acceptance Criteria

- collectEachPaths() has a doc-comment or inline comment explaining the nullability contract: null means 'no enclosing scope has established a base path yet'; non-null means 'paths in this block are relative to this prefix'
- The recursive call sites pass the right value and have a brief inline comment if the argument is non-obvious
- All existing coverage tests pass

