# ADR-019 — pytest-bdd for End-to-End Smoke Tests

**Status:** Accepted
**Date:** 2026-03 (retrospective, PR #144)

## Context

The Satsuma CLI has 16 commands, each producing structured output (JSON, text, formatted tables). The JavaScript test suite (`tooling/satsuma-cli/test/`) covers unit and integration behavior thoroughly, but tests the CLI through imported functions — not through the actual CLI binary as a user would invoke it.

End-to-end smoke tests were needed to verify that the installed CLI binary produces correct output for real `.stm` workspaces. These tests exercise the full path: command-line argument parsing → file discovery → tree-sitter parsing → extraction → output formatting.

The question was which test framework to use:

- **JavaScript (vitest/jest)** — same language as the CLI; could shell out to the binary with `child_process.exec`. But this mixes concerns: the JS test suite tests internal behavior, while smoke tests should test the external interface.
- **Shell scripts (bats)** — natural for CLI testing, but limited assertion capabilities and poor error reporting.
- **Python (pytest)** — rich assertion library, good subprocess handling, readable test output. Introduces a second language runtime.
- **Python (pytest-bdd)** — adds Gherkin-style `.feature` files on top of pytest, making test scenarios readable by non-developers (e.g., product owners reviewing acceptance criteria).

## Decision

Use pytest-bdd with Gherkin `.feature` files for end-to-end smoke tests.

Test scenarios live in `smoke-tests/` with `.feature` files describing behavior in Given/When/Then format and Python step definitions implementing them. The tests invoke the `satsuma` CLI binary via `subprocess.run()` and assert on exit codes, JSON output structure, and text output content.

The smoke test suite runs in CI as a separate job, after the CLI build job produces the binary.

## Consequences

**Positive:**
- `.feature` files are human-readable specifications that serve as living documentation of CLI behavior
- pytest-bdd separates the "what" (Gherkin scenarios) from the "how" (Python step definitions) — scenarios can be reviewed without reading implementation code
- Python's `subprocess` and `json` modules handle CLI invocation and output parsing cleanly
- The smoke tests are genuinely end-to-end: they test the built binary, not imported functions
- pytest's rich assertion diffs make failures easy to diagnose

**Negative:**
- Introduces Python as a second language runtime in the project (alongside Node.js)
- Contributors must have Python 3 and pytest-bdd installed to run smoke tests locally
- CI must install Python dependencies in addition to Node.js dependencies
- Step definitions can become verbose if many scenarios share similar-but-not-identical setup
