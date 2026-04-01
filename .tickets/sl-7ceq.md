---
id: sl-7ceq
status: open
deps: []
links: []
created: 2026-04-01T07:15:35Z
type: task
priority: 2
assignee: Thorben Louw
tags: [testing, type-safety, refactor]
---
# Test files are JavaScript; source is TypeScript — tests bypass type checking

All CLI source files are TypeScript (src/**/*.ts) but all test files are plain JavaScript (test/**/*.test.js). This means:

- Tests can call internal functions with the wrong argument types and the error only surfaces at runtime
- Refactoring a function signature in source does not produce a compile error in tests — it produces a test failure, or worse, silent wrong behaviour
- The TypeScript investment in src/ (strict types, no as any, well-defined interfaces) doesn't extend to the test layer at all

This is a meaningful gap because tests import internal modules directly (e.g. diffIndex, runLint, buildIndex, matchFields) — exactly the functions where type safety matters most.

**Suggested fix:**
Migrate tests to TypeScript and run them via tsx or compile them with tsc before running with the Node test runner. The existing tsconfig.json would need a test include, or a separate tsconfig.test.json pointing at test/**/*.ts.

Alternatively, at minimum, add a // @ts-check header and a jsconfig.json to the test directory to get partial type checking without a full migration.

**Why this wasn't caught earlier:** The pretest script runs tsc — but tsc only compiles src/, not test/. So CI passes even when tests are type-unsafe.

