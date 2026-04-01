---
id: sl-il4t
status: closed
deps: []
links: []
created: 2026-04-01T07:17:10Z
type: task
priority: 2
assignee: Thorben Louw
tags: [testing, ci, coverage, infrastructure]
---
# Add test coverage measurement and reporting to CI

There is currently no code coverage measurement anywhere in the pipeline. CI runs tests and reports pass/fail, but there is no visibility into which lines, branches, or functions are actually exercised. The gaps identified in issue #5 were found by manual code reading — they should be caught automatically.

**Suggested approach:**

Node's built-in test runner (already in use) supports V8 coverage via `--experimental-test-coverage`. No new dependencies are needed:

```bash
node --import ./test/setup.js \
     --experimental-test-coverage \
     --test test/**/*.test.js
```

For reporting, `c8` can consume V8 coverage output and produce lcov/html/text summaries:

```bash
npm install --save-dev c8
c8 --reporter=lcov --reporter=text node --test test/**/*.test.js
```

**What to add to CI:**

- Run coverage as part of the satsuma-cli job
- Upload the lcov report as an artifact
- Enforce a minimum threshold (suggested starting point: 70% line coverage) to prevent regressions — this can be raised incrementally as gaps from issue #5 are addressed
- Optionally post a coverage summary comment on PRs via dorny/test-reporter or a dedicated action

**Current known coverage gaps that would be surfaced immediately:**

- `src/commands/fmt.ts` — near zero
- `src/cst-query.ts` — near zero
- `src/workspace.ts` — low (only happy path via integration)
- `src/errors.ts` — ~20% (only findSuggestion)
- Several change-kind branches in `src/diff.ts`


## Notes

**2026-04-01T08:26:02Z**

## Notes

**2026-04-01T12:00:00Z**

Cause: No coverage measurement existed in the CI pipeline — coverage gaps were found by manual code reading.
Fix: Added c8 as a dev dependency, created .c8rc.json with 70% line threshold, added test:coverage script, updated CI to run tests under c8 and upload lcov artifacts. Coverage currently at 87.7% lines.
