# ADR-002 — WASM over Native Tree-Sitter Bindings

**Status:** Accepted
**Date:** 2026-03 (retrospective)

## Context

tree-sitter provides two Node.js APIs:
- `node-tree-sitter` — native Node.js binding via `node-gyp`. Requires a C compiler at install time. Produces platform-specific `.node` binary files.
- `web-tree-sitter` — WebAssembly-based binding. Runs in any JS runtime. Requires one-time async `Parser.init()` before use. Platform-independent.

The VS Code extension's LSP server (`vscode-satsuma/server/`) was originally the first consumer to need tree-sitter. The VS Code extension packaging workflow strongly prefers bundled, platform-independent binaries — shipping a native `.node` file would require per-platform builds and extension marketplace complexity.

The CLI (`satsuma-cli/`) was migrated to WASM as part of Feature 24 (CLI WASM Migration) to eliminate the last native dependency in the repo.

## Decision

Use `web-tree-sitter` (WASM) exclusively across all packages. No native `node-tree-sitter` binding is used anywhere in the repo.

The WASM binary (`satsuma.wasm`) is checked into `tooling/tree-sitter-satsuma/` and copied to consumers during their build step.

Parser initialization is async (must `await Parser.init()`). Both the CLI and the LSP server use the same pattern:
```typescript
let _initPromise: Promise<void> | null = null;
export function initParser(wasmPath: string): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = /* ... */;
  return _initPromise;
}
```
Subsequent calls to `initParser()` are no-ops; `getParser()` is then synchronous.

## Consequences

**Positive:**
- `npm install` in any package directory requires only Node.js — no C compiler, Python, or platform-specific toolchain
- Single universal distribution: one `satsuma-cli.tgz` works on macOS, Linux, and Windows
- The WASM file is version-controlled alongside the grammar, so grammar and runtime stay in sync
- Agents in sandboxed environments (e.g. Claude Code sandbox) can install and use the CLI without native build support

**Negative:**
- The WASM file is ~4 MB and is checked into the repo (tolerable for a developer tool)
- Parser initialization is async; CLI commands must `await initParser()` before parsing. This adds a small startup cost but is negligible compared to file I/O.
- The `web-tree-sitter` types are less ergonomic than the native API — `Node` (not `SyntaxNode`) is the primary type, and some APIs differ subtly
