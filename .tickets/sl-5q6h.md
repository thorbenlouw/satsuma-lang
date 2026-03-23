---
id: sl-5q6h
status: closed
deps: []
links: []
created: 2026-03-22T07:45:26Z
type: bug
priority: 2
assignee: Thorben Louw
parent: sl-64yy
tags: [cli, validate, exploratory-testing-2]
---
# validate: --json produces no JSON for filesystem errors

When validate is given a nonexistent file path with --json, stdout is empty instead of returning a JSON error object. The error goes to stderr only. Exit code is correctly 2, but --json callers parsing stdout get an empty string (not valid JSON).

## Reproduction

Run: `satsuma validate /nonexistent/path.stm --json; echo "exit: $?"`

Expected: JSON error on stdout, e.g. [{"severity":"error","message":"ENOENT..."}], exit code 2.
Actual: stdout is empty, stderr has "Error resolving path: ENOENT...", exit code 2.

This is a partial gap in the sl-x11k fix — other error types do produce JSON, but filesystem-level errors bypass the JSON output path.

