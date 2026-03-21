---
id: sl-cthr
status: closed
deps: []
links: [sl-0ycs]
created: 2026-03-21T07:58:39Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, warnings, exploratory-testing]
---
# warnings: exit code 0 when no results found instead of documented exit code 1

When `satsuma warnings` finds no warning or question comments, it exits with code 0. The documented exit code convention in SATSUMA-CLI.md says exit code 1 means 'Not found or no results.' Other commands like `satsuma find --tag` correctly exit with code 1 when no results are found.

**What I did:**
```
satsuma warnings /tmp/satsuma-test-warnings/no-warnings.stm; echo $?
satsuma warnings --questions /tmp/satsuma-test-warnings/no-warnings.stm; echo $?
satsuma warnings --json /tmp/satsuma-test-warnings/no-warnings.stm; echo $?
```

**Expected:** Exit code 1 (no results)

**Actual output:**
```
No warning comments found.
0
No question comments found.
0
{"kind":"warning","count":0,"items":[]}
0
```

For comparison, `satsuma find --tag nonexistent examples/` correctly exits with code 1.

**Root cause:** In warnings.ts, there is no `process.exit(1)` for the no-results case. The function simply returns after printing.

**Repro file:** /tmp/satsuma-test-warnings/no-warnings.stm (a file with only regular // comments)

