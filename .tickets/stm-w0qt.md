---
id: stm-w0qt
status: in_progress
deps: [stm-j9l5, stm-8x76]
links: []
created: 2026-03-19T19:52:20Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-mt1d
tags: [stm-cli, lint, docs, tests]
---
# Document stm lint and add end-to-end fixtures for fix mode

Document when to use `stm validate` vs `stm lint`, add fixture/example coverage for lint findings and safe autofix, and add end-to-end tests for `--fix`, mixed fixable/non-fixable findings, and idempotent reruns.

## Design

This task should close the user-facing gap: update CLI docs, command reference, and any agent docs that mention validation so lint is discoverable and its intended use is clear.

## Acceptance Criteria

1. STM CLI docs explain the difference between `stm validate` and `stm lint`.
2. End-to-end tests cover `stm lint --fix` on at least one real fixture.
3. Tests cover mixed fixable/non-fixable findings and confirm residual diagnostics remain after fixing.
4. Tests confirm `stm lint --fix` is idempotent.
5. Example corpus and/or dedicated lint fixtures demonstrate at least one real fixable lint rule.

