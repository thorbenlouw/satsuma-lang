---
id: sl-4asu
status: closed
deps: []
links: []
created: 2026-03-30T06:28:59Z
type: chore
priority: 2
assignee: Thorben Louw
---
# consolidate tree-sitter WASM parser init into @satsuma/core

Both satsuma-cli/src/parser.ts and vscode-satsuma/server/src/parser-utils.ts implement a singleton pattern for loading the tree-sitter WASM grammar (initParser / getParser). The logic is nearly identical; the only difference is how the WASM file path is resolved (CLI uses createRequire; LSP uses a locateFile callback for esbuild bundling).

This means parser initialisation is tested implicitly (through commands/LSP startup) rather than in isolation, and any change to WASM loading must be made in two places.

## Design

Add satsuma-core/src/parser.ts:
- initParser(options?: { locateWasm?: (name: string) => string }): Promise<void>
- getParser(): Parser
- getLanguage(): Language

The locateWasm hook is optional; default resolves relative to the package. CLI and LSP pass their own resolver if needed.

Singleton state lives in core. Both consumers call initParser() once at startup, then getParser() / getLanguage() as needed.

satsuma-cli/src/parser.ts and the init portions of vscode-satsuma/server/src/parser-utils.ts are replaced with imports from @satsuma/core.

## Acceptance Criteria

**Correctness**
- @satsuma/core exports initParser, getParser, getLanguage
- satsuma-cli no longer has its own parser singleton; imports from @satsuma/core
- vscode-satsuma/server no longer has its own parser singleton; imports from @satsuma/core
- All CLI and LSP tests pass

**Code quality**
- satsuma-core/src/parser.ts reads as a clear, self-contained module: doc-comments explain the singleton lifecycle, when locateWasm is needed, and what callers can expect from getParser() before init (Literate Programming style)
- No duplicate init paths, no dead fallback code carried over from the old implementations

**Tests**
- satsuma-core/test/parser.test.js is the single authoritative suite for parser init behaviour; any overlapping tests from CLI or LSP that were testing the same init logic are removed from those packages (not duplicated)
- Each test case has a leading comment explaining *why* the scenario matters (e.g. "re-init must be idempotent — callers in the CLI invoke initParser() per-command without coordinating with each other")
- Covers: first init succeeds, re-init is a no-op, getParser() throws before init, locateWasm override is used when provided
- No tests that exist only to confirm that a function exists or returns without throwing — every case validates a meaningful behavioural contract


## Notes

**2026-03-30T06:57:47Z**

Cause: initParser/getParser singletons were duplicated in satsuma-cli/src/parser.ts and vscode-satsuma/server/src/parser-utils.ts with slightly different WASM path handling.
Fix: created satsuma-core/src/parser.ts with initParser(wasmPath, options?)/getParser()/getLanguage(); CLI parser.ts is now a thin re-export wrapper; LSP parser-utils.ts removed its singleton, re-exports from core; server.ts updated to pass locateFile option for esbuild path resolution. (commit pending)
