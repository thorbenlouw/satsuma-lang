# VS Code Satsuma Extension

Language support for the Satsuma data mapping language: syntax highlighting (TextMate) plus a Language Server providing document symbols, diagnostics, and code folding.

## Prerequisites

- **Node.js** 20+ (native tree-sitter bindings require compilation)
- **VS Code** 1.85+

## Installation (local development)

```bash
cd tooling/vscode-satsuma

# Install client dependencies
npm install

# Install and build the language server
cd server
npm install
npm run build
cd ..

# Build the extension client
npm run build
```

### Running in VS Code

1. Open the repo root in VS Code.
2. Press **F5** to launch the Extension Development Host.
3. Open any `.stm` file — the language server activates automatically.

### Installing from `.vsix`

```bash
cd tooling/vscode-satsuma
npx @vscode/vsce package --no-dependencies
code --install-extension vscode-satsuma-0.3.0.vsix
```

## Features

### TextMate Syntax Highlighting

Regex-based syntax colouring for all Satsuma constructs. Works immediately, no build step.

### Language Server (Phase 1)

Parser-backed features using tree-sitter:

- **Document Symbols / Outline** — schemas, mappings, fragments, transforms, metrics, namespaces, and notes appear in the Outline panel. Fields appear as children. Nested record/list structures appear as nested entries.
- **Diagnostics** — parse errors show as red squiggles in real time. `//!` warning comments appear as warnings in the Problems panel. `//?` question comments appear as information.
- **Code Folding** — all block types (schema, mapping, fragment, transform, metric, note, namespace, each, flatten, map literal, metadata, nested arrow) are foldable.

## Running Tests

From `tooling/vscode-satsuma/`:

```bash
# Run all tests (TextMate + LSP)
npm run check

# TextMate grammar tests only
npm test

# LSP server tests only
npm run test:lsp

# Focused fixture tests only
npm run test:fixtures

# Golden fixture tests only
npm run test:golden

# Validate manifest + grammar JSON
npm run validate
```

TextMate tests use [`vscode-tmgrammar-test`](https://github.com/nicolo-ribaudo/vscode-tmgrammar-test) (CI-safe, no VS Code instance needed). LSP tests use Node's built-in test runner against the tree-sitter parser directly.

## Grammar Authoring

The TextMate grammar is in `syntaxes/satsuma.tmLanguage.json` — plain JSON, no build step. Edit it directly; reload the Extension Development Host to preview changes.

## Known Approximation Limits

The TextMate grammar handles several constructs approximately due to regex-only matching. The Language Server's semantic tokens (planned for a future phase) will resolve these:

- **`source` / `target` as keywords vs. field names** — both scoped as keywords everywhere.
- **`map` as keyword vs. field name** — highlighted as keyword everywhere.
- **`list` / `record` as keywords vs. field names** — highlighted as keywords inside schema bodies.
- **Pipeline tokens as field names** — `trim`, `filter`, `format` etc. only highlighted inside `{}` arrow bodies.
- **Vocabulary tokens as field names** — constraint/format tokens only matched inside `()` metadata blocks.

## Theme Verification

Before releases, verify highlighting in:

- **Dark+** (VS Code default dark)
- **Light+** (VS Code default light)
- **One Dark Pro** (popular community theme)

Checklist:

- [ ] Keywords coloured distinctly from identifiers
- [ ] `import` / `from` coloured as control-flow keywords
- [ ] Strings (double-quoted NL, triple-quoted Markdown, single-quoted labels, backtick identifiers) each coloured
- [ ] Comments visually de-emphasised
- [ ] Vocabulary tokens in `()` metadata distinguishable from field names
- [ ] Pipeline function tokens highlighted inside `{}` bodies
- [ ] `//!` and `//?` fall back gracefully in themes that don't distinguish them
