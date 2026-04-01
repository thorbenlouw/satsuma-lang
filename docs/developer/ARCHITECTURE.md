# Satsuma Tooling Architecture

> Last updated: 2026-04-01 — Feature 29 (Viz Harness): extracted `satsuma-viz-backend` shared package from LSP server; added `satsuma-viz-harness` standalone browser harness with Playwright coverage.

See `adrs/` for the architectural decision records that explain the choices made here.

---

## Package Map

The `tooling/` directory contains eight npm packages:

| Package | Role |
|---------|------|
| `tree-sitter-satsuma` | Grammar definition and compiled parser artifacts (WASM) |
| `satsuma-core` | Shared extraction, formatting, validation, and analysis library — the foundation |
| `satsuma-viz-model` | Shared VizModel protocol contract — types for the server→viz JSON payload |
| `satsuma-viz-backend` | Shared VizModel assembly — `buildVizModel`, `mergeVizModels`, workspace index; used by LSP server and viz harness |
| `satsuma-cli` | CLI tool (16 commands); consumer of satsuma-core |
| `vscode-satsuma` | VS Code extension + LSP server; consumer of satsuma-core, satsuma-viz-model, satsuma-viz-backend |
| `satsuma-viz` | Lit web component that renders VizModel as an interactive diagram |
| `satsuma-viz-harness` | Standalone HTTP harness for fixture-driven browser testing of satsuma-viz; Playwright tests |

### Package Dependency Diagram

```mermaid
graph TD
  TS[tree-sitter-satsuma<br/><i>grammar + WASM artifact</i>]
  CORE[satsuma-core<br/><i>formatter · cst-utils · extract · validate<br/>coverage · parser · spread-expand · nl-ref · types</i>]
  VIZM[satsuma-viz-model<br/><i>VizModel protocol types</i>]
  VIZB[satsuma-viz-backend<br/><i>buildVizModel · mergeVizModels<br/>WorkspaceIndex · indexFile<br/>getImportReachableUris · createScopedIndex</i>]
  CLI[satsuma-cli<br/><i>16 commands · WorkspaceIndex</i>]
  LSP[vscode-satsuma/server<br/><i>DefinitionIndex · semantic tokens<br/>completions · hover · …</i>]
  EXT[vscode-satsuma/client<br/><i>extension host</i>]
  VIZ[satsuma-viz<br/><i>Lit web component</i>]
  HARNESS[satsuma-viz-harness<br/><i>Node.js HTTP server<br/>browser client<br/>Playwright tests</i>]

  TS -- "satsuma.wasm" --> CORE
  TS -- "satsuma.wasm" --> CLI
  TS -- "satsuma.wasm" --> VIZB
  TS -- "satsuma.wasm" --> HARNESS
  CORE --> CLI
  CORE --> VIZB
  CORE --> HARNESS
  VIZM --> VIZB
  VIZM --> VIZ
  VIZB --> LSP
  VIZB --> HARNESS
  VIZ --> HARNESS
  LSP --> EXT
```

`satsuma-core` and `satsuma-viz-model` have no runtime dependencies on any other package in this repo. `satsuma-viz-backend` is the shared boundary between the LSP server and the viz harness — it owns all VizModel assembly logic so neither consumer duplicates it.

---

## Data Flow

```mermaid
flowchart TD
  SRC[".stm source files"]
  PARSE["web-tree-sitter (WASM)\nparse()"]
  CST["Concrete Syntax Tree (CST)\nSyntaxNode tree"]
  EXTRACT["satsuma-core/extract\nextractSchemas · extractMappings\nextractArrows · extractMetrics\nextractFragments · extractImports · …"]
  RECORDS["Per-file extracted records\nExtractedSchema[] · ExtractedMapping[]\nExtractedArrow[] · ExtractedMetric[] · …"]

  IDXB["satsuma-cli/index-builder\nextractFileData() + buildIndex()"]
  WI["WorkspaceIndex\nfully resolved · multi-file"]
  CMDS["CLI commands\ngraph · lineage · field-lineage\nvalidate · lint · nl-refs · …"]

  WSIDX["vscode-satsuma/workspace-index\nindexFile()"]
  DEFIDX["DefinitionIndex\ngo-to-def · find-refs · completions"]
  VIZB["satsuma-viz-backend\nbuildVizModel() · mergeVizModels()\nindexFile() · getImportReachableUris()"]
  VIZM["VizModel\nrendered by satsuma-viz"]
  HARNESS["satsuma-viz-harness server\n/api/model HTTP endpoint\nserves VizModel JSON"]
  PLAYWRIGHT["Playwright browser tests\nassert overview · detail · events\ncross-file lineage · layout"]

  SRC --> PARSE --> CST --> EXTRACT --> RECORDS
  RECORDS --> IDXB --> WI --> CMDS
  RECORDS --> WSIDX --> DEFIDX
  RECORDS --> VIZB --> VIZM
  VIZB --> HARNESS --> PLAYWRIGHT
```

---

## satsuma-core Module Structure

