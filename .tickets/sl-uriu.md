---
id: sl-uriu
status: closed
deps: []
links: []
created: 2026-03-30T09:45:33Z
type: task
priority: 2
assignee: Thorben Louw
tags: [ci, testing, smoke-tests, bdd]
---
# Wire smoke tests into CI and run-repo-checks; convert to BDD (Gherkin)

The smoke-tests/ directory contains Python pytest tests that call the live satsuma CLI against fixture files. These are true end-to-end integration tests but are not currently run in CI or in the pre-commit repo checks. They should be wired in. Since they are e2e/integration tests, they should be rewritten using BDD (Gherkin) style via pytest-bdd so that each scenario reads as a plain-English specification of CLI behaviour.

## Acceptance Criteria

- Smoke tests are converted to pytest-bdd (Gherkin .feature files + step definitions)
- A new CI job (or extension of an existing one) runs the smoke tests against the built CLI
- satsuma binary (or node tooling/satsuma-cli/dist/index.js) is available on PATH in the CI job
- run-repo-checks.sh runs the smoke tests locally (requiring satsuma to be on PATH, with a clear skip/error message if not)
- All existing smoke test scenarios pass
- New .feature files live alongside their step definitions in smoke-tests/

## Notes

**2026-03-30**

Cause: The smoke-tests/ directory contained pytest tests (test_arrows.py, lineage.py) that were never wired into CI or run-repo-checks.sh, and lineage.py referenced a fixture path that did not exist.
Fix: Converted all 43 arrow scenarios and introduced 4 new substantive lineage scenarios as pytest-bdd .feature files with shared step definitions in smoke-tests/conftest.py; added a `smoke-tests` CI job that packs and installs the CLI then runs pytest; updated run-repo-checks.sh to skip gracefully when satsuma is not on PATH.
