---
id: sl-1f9d
status: open
deps: []
links: [sl-xh3b]
created: 2026-03-21T07:59:46Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, find, exploratory-testing]
---
# find: --in with invalid scope silently returns no results instead of an error

When `--in` is passed an unrecognized scope value, the command silently returns no results with exit code 1 instead of showing an error about the invalid scope.

**What I did:**
```
satsuma find --tag pii --in invalid /tmp/satsuma-test-find/
satsuma find --tag pii --in mapping /tmp/satsuma-test-find/
```

**What I expected:**
An error message like `Error: invalid scope 'invalid'. Valid scopes: schema, metric, fragment, all` with exit code 2.

**What actually happened:**
```
No matches found.
``` (exit code 1)

Both the clearly invalid scope `invalid` and the plausible-but-unsupported scope `mapping` silently produce empty results. A user who mistypes `--in scheam` instead of `--in schema` would get no results with no indication of why.

The help text documents valid scopes as `schema|metric|fragment|all`, so the command has enough information to validate.

**Test fixture:** /tmp/satsuma-test-find/diverse-tags.stm

