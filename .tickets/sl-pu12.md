---
id: sl-pu12
status: open
deps: []
links: []
created: 2026-04-01T07:16:51Z
type: task
priority: 2
assignee: Thorben Louw
tags: [testing, refactor, maintainability]
---
# integration.test.js: ~20% of tests are unit tests at the wrong level

integration.test.js contains 372 tests, virtually all of which spawn a real CLI subprocess via run(). This is correct for the majority. However, roughly 80 tests are asserting on business logic (extraction counts, index resolution, offset conversions) rather than CLI surface behaviour — they use the CLI as a test harness because the internal functions weren't easily testable in isolation at the time they were written.

**Examples of tests that don't belong here:**

- "arrowCount excludes flatten/each containers" — asserts a hardcoded count of 11. This is testing index-builder counting logic, not the CLI.
- "fieldCount includes fields from fragment spreads" — asserts fieldCount === 4. This is testing CST extraction.
- "--json line is 1-indexed" — asserts data.line === 4. This is testing the 0→1 row offset conversion in the extractor.
- The sl-9gvb test ("indexes nested child arrows without leading dot in key") directly calls parseFile and buildIndex via dynamic import() inside integration.test.js. This is a unit test that has fully given up the pretence of being an integration test.
- Many of the namespace bug describe blocks (10+) deeply inspect JSON field structure rather than CLI behaviour.

**What "legitimate" integration tests look like here:**

- Exit code assertions (`assert.equal(code, 0)`)
- stderr message content (`assert.match(stderr, /did you mean/i)`)
- Flag interaction behaviour (`--compact` omits fields, `--quiet` produces no output)
- JSON shape validation (keys present/absent, array vs scalar)
- Pluralisation and formatting of human-readable output

**Suggested fix:**

- Move sl-9gvb to `arrow-extract.test.js` unconditionally — it already imports internal modules directly.
- For each count/offset/extraction assertion in integration.test.js, add a corresponding unit test in the appropriate file (`extract.test.js`, `arrow-extract.test.js`, `namespace-index.test.js`) and trim the integration test back to just verifying the CLI surfaces the value.
- No tests need to be deleted — they should be relocated and the integration version simplified.

**Why this matters:**
Integration tests that spawn subprocesses are ~10–50x slower than unit tests and harder to debug on failure. Logic bugs that could be caught by a fast unit test currently require a full CLI round-trip to surface. As the test suite grows this will compound.

