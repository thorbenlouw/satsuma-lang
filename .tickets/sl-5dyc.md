---
id: sl-5dyc
status: closed
deps: []
links: []
created: 2026-03-20T18:40:52Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, json, bug]
---
# Import warnings printed to stdout pollute --json output

When a file has an unresolved import (e.g., db-to-db.stm imports lib/common.stm), the warning message is printed to stdout before the JSON payload. This makes the output invalid JSON for any downstream consumer. Affects all commands with --json: summary, validate, graph, diff, and likely others.

## Acceptance Criteria

1. Import warnings are printed to stderr, not stdout.
2. Running 'satsuma summary --json examples/db-to-db.stm | python3 -c "import sys,json; json.load(sys.stdin)"' succeeds without parse errors.
3. The warning is still visible to the user (on stderr).
4. All --json commands produce valid JSON even when import resolution warnings are present.


## Notes

**2026-03-22T22:02:01Z**

Bug already fixed in previous commit. Warning at workspace.ts:103 uses process.stderr.write(). Tests in bug-purge.test.js pass. Verified manually: stdout is valid JSON, warning appears on stderr.
