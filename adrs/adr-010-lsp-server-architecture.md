# ADR-010 — LSP Server Architecture

**Status:** Accepted
**Date:** 2026-03 (retrospective, PR #47)

## Context

Satsuma needed IDE support beyond TextMate-level syntax highlighting: document symbols, parse-error diagnostics, semantic tokens, hover, code folding, go-to-definition, find-references, completions, rename, code lens, and mapping coverage. The question was how to deliver these features inside VS Code without coupling the implementation to the VS Code extension API.

The alternatives considered were:

- **Inline extension logic** — implement all features directly in the VS Code extension client using the `vscode` API. Simpler setup, but locks the implementation to a single editor and prevents reuse.
- **Language Server Protocol (LSP)** — a standalone server process that any LSP-capable editor can connect to. Requires more wiring (client/server split, transport, capability negotiation) but decouples the intelligence from the editor.

## Decision

Build the language server as a Node.js process using `vscode-languageserver` / `vscode-languageclient` with IPC transport. The server backs all features against tree-sitter CST traversal (via ADR-001/002) and exposes custom LSP requests (`satsuma/blockNames`, `satsuma/fieldLocations`) for features that go beyond the standard protocol.

The server source lives in `tooling/vscode-satsuma/server/src/`. The client lives in `tooling/vscode-satsuma/src/extension.ts`. Both are bundled into a single `.vsix` package using esbuild, which produces a CJS bundle for the server (`server/dist/server.js`) and a separate bundle for the client.

esbuild was chosen over webpack/rollup because it was already in use for the viz webview and produces fast, deterministic builds with minimal configuration.

## Consequences

**Positive:**
- All 10+ IDE features are backed by the same tree-sitter CST — no separate parsing layer
- The LSP protocol means the server is theoretically reusable by Neovim, Emacs, or any LSP client
- Custom requests (`satsuma/blockNames`, `satsuma/fieldLocations`) allow command-palette features (coverage, lineage) to query the server without shelling out to the CLI
- IPC transport avoids port conflicts and network overhead
- esbuild bundles produce a lean ~500 KB `.vsix` with no source maps or TypeScript source

**Negative:**
- The server currently depends on the `satsuma` CLI binary for workspace-level validation (`satsuma validate --json`), creating a runtime dependency outside the bundle
- esbuild's CJS output requires shimming `import.meta.url` for web-tree-sitter's internal `createRequire()` calls (see PR #146)
- Custom LSP requests are not standardized — any non-VS Code client would need bespoke wiring
