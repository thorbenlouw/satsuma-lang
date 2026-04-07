# Satsuma Tooling Architecture

This document describes the architecture of the Satsuma language tooling — the
packages under `tooling/` that parse, analyse, format, validate, and provide IDE
support for `.stm` files.

The design is heavily influenced by
[rust-analyzer's architecture](https://rust-analyzer.github.io/book/contributing/architecture.html),
adapted for a tree-sitter-based DSL toolchain rather than a full programming
language compiler.

---

## Bird's Eye View

Satsuma tooling accepts `.stm` source files and produces structured semantic
data: extracted schemas, field trees, lineage graphs, validation diagnostics,
and IDE features like completions and go-to-definition.

The system is organised as a stack of packages with strict dependency direction
(each layer depends only on layers below it):

```
           ┌─────────────────────┐   ┌─────────────────────┐
           │   vscode-satsuma    │   │  satsuma-viz-harness │  Standalone browser
           │  (VSCode extension) │   │  (Playwright harness)│  harness for fixture-
           └────────┬────────────┘   └──────────┬──────────┘  driven viz testing
                    │                            │
           ┌────────┴────────────┐               │
           │    satsuma-lsp      │  Language      │
           │  (editor-agnostic)  │  Server        │
           └────────┬────────────┘               │
                    │                            │
       ┌────────────┼────────────────────────────┤
       │            │                            │
┌─────┴──────┐  ┌──┴──────────┐  ┌──────────────┴────────┐
│ satsuma-cli│  │ satsuma-viz │  │  satsuma-viz-backend   │
│(16 commands│  │ (web comp.) │  │  (VizModel assembly,   │
└─────┬──────┘  └─────────────┘  │   WorkspaceIndex,      │
      │                          │   shared by LSP +      │
      │                          │   harness)             │
      │                          └───────────┬────────────┘
      │                                      │
      │              ┌───────────────────────┤
      │              │                       │
      │     ┌────────┴───────┐    ┌──────────┴──────┐
      │     │ satsuma-viz-   │    │  satsuma-core   │
      │     │ model (types)  │    │  Pure extraction,│
      │     └────────────────┘    │  validation,     │
      │                           │  formatting      │
      └───────────────────────────┴──────┬───────────┘
                                         │
                              ┌──────────┴──────────┐
                              │ tree-sitter-satsuma │  Grammar, WASM parser,
                              │                     │  corpus tests, queries
                              └─────────────────────┘
```

**The cardinal rule:** dependencies flow downward. `satsuma-core` never imports
from `satsuma-cli`, `satsuma-lsp`, or `vscode-satsuma`. The LSP never imports
from the CLI. The CLI never imports from the LSP. `satsuma-viz-backend` is shared
by the LSP server and the viz harness — neither imports from the other.

---

## Package Responsibilities

### tree-sitter-satsuma

The grammar definition. Owns the `.grammar.js`, generated parser artifacts,
corpus test fixtures, and tree-sitter queries (`highlights.scm`, etc.).

This is the ground truth for "what is valid Satsuma syntax." Everything above
consumes its CST (Concrete Syntax Tree) output.

### satsuma-core

The semantic extraction library. All pure, unit-testable logic for working with
Satsuma CSTs lives here:

- **Extraction** — `extractSchemas()`, `extractMappings()`, `extractArrowRecords()`,
  `extractFieldTree()`, and 8 other extractors that turn CST nodes into typed
  domain objects.
- **Classification** — `classifyTransform()`, `classifyArrow()` for categorising
  arrow transforms.
- **Metadata** — `extractMetadata()` for parsing metadata blocks into typed entries.
- **Spread expansion** — `expandEntityFields()`, `expandSpreads()` via callback
  abstractions (see ADR-005).
- **NL ref resolution** — `extractAtRefs()`, `classifyRef()`, `resolveRef()` via
  callback abstractions (see ADR-006).
- **Validation** — `collectSemanticDiagnostics()` via the `SemanticIndex` interface.
- **Formatting** — `format()` for canonical code formatting.
- **CST utilities** — `labelText()`, `stringText()`, `entryText()`, `child()`,
  `children()`, `allDescendants()`.
- **Canonical references** — `canonicalRef()`, `resolveScopedEntityRef()`.
- **Parser management** — WASM parser singleton lifecycle.

Core has **no I/O, no file system access, no LSP types, no CLI types.** It
accepts CST nodes (or callback functions) and returns plain data. This is the
Satsuma equivalent of rust-analyzer's `hir` + `ide` layers collapsed into one
(appropriate for a DSL with no type system or macro expansion).

### satsuma-cli

The command-line tool. Owns:

- **Workspace orchestration** — file discovery, import following, multi-file
  index building (`WorkspaceIndex`).
- **Commands** — 16 commands that call core extraction, build higher-level
  structures (lineage graphs, diffs, coverage), and format output.
- **Lint engine** — rule registry, fix generation, fix application.
- **Adapter shims** — thin wrappers that create core's callback interfaces
  from `WorkspaceIndex`.

The CLI does **no CST extraction of its own.** All extraction goes through core.

### satsuma-lsp

The Language Server Protocol implementation. Editor-agnostic — works with any
LSP client (VSCode, Neovim, Helix, Zed, Emacs, IntelliJ).

Owns:

- **Workspace index** — per-file symbol index with definition/reference tracking,
  optimised for IDE queries (go-to-definition, find-references, rename).
- **Viz model** — builds the `VizModel` data structure for mapping visualisation,
  consuming core's extraction output and enriching it with position data and
  cross-file resolution.
- **LSP features** — hover, completion, definition, references, rename, CodeLens,
  semantic tokens, diagnostics, formatting, folding, document symbols.
- **Protocol handling** — LSP request/response routing, document synchronisation,
  custom RPC extensions for editor commands.

Like the CLI, the LSP does **no CST extraction of its own.** It calls core's
extractors and adapts the results to LSP types and its own index structures.

### satsuma-viz-model

A pure type package defining the `VizModel` JSON contract between the LSP
server and the visualisation web component. No logic — only TypeScript
interfaces and constants.

This is the serialisation boundary between server and client. Changes to
`VizModel` types are versioned carefully because they cross a process boundary.

### satsuma-viz

A Lit web component that renders `VizModel` as an interactive diagram. Owns
layout (ELK.js), edge rendering (SVG), and card components. Consumes `VizModel`
JSON plus small shared helpers from `satsuma-core` for coverage and NL `@ref`
rendering. It has no dependency on the CLI or LSP.

### satsuma-viz-backend

The shared VizModel assembly library, extracted from the LSP server so that the
viz harness can build `VizModel` objects without depending on LSP types or the
VS Code extension.

Owns:
- **Workspace index** — `createWorkspaceIndex()`, `indexFile()`, `createScopedIndex()`
- **Import reachability** — `getImportReachableUris()` for transitive import traversal
- **VizModel builders** — `buildVizModel()` (single-file) and `mergeVizModels()` (lineage)

Both the LSP server and the viz harness depend on this package. Neither depends
on the other.

### satsuma-viz-harness

A standalone Node.js HTTP server + browser client for fixture-driven testing of
the `<satsuma-viz>` web component, without VS Code or the LSP in the loop.

Owns:
- **Server** — discovers all `.stm` fixtures under `examples/`, parses and indexes
  them via `@satsuma/viz-backend`, serves VizModel JSON via a REST API
  (`/api/fixtures`, `/api/source`, `/api/model`).
- **Browser client** — a minimal HTML + TypeScript app that renders the
  `<satsuma-viz>` web component alongside fixture source text; exposes
  `window.__satsumaHarness` for Playwright assertions.
- **Playwright tests** — browser-based end-to-end coverage: overview rendering,
  detail view, event pipeline (field-hover, expand-lineage, navigate), cross-file
  lineage merging, and layout stability on larger fixtures.

The harness is a **local developer-machine workflow only** — it is not run in CI.
To run tests: `./watch-and-test.sh &` (starts the sentinel watcher), then
`touch .run-tests` to trigger a run. Results appear in `.playwright-results.txt`.

### vscode-satsuma

The VSCode-specific extension shell. Owns:

- **Extension lifecycle** — activation, LSP client instantiation.
- **Commands** — editor commands that gather context and display results.
- **Webview panels** — mapping visualisation, field lineage, schema lineage.
- **TextMate grammar** — syntax highlighting fallback.
- **Extension manifest** — contributes, settings, icons.

This package is deliberately thin. All language intelligence lives in
`satsuma-lsp`; all extraction lives in `satsuma-core`. A Neovim or IntelliJ
plugin would replace this package entirely while reusing everything below it.

---

## Design Principles

These principles are informed by lessons from rust-analyzer's architecture,
adapted for Satsuma's scale and constraints.

### 1. Parsing never fails

The tree-sitter parser always produces a CST, even for broken or incomplete
input. Error nodes are embedded in the tree rather than aborting. All downstream
code — extractors, validators, IDE features — operates on `(result, errors)`
rather than `Result<T, Error>`. This means the IDE remains functional while the
user is mid-edit with syntax errors.

### 2. Core is pure computation with no I/O

`satsuma-core` has no file system access, no network calls, no process spawning.
It accepts CST nodes and returns plain data objects. This makes every function
trivially unit-testable with synthetic CST fragments — no test fixtures on disk,
no mocking.

Consumers handle all I/O: the CLI reads files and writes output; the LSP manages
document synchronisation and sends protocol messages.

### 3. Extraction happens once, in core

Every entity type (schema, mapping, fragment, metric, transform, arrow, field,
metadata, import, namespace) is extracted from the CST in exactly one place:
`satsuma-core`. Consumers never walk the CST to extract domain objects. They
call core's extractors and adapt the output to their needs.

This prevents behavioural drift between tools. A grammar change that renames a
CST node type requires a single fix in core. See ADR-003 and ADR-020.

### 4. Decouple via callbacks, not shared index types

Core's cross-file operations (spread expansion, NL ref resolution, semantic
validation) need access to a workspace-wide index. Rather than defining a shared
`WorkspaceIndex` type that all consumers must implement, core defines minimal
callback interfaces:

