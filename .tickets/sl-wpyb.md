---
id: sl-wpyb
status: closed
deps: []
links: []
created: 2026-04-01T07:15:23Z
type: task
priority: 2
assignee: Thorben Louw
tags: [testing, coverage, good first issue]
---
# Missing unit test coverage across six modules

The following modules have no meaningful unit test coverage. In each case the logic is only exercised transitively through CLI integration tests, making failures slow to diagnose and edge cases easy to miss.

**satsuma fmt — no tests at all**
The only coverage is the CI corpus idempotency check. Missing:
- --check exit codes (0 when clean, 1 when would change)
- --diff output format
- --stdin pipe mode
- Idempotency: format → reformat produces no change
- Behaviour on files with parse errors (the skipping: parse error stderr path)

**workspace.ts / followImports — no unit tests**
- Silent-swallow on unreadable files (catch { continue }) is never directly asserted
- Circular import graph (the visited-set cycle guard) is untested
- resolveInput is never called in isolation — only via CLI subprocess

**cst-query.ts — no test file exists**
findBlockNode, findBlockByRow, and findBlockNodeInContainer are used by multiple commands but have no tests. Anonymous block keying (<anon>@file:row) and namespace-qualified lookups are only covered incidentally.

**errors.ts — 90% untested**
Only findSuggestion has tests. Missing:
- notFound branching: Available: x, y vs (N schemas in workspace) vs no suggestion
- loadFiles read-error path (the process.exit(2) branch)
- resolveAndLoad entirely

**normalize.ts / matchFields — 3 test cases**
Missing: deeply nested field flattening, cross-level leaf matching (address.city matching bare city), first-wins behaviour when two fields normalise identically, empty children arrays.

**diff.ts — incomplete change-kind coverage**
No tests for: arrow-added, arrow-removed, arrow-transform-changed, sources-changed, targets-changed, body-changed. The --stat and --names-only CLI flags in commands/diff.ts also have no tests.

**resolveScopedEntityRef / resolveIndexKey in index-builder.ts — no direct tests**
Core lookup functions used by nearly every command. Namespace-scoped resolution (try ns::name, fall back to bare, handle ambiguous matches) is only covered transitively.

**findSuggestion prefix heuristic is undertested**
Missing: name shorter than 3 chars (.slice(0, 3) edge), name that prefix-matches multiple entries, name identical to an available entry (the suggestion !== name guard in notFound).


## Notes

**2026-04-01T08:49:36Z**

## Notes

**2026-04-01T13:00:00Z**

Cause: Six modules had no or minimal unit test coverage — logic was only exercised transitively through slow CLI integration tests.
Fix: Added unit test files for cst-query.ts (new), workspace.ts (new), fmt.ts (new). Expanded existing tests in errors.test.ts, normalize.test.ts, diff.test.ts, and canonical-ref.test.ts. Total test count increased from 774 to 832.
