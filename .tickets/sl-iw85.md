---
id: sl-iw85
status: open
deps: []
links: []
created: 2026-03-21T08:00:01Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, where-used, exploratory-testing]
---
# where-used: transform spread references (...name) not detected

Transform blocks referenced via spread syntax (`...transform_name`) inside mapping arrows are not detected by where-used.

**What I did:**
```bash
satsuma where-used normalize_email /tmp/satsuma-test-where-used/basic.stm
satsuma where-used clean_name /tmp/satsuma-test-where-used/basic.stm
```

**What I expected:**
Both transforms should be found — they are used in the mapping via `...normalize_email` and `...clean_name` spread syntax.

**What actually happened:**
```
No references to 'normalize_email' found.
No references to 'clean_name' found.
```

The code in where-used.ts only searches for `pipe_step > token_call` nodes (function-style transform invocations like `{ trim_and_lower }`), but does not search for `fragment_spread` nodes inside transform bodies. The spread syntax `...name` in a transform body creates a `fragment_spread` CST node, not a `token_call`.

**Reproduction file:** /tmp/satsuma-test-where-used/basic.stm (lines 46-47: `{ ...clean_name }` and `{ ...normalize_email }`)

