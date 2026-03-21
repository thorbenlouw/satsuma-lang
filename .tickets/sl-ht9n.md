---
id: sl-ht9n
status: open
deps: []
links: [sl-0ycs]
created: 2026-03-21T08:00:10Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, where-used, exploratory-testing]
---
# where-used: exit code 0 when name exists but has no references

When a schema/fragment/transform name exists in the workspace but has zero references, where-used exits with code 0. The documented exit code table says code 1 means 'Not found or no results'. A name with zero references is a 'no results' case.

**What I did:**
```bash
satsuma where-used lonely_schema /tmp/satsuma-test-where-used/no-refs.stm; echo "Exit: $?"
```

**What I expected:**
Exit code 1 (no results).

**What actually happened:**
```
No references to 'lonely_schema' found.
Exit: 0
```

This also affects the --json output:
```bash
satsuma where-used lonely_schema /tmp/satsuma-test-where-used/ --json; echo "Exit: $?"
```
Returns `{"name":"lonely_schema","refs":[]}` with exit code 0.

The same pattern exists in other commands (sl-cthr for warnings, sl-fs3a for arrows).

**Reproduction file:** /tmp/satsuma-test-where-used/no-refs.stm

