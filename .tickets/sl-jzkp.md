---
id: sl-jzkp
status: closed
deps: [sl-3z3i]
links: []
created: 2026-03-24T18:29:59Z
type: task
priority: 1
assignee: Thorben Louw
tags: [feat-20, phase-1]
---
# CLI fmt command

Implement tooling/satsuma-cli/src/commands/fmt.ts: file/directory resolution, recursive .stm discovery, --check (exit 1 if unformatted), --diff (print unified diff), --stdin (read stdin, write stdout), exit codes 0/1/2, parse-error file skipping with warnings. Register in index.ts.

## Acceptance Criteria

- [ ] satsuma fmt file.stm formats in place
- [ ] satsuma fmt dir/ recursively formats all .stm files
- [ ] satsuma fmt (no args) formats .stm files in cwd
- [ ] --check exits 0 if formatted, 1 if not, prints unformatted file list
- [ ] --diff prints unified diff without writing
- [ ] --stdin reads from stdin, writes to stdout
- [ ] Exit code 2 on parse errors
- [ ] Parse-error files skipped with warning message
- [ ] Command registered in index.ts
- [ ] Tests for CLI flags and exit codes


## Notes

**2026-03-24T19:45:50Z**

Cause: New feature. Fix: Created commands/fmt.ts with file/dir resolution, recursive .stm discovery, --check (exit 1 if unformatted), --diff (unified diff output), --stdin (pipe mode), exit codes 0/1/2, parse-error file skipping. Registered in index.ts. 734 tests passing.
