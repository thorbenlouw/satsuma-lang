# Feature 24 — Migrate CLI from Native Tree-Sitter to WASM

> **Status: NOT STARTED**

## Goal

Replace the CLI's native tree-sitter binding (`tree-sitter` + `node-gyp-build`) with `web-tree-sitter` (WASM), eliminating the C compiler requirement for contributors and installers. The VS Code extension already uses WASM successfully — apply the same approach to the CLI for a fully portable, single-platform distribution.

---

## Problem

The CLI's native tree-sitter binding is the **only component in the repo** that requires a C compiler. This causes:

1. **Install failures** — `npm install` in the CLI or via `install:all` fails if the system lacks a C toolchain (Xcode CLT on macOS, build-essential on Linux, MSVC on Windows).
2. **Contributor friction** — new contributors hit native build errors before they can run a single test.
3. **4-platform release matrix** — the release workflow builds separate tarballs for `darwin-arm64`, `darwin-x64`, `linux-x64`, and `win32-x64`, each embedding platform-specific native `.node` files.
4. **Sandboxed agent limitation** — agents running in sandboxed environments (e.g. Claude Code sandbox) cannot build native bindings, requiring manual `install:all` outside the sandbox.

The VS Code extension already solved this by migrating its LSP server to `web-tree-sitter` (WASM). The WASM file is platform-independent, checked into the repo, and loads in ~10ms.

---

## Design Principles

1. **Same public API.** `parseFile()` and `parseSource()` remain synchronous. Only the one-time initialization is async.
2. **Reuse the VS Code server's proven pattern.** The `initParser(wasmPath)` + cached promise pattern from `parser-utils.ts` is battle-tested.
3. **Single universal package.** One `satsuma-cli.tgz` works on all platforms. No more platform matrix in the release workflow.
4. **Zero native dependencies.** After migration, `npm install` in the CLI directory requires only Node.js — no C compiler, no Python, no platform-specific toolchain.

---

## Non-Goals

- Changing the CLI's command interface or output format.
- Migrating the tree-sitter corpus tests (they still use `tree-sitter-cli` which has its own WASM/native handling).
- Performance optimization — WASM is fast enough for this workload.

---

## Architecture

### Parser Initialization

Current (native, synchronous):
```typescript
const Parser = require("tree-sitter");
const STM = require("tree-sitter-satsuma");
_parser = new Parser();
_parser.setLanguage(STM);
```

New (WASM, async init + sync parse):
```typescript
const TreeSitter = (await import("web-tree-sitter")).default;
await TreeSitter.init();
const lang = await TreeSitter.Language.load(wasmPath);
_parser = new TreeSitter();
_parser.setLanguage(lang);
```

The `initParser(wasmPath)` call happens once in `index.ts` via top-level `await`, before any command is registered. After init, `parseFile()` and `parseSource()` are synchronous — no changes needed in the 19 command files.

### WASM File Distribution

Two WASM files are needed at runtime:
- `tree-sitter.wasm` — the web-tree-sitter runtime (from `node_modules/web-tree-sitter/`)
- `tree-sitter-satsuma.wasm` — the Satsuma grammar (from `tooling/tree-sitter-satsuma/`)

The prebuild script copies both into `dist/` alongside the compiled JS. The CLI resolves them via `__dirname`.

### Release Simplification

The release workflow currently runs a 4-platform matrix to produce:
- `satsuma-cli-darwin-arm64.tgz`
- `satsuma-cli-darwin-x64.tgz`
- `satsuma-cli-linux-x64.tgz`
- `satsuma-cli-win32-x64.tgz`

With WASM, a single build produces one universal `satsuma-cli.tgz`. For backwards compatibility, the workflow can upload the same tarball under all four platform names (so existing install commands keep working) or we can update the install docs to point at the universal package.

---

## TODO

### Phase 1: Core WASM migration
- [ ] Rewrite `src/parser.ts` to use `web-tree-sitter` with async `initParser()`
- [ ] Add `await initParser(wasmPath)` to `src/index.ts` before command dispatch
- [ ] Copy `web-tree-sitter.d.ts` type overrides from VS Code server
- [ ] Swap `package.json` deps: remove `tree-sitter` + `tree-sitter-satsuma`, add `web-tree-sitter`
- [ ] Extend `scripts/prebuild.js` to copy WASM files into `dist/`
- [ ] Update test setup to call `initParser()` before tests that use `parseSource()`
- [ ] Verify all 824+ CLI tests pass

### Phase 2: Remove native artifacts
- [ ] Remove `node-addon-api` and `node-gyp-build` from `tree-sitter-satsuma/package.json`
- [ ] Update root `install:all` script (no native build step needed for CLI)
- [ ] Simplify CI install job (remove native build caching)

### Phase 3: Simplify release
- [ ] Consolidate release matrix to single universal build
- [ ] Produce one `satsuma-cli.tgz` + platform-name aliases for backwards compatibility
- [ ] Update install docs in site, SATSUMA-CLI.md, CLAUDE.md

---

## Acceptance Criteria

1. `cd tooling/satsuma-cli && npm install` succeeds without a C compiler
2. `npm test` passes all existing tests (824+)
3. `satsuma summary examples/` produces identical output to native version
4. `satsuma validate examples/` produces identical output
5. One universal `satsuma-cli.tgz` works on macOS (ARM + Intel), Linux, and Windows
6. No `node-gyp`, `node-addon-api`, or `binding.gyp` referenced in CLI dependencies
7. `web-tree-sitter.d.ts` type overrides prevent nullable SyntaxNode arrays
8. CI passes without native compilation steps for the CLI

---

## Risks

- **WASM init latency:** ~10-20ms one-time cost. Imperceptible for a CLI tool.
- **WASM parsing performance:** ~2-5x slower than native for large files. The CLI processes small `.stm` files (typically <500 lines). Not a concern.
- **Type compatibility:** The `web-tree-sitter` types differ slightly from native `tree-sitter`. Mitigated by the `.d.ts` override file (proven in VS Code server).
- **Breaking install commands:** Existing users may have platform-specific URLs bookmarked. Mitigated by uploading the universal tarball under all platform names.
