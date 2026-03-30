# ADR-021 — Extract satsuma-lsp as an Editor-Agnostic Package

**Status:** Accepted
**Date:** 2026-03-30
**Extends:** ADR-010 (LSP Server Architecture — noted the server is "theoretically reusable by Neovim, Emacs, or any LSP client"; this ADR makes that reuse practical)

## Context

The LSP server implementation currently lives inside `vscode-satsuma/server/`.
It is a fully functional Language Server Protocol server with ~6,100 lines of
source code providing: workspace indexing, viz model building, hover,
completions, go-to-definition, find-references, rename, CodeLens, semantic
tokens, diagnostics, formatting, folding, and document symbols.

Despite living inside the VSCode extension, the server has **zero VSCode
dependencies.** It imports only from:

- `vscode-languageserver` (generic LSP protocol types)
- `vscode-languageserver-textdocument` (generic document abstraction)
- `web-tree-sitter` (language-agnostic parsing)
- `@satsuma/core` (extraction library)
- `@satsuma/viz-model` (visualisation type contract)

This means the server is already editor-agnostic in implementation — but its
packaging couples it to the VSCode extension. A Neovim, Helix, Zed, Emacs, or
IntelliJ user cannot use the language server without installing the VSCode
extension's npm package, which carries unnecessary VSCode client dependencies
and extension manifest configuration.

Additionally, the ongoing core consolidation work (ADR-020) targets the LSP
server's extraction logic. Having the server in its own package with its own
test suite makes this migration cleaner — changes to the LSP's wiring layer
don't require building or testing the VSCode extension.

Alternatives considered:

1. **Keep server inside vscode-satsuma** — works, but blocks non-VSCode editor
   support and couples LSP test/build cycle to VSCode extension packaging.
2. **Make the CLI the language server** — the CLI already has a workspace index,
   but its index is optimised for batch commands, not incremental document
   updates. The LSP's document-synchronisation model is fundamentally different.
3. **Extract server as `satsuma-lsp`** — the chosen approach.

## Decision

Extract `vscode-satsuma/server/` into a new top-level package at
`tooling/satsuma-lsp/`.

### What moves to satsuma-lsp

All files currently in `vscode-satsuma/server/src/`:

- `server.ts` — LSP connection, handler routing, custom RPC
- `workspace-index.ts` — per-file symbol index
- `viz-model.ts` — VizModel builder
- All feature handlers: `hover.ts`, `completion.ts`, `definition.ts`,
  `references.ts`, `rename.ts`, `codelens.ts`, `semantic-tokens.ts`,
  `diagnostics.ts`, `semantic-diagnostics.ts`, `validate-diagnostics.ts`,
  `formatting.ts`, `folding.ts`, `symbols.ts`
- Supporting modules: `action-context.ts`, `coverage.ts`, `parser-utils.ts`
- Type declaration: `web-tree-sitter.d.ts`

The package exports the LSP server entry point (for programmatic embedding)
and can also be run as a standalone process via `node satsuma-lsp --stdio`.

### What stays in vscode-satsuma

- `src/extension.ts` — VSCode activation, LSP client instantiation
- `src/commands/` — editor commands (coverage, lineage, summary, validate, warnings)
- `src/webview/` — four webview panels (viz, field-lineage, lineage, schema-lineage)
- `syntaxes/` — TextMate grammar
- `language-configuration.json`
- `icons/`
- `package.json` (extension manifest with contributes section)

`vscode-satsuma` becomes a thin shell (~400 lines of source) that instantiates
the LSP client, registers commands, and manages webview panels. All language
intelligence is delegated to `satsuma-lsp`.

### Dependency changes

Before:
```
vscode-satsuma → @satsuma/core, @satsuma/viz-model, web-tree-sitter
```

After:
```
vscode-satsuma → @satsuma/lsp (via LSP client, not direct import)
satsuma-lsp    → @satsuma/core, @satsuma/viz-model, web-tree-sitter
```

`vscode-satsuma` no longer has a direct dependency on `@satsuma/core` or
`web-tree-sitter` — those are transitive through the LSP server.

### Non-VSCode editor usage

After extraction, any LSP-compatible editor can use the Satsuma language server:

```bash
# Neovim (via nvim-lspconfig)
require'lspconfig'.satsuma.setup { cmd = { "npx", "satsuma-lsp", "--stdio" } }

# Helix (languages.toml)
[language-server.satsuma]
command = "npx"
args = ["satsuma-lsp", "--stdio"]
```

## Consequences

**Positive:**

- Any LSP-capable editor gets Satsuma support without VSCode.
- The LSP server has its own test suite, build, and release cycle — decoupled
  from VSCode extension packaging.
- The core consolidation migration (ADR-020) targets a cleaner, standalone
  package rather than a nested directory inside an extension.
- Future tooling (web-based editor, CI validation service) can embed the LSP
  server programmatically.

**Negative:**

- One more package to maintain in the monorepo (mitigated by workspace-level
  npm scripts).
- `vscode-satsuma` must manage the LSP server as an external process or
  bundled dependency — slightly more complex extension packaging.
- The extraction itself is mechanical but touches build configuration, test
  paths, and import paths across both packages.
