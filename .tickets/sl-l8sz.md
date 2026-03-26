---
id: sl-l8sz
status: open
deps: [sl-yn9m]
links: []
created: 2026-03-26T17:34:03Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-661o
tags: [cli, wasm, ci]
---
# Simplify release workflow to single universal CLI build

Consolidate the 4-platform release matrix to a single build that produces one universal satsuma-cli.tgz with WASM. Upload under all 4 platform names for backwards compatibility. Update install docs in site/cli.njk, SATSUMA-CLI.md, CLAUDE.md, and learn page.

## Acceptance Criteria

- Release workflow builds one universal tarball
- Same tarball uploaded under all platform names (backwards compat)
- Install docs updated across site and repo docs
- CLAUDE.md updated to reflect WASM-only toolchain
- No native compilation in release workflow

