---
id: fcrw-m94f
status: in_progress
deps: []
links: []
created: 2026-03-27T10:30:47Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, release, wasm, ci]
---
# Fail CLI release packaging when parser WASM is missing

The v0.4.0 CLI release tarball omitted dist/tree-sitter-satsuma.wasm, causing installed CLIs to fail immediately at startup with ENOENT. Tighten packaging so CI builds the parser WASM before packing and fails if required assets are missing.

## Acceptance Criteria

Release build generates tooling/tree-sitter-satsuma/tree-sitter-satsuma.wasm before packing the CLI
CLI prebuild fails fast when required WASM assets are missing
Packed satsuma-cli.tgz is verified to include dist/tree-sitter-satsuma.wasm and dist/web-tree-sitter.wasm
Relevant CLI tests pass locally

