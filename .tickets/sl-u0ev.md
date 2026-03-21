---
id: sl-u0ev
status: closed
deps: []
links: [sl-0ycs]
created: 2026-03-21T07:58:54Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, context, exploratory-testing]
---
# context: exit code 0 when no results found instead of documented exit code 1

When `satsuma context` finds no relevant blocks, it exits with code 0 instead of 1. The documented exit code convention in SATSUMA-CLI.md says exit code 1 means 'Not found or no results.'

**What I did:**
```
satsuma context "xyznonexistent" /tmp/satsuma-test-context/; echo $?
satsuma context "" /tmp/satsuma-test-context/; echo $?
satsuma context "mapping" /tmp/satsuma-test-context/; echo $?
```

**Expected:** Exit code 1 (no results)

**Actual output:**
```
No relevant blocks found.
0
No relevant blocks found.
0
No relevant blocks found.
0
```

**Root cause:** In context.ts lines 90-93, when `emitted.length === 0`, the function prints 'No relevant blocks found.' and returns without calling `process.exit(1)`. The --json path (line 60-75) also returns without an exit code when the candidates array is empty.

**Repro files:** /tmp/satsuma-test-context/customers.stm, /tmp/satsuma-test-context/orders.stm