```mermaid
graph LR
  IDX["index.ts\n(re-exports all)"]
  TYPES["types.ts\nSyntaxNode · Tree · FieldDecl\nExtracted* · NLRefData · AtRef\nMappingContext · Resolution · …"]
  CST["cst-utils.ts\nchild · children\nallDescendants\nlabelText · stringText"]
  CLS["classify.ts\nclassifyTransform\nclassifyArrow"]
  CAN["canonical-ref.ts\ncanonicalRef()\nresolveScopedEntityRef()"]
  META["meta-extract.ts\nextractMetadata()"]
  EXT["extract.ts\nextractSchemas · extractMappings\nextractArrows · extractMetrics\nextractFragments · extractTransforms\nextractImports · extractNotes\nextractWarnings · extractQuestions\nextractNamespaces\nextractFieldTree (public)"]
  SPR["spread-expand.ts\nEntityFieldLookup (callback)\nexpandSpreads\nexpandEntityFields\ncollectFieldPaths"]
  NL["nl-ref.ts\nDefinitionLookup (callback)\nAtRef · RefClassification\nextractAtRefs · classifyRef\nresolveRef · resolveAllAtRefs\nextractNLRefData"]
  FMT["format.ts\nformat(tree, source)"]
  STR["string-utils.ts\ncapitalize · truncate\nformatList · …"]
  PAR["parser.ts\ninitParser() singleton\nparseSource()"]
  PE["parse-errors.ts\ncollectParseErrors()\nParseError"]
  COV["coverage.ts\nFieldCoverageEntry\nSchemaCoverageResult\naddPathAndPrefixes()"]
  VAL["validate.ts\nSemanticIndex · SemanticDiagnostic\ncollectSemanticDiagnostics()"]

  IDX --> TYPES & CST & CLS & CAN & META & EXT & SPR & NL & FMT & STR & PAR & PE & COV & VAL
  EXT --> CST & CLS & CAN & META & TYPES
  SPR --> EXT & TYPES
  NL --> SPR & TYPES
  VAL --> CAN & TYPES
```

### Key Types

| Type | Module | Description |
|---|---|---|
| `SyntaxNode` | `types.ts` | Abstract CST node interface (structurally matches web-tree-sitter `Node`) |
| `Tree` | `types.ts` | Parsed tree with `rootNode: SyntaxNode` |
| `FieldDecl` | `types.ts` | Recursive field: `{ name, type, isList?, children?, spreads?, metadata? }` |
| `ExtractedSchema` | `types.ts` | Schema block: name, namespace, fields, spreads, metadata |
| `ExtractedMapping` | `types.ts` | Mapping block: sourceRefs, targetRef, arrows |
| `ExtractedArrow` | `types.ts` | Arrow: sourceFields, targetField, transform steps, classification |
| `MetaEntry` | `types.ts` | Metadata entry union: tag, kv, enum, note, slice |
| `AtRef` | `types.ts` | `{ ref: string, offset: number }` — a single @-ref extracted from NL text |
| `NLRefData` | `types.ts` | All NL strings + @-refs for a file |
| `Resolution` | `types.ts` | `{ resolved: boolean, resolvedTo: { kind, name } \| null }` |
| `EntityFieldLookup` | `spread-expand.ts` | Callback for spread resolution: `(name, ns) => { fields } \| null` |
| `DefinitionLookup` | `nl-ref.ts` | Callback for @-ref resolution: `(name, ns) => { kind, fields? } \| null` |
| `SemanticIndex` | `validate.ts` | Minimal structural interface accepted by `collectSemanticDiagnostics`; satisfied by CLI `WorkspaceIndex` |
| `SemanticDiagnostic` | `validate.ts` | `{ file, line, column, severity, rule, message }` — one semantic warning or error |
| `FieldCoverageEntry` | `coverage.ts` | `{ path, mapped: boolean }` — coverage status for one field path |
| `SchemaCoverageResult` | `coverage.ts` | Per-schema list of `FieldCoverageEntry` records |
| `ParseError` | `parse-errors.ts` | `{ file, line, column, message }` — structural error from tree-sitter ERROR/MISSING nodes |

---

## satsuma-cli Internal Structure

```
satsuma-cli/src/
├── index.ts             — CLI entry point (commander setup)
├── commands/            — One file per CLI command (16 total)
│   ├── graph.ts         — satsuma graph
│   ├── field-lineage.ts — satsuma field-lineage
│   ├── lineage.ts       — satsuma lineage
│   ├── validate.ts      — satsuma validate
│   ├── lint.ts          — satsuma lint
│   └── …
├── index-builder.ts     — extractFileData(), buildIndex() → WorkspaceIndex
│                          Wraps satsuma-core extractions; provides EntityFieldLookup
│                          and DefinitionLookup factory functions for callbacks
├── nl-ref-extract.ts    — makeDefinitionLookup(WorkspaceIndex): DefinitionLookup
│                          Thin adapter; all logic is in satsuma-core/nl-ref
├── workspace.ts         — File discovery, parsing, index building for a workspace dir
├── graph-builder.ts     — Builds the graph data structure for satsuma graph
├── lint-engine.ts       — Lint rule evaluation
├── validate.ts          — Thin adapter: maps SemanticDiagnostic[] → LintDiagnostic[]
│                          All validation logic lives in satsuma-core/validate
└── parser.ts            — initParser(), parseFile() wrappers (delegates to satsuma-core/parser)
```

