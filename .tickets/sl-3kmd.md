---
id: sl-3kmd
status: closed
deps: []
links: []
created: 2026-04-01T07:16:12Z
type: task
priority: 2
assignee: Thorben Louw
tags: [refactor, maintainability]
---
# commands/diff.ts: 14-branch if-else chain in printDefault should be a dispatch table

The inner loop of printDefault switches on c.kind via 14 consecutive else if branches. This is brittle — adding a new change kind requires touching the chain, and there's no exhaustiveness check to catch a missing branch.

```ts
if (c.kind === "field-added") { ... }
else if (c.kind === "field-removed") { ... }
else if (c.kind === "type-changed") { ... }
// ... 11 more
```

**Suggested fix:** Replace with a `Record<ChangeKind, (c: ...) => void>` dispatch map. Using `satisfies` against the union type would give TypeScript exhaustiveness checking for free.


## Notes

**2026-04-01T07:40:46Z**

**2026-03-31T12:00:00Z**

Cause: printSection used a 14-branch if-else chain on c.kind with no exhaustiveness checking.
Fix: Replaced with CHANGE_PRINTERS Record<ChangeKind, ...> dispatch table using satisfies for TypeScript exhaustiveness.
