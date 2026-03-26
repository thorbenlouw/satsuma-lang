---
id: sl-yn9m
status: open
deps: [sl-75u3]
links: []
created: 2026-03-26T17:33:56Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-661o
tags: [cli, wasm, tree-sitter]
---
# Remove native binding artifacts from tree-sitter-satsuma

Remove node-addon-api and node-gyp-build from tree-sitter-satsuma/package.json dependencies. Update root install:all script to remove native build steps for CLI. Simplify CI install job (remove native build caching).

## Acceptance Criteria

- tree-sitter-satsuma/package.json has no node-addon-api or node-gyp-build in deps
- install:all still works end-to-end
- CI install job simplified
- tree-sitter corpus tests still pass

