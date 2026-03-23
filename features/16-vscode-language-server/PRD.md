# Feature 16 — VS Code Language Server for Satsuma

> **Status: NOT STARTED**

## Goal

Ship a VS Code extension that turns the existing TextMate syntax highlighter (Feature 07) into a full-featured language-aware editor experience for Satsuma. The extension combines a Language Server Protocol (LSP) server backed by the tree-sitter parser with VS Code-specific features (commands, webviews, CodeLens) that surface the CLI's structural analysis directly in the editor.

---

## Problem

Satsuma now has strong tooling foundations — a tree-sitter parser with 480+ corpus tests, a 16-command CLI for structural extraction (630+ tests), tree-sitter queries for highlights/locals/folds, and a TextMate grammar for basic syntax colouring. But the editing experience is still "coloured text in a file":

1. **No navigation.** A user reading a mapping that references `crm_customers` has to manually search for that schema. There is no go-to-definition, no find-references, no breadcrumb trail.
2. **No live feedback.** Validation errors and semantic warnings (`satsuma validate`) only surface when run from the terminal. Parse errors sit silently in the file.
3. **No structural overview.** The outline panel is empty. Users can't see or jump to schemas, mappings, fragments, or metrics without scrolling.
4. **No completions.** Writing `source { ... }` requires memorising schema names. Arrow targets require memorising field names. There is no IntelliSense.
5. **No lineage visibility.** The `satsuma lineage` and `satsuma graph` commands produce useful output, but only in the terminal. There is no way to visualise data flow in the editor.
6. **TextMate approximation limits.** Context-sensitive constructs (`source`/`target` as keyword vs. field name, `map` as keyword vs. identifier) can only be disambiguated by parser-backed semantic tokens, which require an LSP.

The tree-sitter queries (`locals.scm`, `highlights.scm`, `folds.scm`) were written specifically to enable an LSP. The CLI commands produce exactly the structured data an extension needs. The gap is the glue layer that connects these to the VS Code API.

---

## Design Principles

1. **Parser-backed, not heuristic.** Every feature derives from the tree-sitter CST or the CLI's structural analysis. No regex hacks in the extension.
2. **Workspace-aware.** Satsuma workspaces span multiple files. Navigation, completions, and diagnostics work across the entire workspace, not just the active file.
3. **CLI as the engine.** The extension calls `satsuma` CLI commands (via `--json`) for workspace-level operations rather than reimplementing extraction logic. The LSP server handles file-level operations directly via tree-sitter.
4. **Progressive enhancement.** Each phase delivers standalone value. Phase 1 (LSP core) is useful without Phase 2 (commands) or Phase 3 (visualisation).
5. **Offline and fast.** No network dependencies. Parse on keystroke. Workspace indexing on open/save.

---

## Non-Goals

