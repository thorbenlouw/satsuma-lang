---
id: fcrw-m94f
status: closed
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


## Notes

**2026-03-27T10:33:09Z**

Cause: The release workflow packed the CLI without first generating tooling/tree-sitter-satsuma/tree-sitter-satsuma.wasm, and the CLI prebuild step only warned when the asset was missing.
Fix: Build the parser WASM in the release job, fail prebuild if required WASM assets are absent, and verify the packed tarball contains both WASM files before upload. (commit ba53173)
