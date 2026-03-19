---
id: stm-mpw7
status: closed
deps: [stm-58nl]
links: []
created: 2026-03-19T19:52:20Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-mt1d
tags: [stm-cli, lint, cli]
---
# Implement stm lint command scaffold and JSON/text output

Add the `stm lint` command entrypoint, parser/index plumbing reuse, lint result aggregation, text output, JSON output, and documented exit semantics. This task establishes the command shell and rule-engine plumbing but does not require full rule coverage or autofix.

## Design

Focus on command-level behavior:
- register `stm lint [path]`
- load single file or workspace
- run a lint engine over extracted/indexed data
- emit text and JSON diagnostics
- mark findings as fixable/non-fixable
- return non-zero when findings exist

## Acceptance Criteria

1. `stm lint [path]` exists and runs on a single file or directory.
2. `stm lint --json` emits a stable machine-readable payload.
3. Text output includes file, line, column, severity, and rule id.
4. The command exits non-zero when lint findings are present.
5. Automated tests cover clean output, failing output, JSON output, and exit-code behavior.

