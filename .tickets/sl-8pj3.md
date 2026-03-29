---
id: sl-8pj3
status: closed
deps: []
links: []
created: 2026-03-29T18:49:16Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): golden output snapshot + test baseline

Capture a reference snapshot of CLI output and record test counts before any code is moved. This is the regression safety net for all subsequent F26 tickets.

## Acceptance Criteria

1. `satsuma graph --json` run over all examples produces a snapshot file committed at `test/fixtures/golden-graph-output.json` (or similar location in satsuma-cli/test/) 2. Snapshot includes output for every .stm file in examples/ 3. A test asserts that current output is byte-for-byte identical to the snapshot 4. README note added near test/fixtures explaining the golden file purpose 5. CLI test count and LSP server test count documented in a comment in the snapshot file header


## Notes

**2026-03-29T20:27:23Z**

Cause: No golden snapshot existed as a regression safety net for graph --json extraction output. Fix: Created test/fixtures/golden-graph-output.json and test/golden-graph.test.js asserting byte-for-byte equality after normalization of timestamps and absolute paths.
