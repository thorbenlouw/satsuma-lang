---
id: cbh-1uu9
status: open
deps: []
links: []
created: 2026-03-25T11:11:12Z
type: bug
priority: 2
assignee: Thorben Louw
---
# CLI --version reports 0.1.0 after build claiming v0.2.0

## Steps to reproduce
1. Build and install the updated CLI (claimed v0.2.0)
2. Run: satsuma --version

## Expected
Output: 0.2.0

## Actual
Output: 0.1.0

The version field in package.json was not bumped before the build, so the globally linked binary still reports the old version. This affects any tooling or agents that check the CLI version for compatibility.

