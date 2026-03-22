---
id: sl-niix
status: closed
deps: []
links: [sl-0o1x, sl-z157, sl-td9l]
created: 2026-03-21T21:53:23Z
type: epic
priority: 3
assignee: Thorben Louw
tags: [cli, lint]
---
# Epic: Lint edge cases

NL-based lint rules skip anonymous mappings, --fix produces invalid output.


## Notes

**2026-03-22T02:00:00Z**

Cause: Lint rules had issues with anonymous mappings, backtick wrapping, and namespace-local names.
Fix: Fixed anonymous mapping resolution, backtick wrapping in --fix, and namespace-local name generation (closed in commit cf955f7).