- `EntityRefResolver` — resolve a potentially-unqualified entity reference
- `SpreadEntityLookup` — look up an entity's fields by canonical key
- `DefinitionLookup` — check existence and retrieve entities for NL ref resolution
- `SemanticIndex` — provide all entities for validation

Each consumer creates these callbacks from its own index type in 3-5 lines.
See ADR-005 and ADR-006.

### 5. Don't leak protocol types into analysis

Inspired by rust-analyzer's strict rule: "If you want to expose a data structure
X from ide to LSP, don't make it serializable. Instead, create a serializable
counterpart in the protocol layer and manually convert between the two."

In Satsuma terms: core types (`FieldDecl`, `ExtractedSchema`, `MetaEntry`,
`Classification`) are never serialised directly over LSP. The LSP creates its
own protocol-facing types (`DefinitionEntry`, `VizModel`, LSP `Diagnostic`) and
maps from core types explicitly. This keeps core stable even as LSP protocol
details evolve.

Similarly, core types are not CLI output types. The CLI maps `ExtractedSchema`
to its own output format for `--json` and human-readable display.

### 6. Value semantics for syntax trees

CST nodes are fully determined by their source text. No semantic information is
stored on the tree — not even the file path. All semantic context (namespace
membership, spread provenance, cross-file resolution) is computed separately and
stored in consumer-owned index structures.