- Embedding an LLM in the extension (NL interpretation stays with the user/agent, not the editor).
- Satsuma formatting or auto-fix (a separate `satsuma fmt` feature).
- Debugging or step-through execution (Satsuma is declarative, not executable).
- Publishing to the VS Code Marketplace in Phase 1 (local install via `.vsix` is fine initially).
- Supporting editors other than VS Code (Neovim/Zed tree-sitter integration is future work).

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   VS Code Extension                     │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  LSP Client  │  │  VS Code     │  │  Webview      │  │
│  │  (built-in)  │  │  Commands    │  │  Panels       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                 │           │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────┐  ┌──────────┐  ┌──────────────────┐
│   LSP Server     │  │ satsuma CLI  │  │  satsuma graph       │
│   (Node.js)      │  │ --json   │  │  --json           │
│                  │  └──────────┘  └──────────────────┘
│  tree-sitter-satsuma │
│  queries/*.scm   │
│  workspace index │
└──────────────────┘
```

### LSP Server

A standalone Node.js process using `vscode-languageserver` and `vscode-languageclient`. It loads `tree-sitter-satsuma` directly (same binding the CLI uses) and maintains an in-memory workspace index.

**Per-file (on edit):**
- Incremental tree-sitter parse
- Semantic tokens from `highlights.scm`
- Fold ranges from `folds.scm`
- Document symbols from CST block structure
- Diagnostics from parse errors (ERROR/MISSING nodes)

**Per-workspace (on open/save):**
- Index all `.stm` files: block names, field names, fragment names, transform names, import paths
- Reference graph for go-to-definition and find-references (powered by `locals.scm` patterns)
- Semantic validation (unresolved references, duplicate names) — equivalent to `satsuma validate`

### CLI Integration

For workspace-level operations that the CLI already handles well, the extension shells out to `satsuma <command> --json` rather than reimplementing:

- `satsuma lineage` — for lineage exploration commands
- `satsuma graph` — for visualisation data
- `satsuma where-used` — for cross-file reference search
- `satsuma warnings` — for warning/question aggregation
- `satsuma diff` — for structural comparison

### Extension Client

Standard VS Code extension (`vscode` API) that:
- Starts/stops the LSP server
- Registers commands in the command palette
- Manages webview panels for visualisation
- Provides CodeLens annotations on mappings and schemas

---

## Phased Delivery

### Phase 1 — LSP Core

The minimum viable language server. Delivers the features that make every keystroke better.

#### 1.1 Diagnostics

Surface parse errors and semantic warnings inline as the user types.

- **Parse errors:** Tree-sitter ERROR and MISSING nodes → `DiagnosticSeverity.Error` with file/line/column and a description derived from the surrounding CST context.
- **Semantic warnings:** Run on save (not on keystroke — too expensive for large workspaces):
  - Schema referenced in `source`/`target` but not defined in workspace
  - Fragment/transform spread referencing undefined name
  - Duplicate block names — including cross-type uniqueness violations (spec §2.8: all named definitions share a single name space, so a schema and a metric with the same name is an error)
  - Arrow source/target field not present in declared schema
  - Import path referencing a file that doesn't exist
- **Warning/question comments:** Surface `//!` as `DiagnosticSeverity.Warning` and `//?` as `DiagnosticSeverity.Information` so they appear in the Problems panel.

**Acceptance criteria:**
- [ ] Parse errors show as red squiggles within 200ms of typing
- [ ] Semantic warnings show as yellow squiggles on save
- [ ] `//!` and `//?` comments appear in the Problems panel
- [ ] Diagnostics clear when errors are fixed
- [ ] Multi-file workspace: referencing an undefined schema shows a warning

#### 1.2 Go-to-Definition

Click a schema name, fragment spread, or import path → jump to its definition.

Uses the `locals.scm` definition/reference captures:
- Schema name in `source`/`target` block → schema block label
- Fragment spread (`...name`) → fragment block label
- Transform spread (`...name`) → transform block label
- Namespace-qualified reference (`ns::name`) → definition within the namespace block
- Backtick reference (`` `schema.field` ``) → field declaration
- Import name → block label in the imported file
- Import path → open the referenced `.stm` file

**Acceptance criteria:**
- [ ] Ctrl+Click on a schema name in a source/target block jumps to the schema definition
- [ ] Ctrl+Click on a fragment spread jumps to the fragment block
- [ ] Ctrl+Click on an import path opens the file
- [ ] Ctrl+Click on a backtick path jumps to the referenced field
- [ ] Works across files in the workspace

#### 1.3 Find References

Right-click a schema/fragment/transform name → find all references across the workspace.

- Schema name → all source/target references, metric source references, backtick references
- Fragment name → all spread sites
- Transform name → all spread sites
- Field name → all arrows referencing that field

**Acceptance criteria:**
- [ ] Find References on a schema name lists all mappings that use it as source or target
- [ ] Find References on a fragment name lists all spread sites
- [ ] Results span multiple files

#### 1.4 Document Symbols & Outline

Populate the Outline panel and breadcrumbs with the structural hierarchy of a Satsuma file.

```
schema customers
  customer_id
  name
  email
  address (record)
    street
    city
    country
fragment 'audit fields'
mapping 'customer migration'
  source { ... }
  target { ... }
transform 'clean email'
metric monthly_recurring_revenue
```

- Top-level blocks → `SymbolKind.Class` (schema), `SymbolKind.Function` (mapping/transform), `SymbolKind.Constant` (metric), `SymbolKind.Interface` (fragment), `SymbolKind.Namespace` (namespace), `SymbolKind.File` (note)
- Metric blocks include the optional display label (e.g. `"MRR"`) in the symbol detail when present
- Fields → `SymbolKind.Field` as children
- Record/list → `SymbolKind.Struct` nested under the parent schema
- Namespace blocks contain their child definitions as nested symbols

**Acceptance criteria:**
- [ ] Outline panel shows all top-level blocks with names and kinds
- [ ] Namespace blocks appear as containers with their child definitions nested inside
- [ ] Note blocks appear in the outline
- [ ] Metric symbols include the display label (e.g. `"MRR"`) as detail text when present
- [ ] Fields appear as children of their parent schema/fragment
- [ ] Nested record/list blocks appear as nested children
- [ ] Breadcrumbs update as cursor moves through the file
- [ ] Clicking an outline entry jumps to the block

#### 1.5 Semantic Tokens

Upgrade from TextMate regex scoping to parser-backed semantic tokens for context-sensitive constructs.

Uses `highlights.scm` captures mapped to LSP semantic token types:
- `source`/`target` as keyword vs. field name (disambiguated by CST position)
- `map` as keyword vs. identifier
- `record`/`list_of` as keyword vs. type reference
- `each`/`flatten` as context-sensitive keywords (only valid inside mapping bodies per spec §2.6)
- `namespace` as keyword in namespace blocks
- Block labels get definition-specific token types
- Metric display labels (e.g. `"MRR"`) get `string` token type distinct from NL strings
- Vocabulary tokens in metadata get `decorator` type
- Error-handling tokens (`null_if_*`, `drop_if_*`, `warn_if_*`, `error_if_*`) get `function` type in pipelines
- Warning comments (`//!`) and question comments (`//?`) get distinct token types

**Acceptance criteria:**
- [ ] `source` highlights as keyword in `source { }` block header, as field name in a field declaration
- [ ] Block labels highlight as type definitions (schemas) or function definitions (mappings)
- [ ] Semantic tokens override TextMate scopes where they disagree
- [ ] Theme compatibility maintained with standard LSP token types

#### 1.6 Code Folding

Serve fold ranges from `folds.scm` via the LSP.

Already defined: schema, fragment, transform, mapping, metric, note, record, list, metadata, nested arrow, and map literal blocks.

**Acceptance criteria:**
- [ ] All block types are foldable
- [ ] Nested blocks fold independently
- [ ] Fold indicators appear in the gutter

#### 1.7 Hover

Show contextual information when hovering over identifiers.

- **Schema name** (in source/target/arrow): show field count, key metadata (pk, pii, scd), and the first line of any note
- **Field name** (in arrow): show type, metadata tags, and parent schema
- **Fragment name** (in spread): show field count and field names
- **Transform name** (in spread): show the transform body summary
- **Metric name**: show display label (if present), source schemas, grain, slice dimensions, and measure count
- **Namespace name**: show the count and names of contained definitions
- **Vocabulary token** (in metadata): show a brief description from a built-in token dictionary
- **Import path**: show the file path and block count

**Acceptance criteria:**
- [ ] Hovering a schema name in a mapping shows its field summary
- [ ] Hovering a field in an arrow shows its type and metadata
- [ ] Hover information loads within 100ms

#### 1.8 Developer Documentation

Ship a README update covering how to install and use the extension locally during Phase 1 (before Marketplace publishing).

**Acceptance criteria:**
- [ ] `tooling/vscode-satsuma/README.md` documents how to build the extension (install deps, compile the LSP server)
- [ ] Documents how to install locally via `.vsix` or the Extension Development Host (F5)
- [ ] Documents the features available in Phase 1 (diagnostics, navigation, outline, semantic tokens, folding, hover)
- [ ] Documents any prerequisites (Node.js version, `tree-sitter` native dependencies)
- [ ] Documents how to run the extension's test suite

---

### Phase 2 — Completions & Commands

Build on the workspace index to offer IntelliSense and surface CLI operations in the editor.

#### 2.1 Completions

Context-aware autocompletion powered by the workspace index.

| Context | Completion source |
|---|---|
| After `source {` or `target {` | Schema names in workspace |
| After `...` (spread) | Fragment and transform names |
| Arrow source path (left of `->`) | Fields from source schemas of current mapping |
| Arrow target path (right of `->`) | Fields from target schemas of current mapping |
| Inside `()` metadata | Vocabulary tokens (pk, required, pii, enum, format, etc.) |
| Inside `{ }` pipeline body | Transform function names (trim, lowercase, coalesce, etc.) and error-handling tokens (`null_if_empty`, `drop_if_invalid`, `warn_if_null`, `error_if_null`, etc. — the `<action>_if_<condition>` pattern from spec §7.2) |
| After `import { }` | Block names from files in workspace |
| After `from "` | `.stm` file paths relative to workspace root |
| After `::` (namespace) | Block names within the namespace |

**Acceptance criteria:**
- [ ] Typing in a source block triggers schema name completions
- [ ] Typing after `...` triggers fragment/transform name completions
- [ ] Arrow source/target paths complete from the correct schema's fields
- [ ] Completions include type and metadata detail in the completion item
- [ ] Import path completion offers `.stm` files with relative paths

#### 2.2 CodeLens

Inline annotations on blocks that show structural facts at a glance without running CLI commands.

- **Schema blocks:** `N fields | used in M mappings` — click to see mapping list
- **Mapping blocks:** `source_schema -> target_schema | N arrows (K unmapped)` — click to see unmapped fields
- **Fragment blocks:** `spread in N schemas` — click to see spread sites
- **Metric blocks:** `sources: schema1, schema2`

**Acceptance criteria:**
- [ ] CodeLens appears above every schema, mapping, fragment, and metric block
- [ ] Click on "used in M mappings" opens a reference list
- [ ] Click on "K unmapped" runs `satsuma fields --unmapped-by` and shows results
- [ ] CodeLens updates on save

#### 2.3 VS Code Commands

Command palette entries that invoke CLI operations and present results in the editor.

| Command | CLI backing | Presentation |
|---|---|---|
| `Satsuma: Validate Workspace` | `satsuma validate --json` | Populate Problems panel |
| `Satsuma: Show Lineage From...` | `satsuma lineage --from <name> --json` | Quick pick → output panel or webview |
| `Satsuma: Where Used` | `satsuma where-used <name> --json` | References panel |
| `Satsuma: Show Warnings` | `satsuma warnings --json` | Problems panel (warnings) + `//?` as info |
| `Satsuma: Compare Workspaces` | `satsuma diff <a> <b> --json` | Diff-style output panel |
| `Satsuma: Show Workspace Summary` | `satsuma summary --json` | Custom tree view or output |
| `Satsuma: Show Arrows for Field` | `satsuma arrows <field> --json` | Quick pick from cursor → output |
| `Satsuma: Match Fields` | `satsuma match-fields --json` | Side-by-side panel |

**Acceptance criteria:**
- [ ] All commands appear in the command palette with `Satsuma:` prefix
- [ ] Commands that need a block name infer it from cursor position or prompt via quick pick
- [ ] Output appears in appropriate VS Code UI (Problems panel, references, output channel)
- [ ] Commands work across multi-file workspaces

#### 2.4 Rename Symbol

Rename a schema, fragment, transform, or field across the entire workspace.

- Rename a schema → updates all source/target references, arrow paths, metric sources, backtick references, and import names
- Rename a fragment → updates all spread sites
- Rename a field → updates all arrow paths referencing that field

Uses `locals.scm` definition/reference captures to find all rename locations.

**Acceptance criteria:**
- [ ] F2 on a schema name renames it across all files
- [ ] F2 on a field name renames it in the schema and all arrows
- [ ] Preview shows all affected locations before applying
- [ ] Rename refuses to create duplicate names

---

### Phase 3 — Visualisation

Render the semantic graph and lineage as interactive diagrams inside VS Code.

#### 3.1 Workspace Graph Webview

A webview panel that renders the `satsuma graph` output as an interactive node-edge diagram.

- **Nodes:** Schemas (rectangles), mappings (diamonds), metrics (circles), fragments (rounded rectangles)
- **Edges:** Arrows between nodes showing data flow direction, coloured by classification (structural=solid, nl=dashed, mixed=dotted)
- **Interaction:** Click a node to open the file at the block definition. Hover to see field summary. Filter by namespace.
- **Layout:** Auto-layout with dagre or ELK. Manual repositioning optional.
- **Rendering:** Use a lightweight library (e.g., D3, vis-network, or React Flow) in the webview. Keep the dependency footprint small.

Data source: `satsuma graph --json` (or `--compact` for large workspaces).

**Acceptance criteria:**
- [ ] `Satsuma: Show Workspace Graph` opens a webview panel
- [ ] All schemas, mappings, metrics, and fragments appear as nodes
- [ ] Edges show data flow direction with classification colouring
- [ ] Clicking a node opens the definition in the editor
- [ ] `--namespace` filtering works via a dropdown in the webview
- [ ] Graph re-renders on file save

#### 3.2 Field-Level Lineage View

Trace a single field's journey from source to target across all mappings.

- Select a field (cursor on a field declaration or arrow path) → `Satsuma: Trace Field Lineage`
- The extension calls `satsuma arrows <field> --json` recursively, following the chain
- Renders as a horizontal flow diagram: `source.field → [transform] → mid.field → [transform] → target.field`
- NL transforms shown with a distinct indicator (the user/agent interprets them, not the extension)

**Acceptance criteria:**
- [ ] `Satsuma: Trace Field Lineage` works from cursor position
- [ ] Multi-hop lineage renders as a connected flow
- [ ] NL transforms are visually distinct from structural transforms
- [ ] Clicking a node in the lineage jumps to the definition

#### 3.3 Mapping Coverage Heatmap

Visual overlay showing which target fields are mapped and which are not.

- Open a mapping → `Satsuma: Show Mapping Coverage`
- The extension calls `satsuma fields <target> --unmapped-by <mapping> --json`
- In the editor: mapped fields get a green gutter marker, unmapped fields get a red one
- In the webview: target schema rendered as a field list with coverage percentage

**Acceptance criteria:**
- [ ] Gutter markers show mapped/unmapped status for target schema fields
- [ ] Coverage percentage shown in the status bar or CodeLens
- [ ] Updates on save

---

## Implementation Strategy

### Technology Choices

- **LSP server:** Node.js with `vscode-languageserver` / `vscode-languageclient`. Same runtime as the CLI — shares `tree-sitter-satsuma` bindings, avoids a second language.
- **Tree-sitter integration:** Use `tree-sitter` Node bindings directly (same as `satsuma-cli`). The server parses files itself for per-keystroke operations; delegates to CLI for workspace-level commands.
- **Webview rendering:** Lightweight — vanilla JS + D3 or a small React app bundled with esbuild. No heavy framework.
- **Extension bundling:** esbuild to produce a single extension bundle. Tree-sitter native bindings bundled per platform.

### Project Structure

```
tooling/vscode-satsuma/
  package.json              (extended with activationEvents, commands, LSP config)
  src/
    extension.ts            (activation, LSP client start, command registration)
    commands/               (VS Code command handlers)
      validate.ts
      lineage.ts
      whereUsed.ts
      graph.ts
      ...
    webview/                (webview panel code)
      graph/
        index.html
        graph.js
      lineage/
        index.html
        lineage.js
  server/
    src/
      server.ts             (LSP server entry point)
      workspace-index.ts    (cross-file name/reference index)
      diagnostics.ts        (parse errors + semantic checks)
      symbols.ts            (document symbols / outline)
      definition.ts         (go-to-definition)
      references.ts         (find references)
      completion.ts         (context-aware completions)
      semantic-tokens.ts    (highlights.scm → LSP semantic tokens)
      folding.ts            (folds.scm → LSP fold ranges)
      hover.ts              (contextual hover info)
      rename.ts             (workspace-wide rename)
    package.json            (server dependencies)
  syntaxes/
    satsuma.tmLanguage.json     (existing, unchanged)
  language-configuration.json (existing, unchanged)
  test/
    fixtures/               (existing TextMate tests)
    golden/                 (existing golden tests)
    lsp/                    (new LSP integration tests)
```

### Testing Strategy

- **Unit tests:** Each LSP feature module (diagnostics, symbols, definition, references, completion) tested against fixture `.stm` files with expected outputs.
- **Integration tests:** Use `vscode-languageserver-protocol` to simulate client/server communication without launching VS Code.
- **End-to-end tests:** Use `@vscode/test-electron` to test the full extension in a VS Code instance for critical paths (diagnostics display, go-to-definition navigation, command execution).
- **Fixture reuse:** The existing `examples/` corpus serves as the primary test workspace. The existing TextMate fixture tests remain unchanged.

---

## Dependencies

- **Feature 07 (TextMate grammar):** COMPLETED. The extension builds on the existing `vscode-satsuma` package.
- **Feature 08 (tree-sitter parser v2):** COMPLETED. The LSP server uses `tree-sitter-satsuma` directly.
- **Features 09+10 (CLI):** COMPLETED. The extension shells out to `satsuma` CLI for workspace-level operations.
- **Feature 15 (namespaces):** Parser and CLI support for `namespace` blocks is implemented. The tree-sitter grammar includes `namespace_block` and the CLI handles namespace-qualified names. Phase 1 LSP features should handle namespace blocks in document symbols and navigation; Phase 2 completions benefit from the workspace namespace index.

---

## Risks

### R1: Tree-sitter Node binding platform support

The `tree-sitter` npm package uses native bindings. Bundling for multiple platforms (macOS arm64, macOS x64, Linux x64, Windows x64) requires platform-specific prebuilds.

**Mitigation:** Use `prebuildify` or include prebuilt binaries per platform in the `.vsix`. The CLI already handles this for local use.

### R2: LSP server startup time

Parsing all `.stm` files in a large workspace on startup could cause a noticeable delay.

**Mitigation:** Index lazily — parse files on first access, not on startup. Use `workspace/didChangeWatchedFiles` to incrementally update the index. For very large workspaces, allow the user to configure included/excluded directories.

### R3: Semantic token conflicts with TextMate

When both TextMate and semantic tokens are active, VS Code merges them with semantic tokens taking priority. Edge cases may cause flickering or inconsistent colouring during typing.

**Mitigation:** Ensure semantic token types map cleanly to the same visual styles as the TextMate scopes. Test with multiple themes.

### R4: CLI subprocess overhead

Shelling out to `satsuma` for every command adds process startup latency (~50-100ms).

**Mitigation:** Acceptable for on-save and on-demand operations. For per-keystroke features (diagnostics, completions, semantic tokens), use the in-process tree-sitter parser, not the CLI.

---

## Success Criteria

The feature is complete when:

1. **Phase 1:** A user can open a multi-file Satsuma workspace in VS Code and get: inline diagnostics, go-to-definition across files, find references, outline/breadcrumbs, semantic token highlighting, code folding, and hover information — all without leaving the editor.

2. **Phase 2:** A user writing new Satsuma gets context-aware completions for schema names, field names, vocabulary tokens, and import paths. CodeLens shows structural facts inline. CLI operations are available from the command palette.

3. **Phase 3:** A user can visualise the workspace dependency graph and trace field-level lineage as interactive diagrams inside VS Code.
