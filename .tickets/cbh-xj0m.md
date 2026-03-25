---
id: cbh-xj0m
status: closed
deps: []
links: [cbh-zybb, cbh-vgka, cbh-0lhj, cbh-394k, cbh-qwyg, cbh-ya9k]
created: 2026-03-25T11:20:39Z
type: bug
priority: 2
assignee: Thorben Louw
---
# fmt: --check and --diff display ugly relative paths instead of absolute paths

When fmt --check or fmt --diff is run on files outside the CLI working directory, the displayed paths use excessive relative path traversal (e.g., '../../../../../../../../tmp/satsuma-bug-hunt/schemas.stm') instead of the clean absolute path that was passed as an argument.

- Exact command: satsuma fmt --check /tmp/satsuma-bug-hunt/
- Expected: File paths shown as absolute paths, e.g., '/tmp/satsuma-bug-hunt/schemas.stm'
- Actual: Paths shown as '../../../../../../../../tmp/satsuma-bug-hunt/schemas.stm'
- Same issue affects fmt --diff output in the '--- a/' and '+++ b/' header lines
- Also affects the 'formatted ...' message from in-place formatting
- Test file path: /tmp/satsuma-bug-hunt/

