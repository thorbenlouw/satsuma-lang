---
id: sl-j8uk
status: done
deps: []
links: []
created: 2026-03-20T18:42:25Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [cli, bug]
---
# Filesystem errors exit with code 1 instead of documented code 2

SATSUMA-CLI.md documents exit code 2 for 'Parse error or filesystem error'. Parse errors correctly exit 2, but filesystem errors (ENOENT) exit 1. For example: 'satsuma summary /nonexistent' exits 1 with 'Error resolving path: ENOENT'. Exit code 1 is documented as 'Not found or no results', which is a different condition. This makes it impossible for callers to distinguish 'no matching schemas' from 'path doesn't exist'.

## Acceptance Criteria

1. Filesystem errors (ENOENT, EACCES, etc.) exit with code 2.
2. 'Not found' results (e.g., schema not found) continue to exit with code 1.

