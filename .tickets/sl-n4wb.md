---
id: sl-n4wb
status: open
deps: [sl-fgqt, sl-pxw5]
links: []
created: 2026-03-29T18:50:51Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): CLI — complete migration to satsuma-core, delete duplicated extraction code

Complete the CLI side of the migration: replace all re-export shims with direct satsuma-core imports throughout CLI source files, and delete the now-empty shim files.

Changes:
1. Delete or fully hollow out: satsuma-cli/src/classify.ts, canonical-ref.ts, meta-extract.ts, extract.ts, spread-expand.ts — any logic that was moved to satsuma-core should no longer have a copy in these files
2. Update all CLI src/*.ts files that import from these local modules to import from '@satsuma/core' instead
3. index-builder.ts: update to import extract* functions from '@satsuma/core', wrap WorkspaceIndex into the EntityFieldLookup callback for expandSpreads calls
4. nl-ref-extract.ts: update to import BacktickRef, extractBacktickRefs, classifyRef from '@satsuma/core/nl-ref' (or '@satsuma/core'), keep resolveRef/extractNLRefData/resolveAllNLRefs locally since they need WorkspaceIndex
5. Run: npm run build && npm test in satsuma-cli
6. Verify golden snapshot test still passes byte-for-byte

The CLI workspace.ts, commands/*.ts, lint-engine.ts, validate.ts, graph-builder.ts files should need minimal changes — they call index-builder functions, not extract functions directly.

## Acceptance Criteria

1. No extraction logic remains duplicated in satsuma-cli/src/ — all ext*() functions are imported from @satsuma/core 2. All 27 CLI test files pass 3. Golden snapshot test (from sl-8pj3) passes byte-for-byte 4. npm audit reports no new high/critical vulnerabilities 5. satsuma CLI binary works end-to-end: satsuma graph examples/ produces correct output 6. satsuma-cli package.json devDependencies unchanged (no new deps needed)