`WorkspaceIndex` (CLI-specific) holds fully resolved, multi-file semantic data:
- `schemas: Map<string, SchemaRecord>`
- `mappings: Map<string, MappingRecord>`
- `arrows: ArrowRecord[]`
- `metrics: Map<string, MetricRecord>`
- `fragments: Map<string, FragmentRecord>`
- `nlRefData: NLRefData[]` ← type from satsuma-core
- plus warnings, questions, notes, namespace metadata

---

## vscode-satsuma Server Internal Structure

```
vscode-satsuma/server/src/
├── server.ts            — LSP server entry: request handlers, lifecycle
├── parser-utils.ts      — initParser(), parseSource(), nodeRange()
│                          CST helpers (child, children, etc.) imported from @satsuma/core
├── workspace-index.ts   — indexFile() → DefinitionIndex
│                          IDE-oriented: definitions + references for go-to-def
│                          Delegates file indexing + import resolution to @satsuma/viz-backend
├── coverage.ts          — computeMappingCoverage() → SchemaCoverageResult
├── semantic-tokens.ts, hover.ts, definition.ts, references.ts,
│   completion.ts, symbols.ts, rename.ts, folding.ts, formatting.ts
```

`VizModel` assembly has been extracted to `@satsuma/viz-backend` (`buildVizModel`,
`mergeVizModels`, `getImportReachableUris`, `createScopedIndex`) so that the viz
harness can build VizModels without depending on the LSP server. The LSP server
imports from `@satsuma/viz-backend` rather than owning this logic directly.

`DefinitionIndex` (LSP-specific) is the IDE index:
- `Map<string, DefinitionEntry[]>` — keyed by qualified name
- `DefinitionEntry` has `{ uri, range, kind, namespace, fields? }` for schema/fragment entries

---

## Nested Field Handling

Satsuma schemas support arbitrarily nested record and list-of-record fields:

```satsuma
schema orders {
  order_id string
  customer record {
    id string
    name string
  }
  line_items list_of record {
    product_id string
    quantity int
  }
}
```

**Rule:** Any code that works with fields must recurse through `FieldDecl.children`. Use `satsuma-core`'s public `extractFieldTree()` to get the full recursive tree. Use `collectFieldPaths()` from `spread-expand.ts` to flatten to dotted paths (e.g. `line_items.product_id`).

The `fieldLocations` LSP handler was historically flat (only top-level fields). This was fixed in Feature 26 (ticket sl-ysy4) by routing through `extractFieldTree()`.

---

## Callback Abstractions

Two callback interfaces decouple satsuma-core from consumer index types:

```mermaid
graph LR
  subgraph satsuma-core
    SPR["spread-expand\nEntityFieldLookup"]
    NL["nl-ref\nDefinitionLookup"]
  end
  subgraph satsuma-cli
    WI["WorkspaceIndex\nadapter closure"]
  end
  subgraph vscode-satsuma/server
    DI["DefinitionIndex\nadapter closure"]
  end

  WI -- "implements" --> SPR
  WI -- "implements" --> NL
  DI -- "implements" --> SPR
  DI -- "implements" --> NL
```

See ADR-005 (EntityFieldLookup) and ADR-006 (DefinitionLookup) for design rationale.

---

## Extension Points

To add a new extraction consumer (e.g. a second language server, a linter, a code generator):

1. Add a dependency on `@satsuma/core`
2. Call `extractSchemas()`, `extractMappings()`, etc. on the tree root node
3. For spread-aware field lists, implement `EntityFieldLookup` and call `expandSpreads()`
4. For NL @-ref extraction, call `extractAtRefs()` on NL string text
5. For resolved @-ref data, implement `DefinitionLookup` and call `resolveRef()`

No CLI or LSP code needs to be imported.

---

## Test Strategy

| Package | Test location | Approach |
|---|---|---|
| `tree-sitter-satsuma` | `test/corpus/` | tree-sitter corpus tests (parse → CST shape assertions) |
| `satsuma-core` | `test/*.test.js` | Unit tests against pure functions; no I/O, no WASM required |
| `satsuma-cli` | `test/*.test.js` | Integration tests via CLI commands; golden snapshot for `graph --json` |
| `vscode-satsuma/server` | `test/*.test.js` | Unit tests for LSP handlers and extraction adapters |

The **golden snapshot** (`satsuma-cli/test/fixtures/golden-graph-output.json`) captures the output of `satsuma graph --json examples/` before any migration work begins (ticket sl-8pj3) and is asserted byte-for-byte on every test run. This is the primary regression guard for CLI output correctness throughout the Feature 26 migration.

---

## See Also

- `adrs/` — Architectural decision records
- `SATSUMA-V2-SPEC.md` — Language specification (authoritative)
- `SATSUMA-CLI.md` — CLI command reference
- `features/26-extraction-consolidation/PRD.md` — Feature 26 PRD
