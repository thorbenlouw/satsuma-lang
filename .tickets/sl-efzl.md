---
id: sl-efzl
status: open
deps: []
links: []
created: 2026-04-01T07:18:30Z
type: task
priority: 2
assignee: Thorben Louw
tags: [lint, code-quality, refactor]
---
# Scope no-null-assertion ESLint suppression to individual callsites instead of global disable

The `@typescript-eslint/no-non-null-assertion` rule is turned off globally in `eslint.config.mjs` (line 104):

```js
// Allow non-null assertions — used intentionally for indexed access
"@typescript-eslint/no-non-null-assertion": "off",
```

While the existing usages are intentional (Map `.get()!` after key-existence checks, array `.pop()!`/`.shift()!`, regex match group access), disabling the rule globally means any future careless `!` won't be flagged.

There are currently **68 non-null assertion callsites** across 24 source files in `tooling/satsuma-cli/src/`. The heaviest users are:
- `lint-engine.ts` — 18 usages (regex match groups, array indexing, fix property access)
- `index-builder.ts` — 7 usages (Map `.get()!` after `.has()` or `.set()`)
- `normalize.ts` — 5 usages (`.split().pop()!`, Map `.get()!`)
- `commands/lineage.ts` — 5 usages (Map adjacency list access)
- `commands/fmt.ts` — 5 usages (DP table indexed access)

**Fix:**

1. Re-enable the rule globally by removing the `"off"` line from `eslint.config.mjs`.
2. Add `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion` at each of the 68 callsites where the assertion is genuinely safe.
3. For files with many suppressions in a localised block (e.g. the DP table in `fmt.ts`, the fix-application loop in `lint-engine.ts`), a single `/* eslint-disable */` / `/* eslint-enable */` range is acceptable to reduce noise.
4. As a stretch goal, consider whether some usages can be eliminated entirely — e.g. replacing `map.get(k)!` with a helper that throws a descriptive error on miss, or using optional chaining with a fallback.

**Why this matters:**
The rule exists to catch unsafe assumptions. Keeping it active everywhere except the known-safe sites means new code gets the protection automatically, and reviewers don't need to manually audit for unguarded `!` usage.

