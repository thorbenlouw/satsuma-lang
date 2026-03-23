# VS Code Satsuma Extension

Full language support for the Satsuma data mapping language: syntax highlighting, an LSP server with navigation and completions, and interactive workspace visualization.

## Install

### From GitHub Release (recommended)

Download `vscode-satsuma.vsix` from the [latest release](https://github.com/thorbenlouw/satsuma-lang/releases/tag/latest) and install:

```bash
code --install-extension vscode-satsuma.vsix
```

### From Source

```bash
cd tooling/vscode-satsuma
npm install
cd server && npm install && cd ..
npm run build
npx @vscode/vsce package --no-dependencies -o vscode-satsuma.vsix
code --install-extension vscode-satsuma.vsix
```

### Extension Development Host

1. Open the repo root in VS Code.
2. Press **F5** to launch the Extension Development Host.
3. Open any `.stm` file — the extension activates automatically.

## Prerequisites

- **VS Code** 1.85+
- **Node.js** 20+ (for building from source)
- **`satsuma` CLI** on PATH (for validation diagnostics, commands, and webviews). Install from the [latest release](https://github.com/thorbenlouw/satsuma-lang/releases/tag/latest).

## Features

### Syntax Highlighting

TextMate grammar for all Satsuma constructs (keywords, types, metadata, strings, comments, operators). Works immediately with no dependencies.

Semantic tokens from the LSP server override TextMate scopes for context-sensitive constructs (`source`/`target` as keyword vs. field name, `map` as keyword vs. identifier, vocabulary tokens, etc.).

### Diagnostics

- **Parse errors** — red squiggles in real time as you type (tree-sitter ERROR/MISSING nodes).
- **Semantic warnings** — yellow squiggles on save via `satsuma validate` (undefined schemas, duplicate names, broken imports).
- **Warning comments** (`//!`) — appear as warnings in the Problems panel.
- **Question comments** (`//?`) — appear as information in the Problems panel.

### Navigation

- **Go-to-Definition** (Ctrl+Click / F12) — jump from schema name in `source`/`target` to its definition, fragment spread to fragment block, import name to imported definition, import path to file.
- **Find References** (Shift+F12) — find all usages of a schema, fragment, or transform across the workspace.
- **Rename Symbol** (F2) — rename a schema, fragment, transform, or mapping across all files. Refuses duplicate names. Handles namespace-qualified references.

### IntelliSense

- **Completions** — context-aware suggestions:
  - Schema names inside `source { }` / `target { }`
  - Fragment and transform names after `...`
  - Field names from source/target schemas in arrow paths
  - Metadata vocabulary tokens inside `( )` (pk, pii, scd, required, etc.)
  - Transform functions in pipe chains (trim, lowercase, coalesce, etc.)
  - Block names in `import { }` declarations

### Document Structure

- **Outline Panel** — schemas, mappings, fragments, transforms, metrics, namespaces, and notes with nested fields and children.
- **Breadcrumbs** — automatic from document symbols.
- **Code Folding** — all block types foldable (schema, mapping, fragment, transform, metric, note, namespace, each, flatten, map literal, metadata, nested arrow).
- **Hover** — contextual markdown info for blocks, fields, tags, spreads, arrow paths, and pipeline functions.

### CodeLens

Inline annotations above blocks:

- **Schema** — `N fields | used in M mappings`
- **Mapping** — `source → target | N arrows`
- **Fragment** — `spread in N places`
- **Transform** — `used in N places`
- **Metric** — `sources: schema1, schema2`

### Command Palette

Nine commands available via `Ctrl+Shift+P`:

| Command | Description |
|---|---|
| **Satsuma: Validate Workspace** | Run `satsuma validate` and populate the Problems panel |
| **Satsuma: Show Lineage From...** | Pick a schema and trace its downstream lineage |
| **Satsuma: Where Used** | Find all references to the symbol under cursor |
| **Satsuma: Show Warnings** | Show all `//!` warnings in the Problems panel |
| **Satsuma: Show Workspace Summary** | Display workspace statistics |
| **Satsuma: Show Arrows for Field** | Show all arrows involving a field |
| **Satsuma: Show Workspace Graph** | Open interactive workspace graph webview |
| **Satsuma: Trace Field Lineage** | Open field-level lineage webview |
| **Satsuma: Show Mapping Coverage** | Show mapped/unmapped fields with gutter markers |

### Workspace Graph

`Satsuma: Show Workspace Graph` opens an interactive SVG diagram of your workspace:

- **Nodes** by block type: schemas (rectangles), mappings (diamonds), metrics (circles), fragments (rounded rectangles)
- **Edges** show data flow between schemas and mappings
- **Click** a node to jump to its definition
- **Namespace filter** dropdown to focus on a single namespace
- **Auto-refreshes** on file save

### Field-Level Lineage

`Satsuma: Trace Field Lineage` traces a field through the entire data pipeline:

- Multi-hop chain tracing via `satsuma arrows`
- Horizontal flow: `source.field → [transform] → target.field`
- NL transforms displayed with distinct styling
- Click any node to navigate to the definition

### Mapping Coverage

`Satsuma: Show Mapping Coverage` shows which target fields are mapped:

- Green gutter markers for mapped fields
- Red gutter markers for unmapped fields
- Status bar shows coverage percentage
- Works from cursor position inside any mapping block

## Configuration

| Setting | Default | Description |
|---|---|---|
| `satsuma.cliPath` | `"satsuma"` | Path to the `satsuma` CLI executable |

## Running Tests

```bash
cd tooling/vscode-satsuma

# All tests (TextMate + LSP)
npm run check

# TextMate grammar tests only
npm test

# LSP server tests only (142 tests)
npm run test:lsp

# Build .vsix locally
npm run package
```

## Architecture

```
tooling/vscode-satsuma/
  src/
    extension.ts              Client: LSP lifecycle, commands, webview panels
    commands/                 Command handlers (CLI integration)
    webview/graph/            Workspace graph webview (SVG + D3-free layout)
    webview/lineage/          Field lineage webview (horizontal chain)
  server/
    src/
      server.ts               LSP server: connection, capabilities, handlers
      workspace-index.ts      Cross-file symbol table
      definition.ts           Go-to-definition
      references.ts           Find references
      completion.ts           Context-aware completions
      codelens.ts             Inline annotations
      rename.ts               Workspace-wide rename
      diagnostics.ts          Parse error diagnostics
      validate-diagnostics.ts Semantic diagnostics (CLI integration)
      symbols.ts              Document symbols / outline
      folding.ts              Code folding
      semantic-tokens.ts      Parser-backed semantic highlighting
      hover.ts                Contextual hover information
      parser-utils.ts         Tree-sitter helpers
  syntaxes/
    satsuma.tmLanguage.json   TextMate grammar
```