This enables parallel parsing of all files (each parse is independent) and
allows the same CST to be re-analysed under different contexts without mutation.

### 7. Test extraction once, at the right level

Extraction logic is tested comprehensively in core's test suite with minimal
Satsuma snippets. Consumer test suites validate only:

- **Adapter wiring** — callback construction, type mapping.
- **Consumer-specific features** — CLI output formatting, LSP protocol behaviour,
  viz rendering.
- **Integration** — end-to-end flows (file to parse to index to feature output).

Consumer tests must not duplicate core extraction tests. If a consumer test
is really testing "does `extractSchemas` return the right fields for a schema
with spreads," that test belongs in core. Consumers may keep tests that
exercise the *stitching* of core APIs against the wasm parser and real example
files (e.g. `tooling/satsuma-cli/test/extract.test.ts`'s "extraction against
real files" suite), but pure extractor unit tests using mock CST nodes belong
in `tooling/satsuma-core/test/extract.test.js`. The migration of all such
mock-based CLI cases into core was completed in `sl-cvs2`.

### 8. Graceful degradation over hard failures

Following rust-analyzer's principle: IDE features should be partially available
even when the workspace has errors. A parse error in one file should not prevent
completions in another. A broken import should not prevent hover on local
definitions. An unresolvable spread should produce a diagnostic, not crash the
server.

Every LSP request handler should be resilient to missing data. If the workspace
index lacks an entry, return an empty result — never throw.

### 9. Small functions, visible business rules

The tooling is intended as a teaching example (see AGENTS.md). Functions should
be small and focused. Domain rules (Data Vault naming conventions, known pipeline
functions, constraint tags, classification criteria) must be clearly labelled
constants with source comments, never buried as anonymous values.

---

## Data Flow

### CLI: File to Command Output

```
.stm files
  → workspace.ts discovers files, follows imports
  → parser.ts reads file, calls core initParser/getParser
  → core extract*() functions produce Extracted* types
  → index-builder.ts assembles WorkspaceIndex from Extracted* types
  → spread-expand.ts shim wires core expandEntityFields via callbacks
  → nl-ref-extract.ts shim wires core resolveAllNLRefs via callbacks
  → validate.ts shim wires core collectSemanticDiagnostics via SemanticIndex
  → command handler queries index, formats output
```

### LSP: Document Change to IDE Feature

```
didOpen/didChange notification
  → server.ts receives text, parses with core getParser
  → workspace-index.ts calls core extract*() functions
  → workspace-index.ts builds DefinitionEntry/ReferenceEntry maps
  → on request (hover, completion, definition, etc.):
      → feature handler queries workspace index
      → may call core functions (classifyTransform, extractMetadata, etc.)
      → maps core types to LSP response types
      → returns LSP JSON
```

### Viz: LSP to Rendering (VS Code path)

```
LSP custom request (satsuma/vizModel)
  → satsuma-viz-backend buildVizModel() calls core extract*() functions
  → adapts Extracted* types to VizModel (SchemaCard, MappingBlock, etc.)
  → wires core expandEntityFields for spread resolution
  → serialises VizModel as JSON
  → vscode-satsuma webview receives JSON
  → satsuma-viz web component renders cards, edges, layout
```

### Viz: Harness to Rendering (local Playwright path)

```
Playwright browser test
  → GET /api/model?uri=<fixture>&lineage=<0|1>
  → harness server: satsuma-viz-backend buildVizModel() / mergeVizModels()
  → VizModel JSON returned over HTTP
  → browser client sets <satsuma-viz>.model property
  → satsuma-viz web component renders cards, edges, layout
  → Playwright asserts data-testid / data-ready-state / harness event log
```

---

## Architectural Differences from rust-analyzer

Satsuma is a DSL, not a general-purpose language. This simplifies the
architecture significantly:

| Concern | rust-analyzer | Satsuma |
|---------|---------------|---------|
| Incremental computation | Salsa framework with revision tracking | None needed — files are small, full re-parse is <5ms |
| Type system | Full inference engine (`hir-ty`) | No types beyond field type annotations |
| Macro expansion | Token-tree transforms, proc-macro server | No macros (fragment spreads are the closest analogue) |
| Build system integration | Cargo, rust-project.json, CrateGraph | Simple file discovery + import following |
| Multi-crate analysis | Per-crate DefMap, cross-crate resolution | Per-file extraction, cross-file import resolution |
| Cancellation | Salsa revision counter + unwinding panics | Not needed — operations complete in <100ms |

What we *do* share with rust-analyzer:

- **Layered package architecture** with strict dependency direction
- **Pure core with no I/O** and callback-based cross-file resolution
- **Protocol types isolated** from analysis types
- **Parsing never fails** — CST always produced, errors embedded
- **Value semantics** for syntax trees
- **Test at the right boundary** — core logic tested in core, not in consumers

---

## Package Dependency Matrix

```
                     tree-sitter  core  viz-model  viz-backend  cli  lsp  viz  vscode  viz-harness
tree-sitter-satsuma      -         -       -           -         -    -    -     -          -
satsuma-core             *         -       -           -         -    -    -     -          -
satsuma-viz-model        -         -       -           -         -    -    -     -          -
satsuma-viz-backend      *         *       *           -         -    -    -     -          -
satsuma-cli              *         *       -           -         -    -    -     -          -
satsuma-lsp              *         *       *           *         -    -    -     -          -
satsuma-viz              -         *       *           -         -    -    -     -          -
vscode-satsuma           -         -       -           -         -    *    *     -          -
satsuma-viz-harness      *         *       -           *         -    -    *     -          -
```

`*` = direct dependency. The dependency graph is acyclic by construction.
`satsuma-viz-backend` is the shared boundary between the LSP server and the viz harness.
