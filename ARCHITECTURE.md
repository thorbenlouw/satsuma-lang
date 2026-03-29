# Satsuma Tooling Architecture

> **Note:** This document describes the target architecture after Feature 26 (Extraction Consolidation) is complete. Sections marked `[post-F26]` describe the state after migration; the rest reflects the current state as of March 2026.

See `adrs/` for the architectural decision records that explain the choices made here.

---

## Package Map

The `tooling/` directory contains five npm packages:

```
tooling/
├── tree-sitter-satsuma/   Grammar + parser artifacts
├── satsuma-core/          Shared extraction + formatting library  ← foundation
├── satsuma-cli/           CLI tool (16 commands)                  ← consumer of core
├── vscode-satsuma/        VS Code extension + LSP server          ← consumer of core
└── satsuma-viz/           React viz component (@satsuma/viz)      ← consumer of LSP
```

### Package Dependency Diagram

```
tree-sitter-satsuma
        │
        │ (WASM artifact: satsuma.wasm)
        ▼
satsuma-core  ◄────────────────────────────────────┐
  (formatter, cst-utils, extract, spread-expand,    │
   nl-ref, classify, canonical-ref, meta-extract)   │
        │                                           │
        ├──────────────────►  satsuma-cli           │
        │                    (16 commands,           │
        │                     WorkspaceIndex)        │
        │                                           │
        └──────────────────►  vscode-satsuma        │
                              ├── LSP server ───────┘
                              │   (VizModel, workspace-index,
                              │    semantic tokens, completions, …)
                              └── Extension host
                                    │
                                    ▼
                               satsuma-viz
                              (React component,
                               renders VizModel)
```

`satsuma-core` has no runtime dependencies on any other package in this repo. Both CLI and LSP depend on `satsuma-core` via `"@satsuma/core": "file:../satsuma-core"`.

---

## Data Flow

```
Source text (.stm file)
        │
        ▼ web-tree-sitter (WASM)
  Concrete Syntax Tree (CST)
  SyntaxNode tree (tree-sitter Node)
        │
        ▼ satsuma-core/extract.ts
  Extracted records (per-file, no cross-file state):
    ExtractedSchema[], ExtractedMapping[], ExtractedArrow[],
    ExtractedMetric[], ExtractedFragment[], ExtractedImport[], …
        │
        ├──────────────────────────────►  satsuma-cli
        │                                 index-builder.ts:
        │                                 extractFileData() → FileData
        │                                 buildIndex([FileData, …]) → WorkspaceIndex
        │                                    │
        │                                    ▼ CLI commands
        │                                 graph --json, lineage, field-lineage,
        │                                 validate, lint, nl, arrows, …
        │
        └──────────────────────────────►  vscode-satsuma/server
                                          workspace-index.ts: indexFile() → DefinitionIndex
                                          viz-model.ts: buildVizModel() → VizModel
                                             │
                                             ▼ LSP protocol
                                          textDocument/definition, references,
                                          completions, hover, rename, …
                                          satsuma/mappingCoverage, fieldLocations, …
                                             │
                                             ▼ satsuma-viz
                                          <MappingViz model={vizModel} />
```

---

## satsuma-core Module Structure `[post-F26]`

```
satsuma-core/src/
├── index.ts          — Public re-exports of all modules
├── types.ts          — All shared type definitions (SyntaxNode, Tree, FieldDecl,
│                       ExtractedSchema, ExtractedMapping, ExtractedArrow, …)
├── cst-utils.ts      — CST navigation helpers: child(), children(),
│                       allDescendants(), labelText(), stringText(), entryText()
├── classify.ts       — classifyTransform(), classifyArrow() → Classification
├── canonical-ref.ts  — canonicalRef(ns, schema, field?) → "ns::schema.field"
├── meta-extract.ts   — extractMetadata(node) → MetaEntry[]
├── extract.ts        — extractSchemas(), extractMappings(), extractArrowRecords(),
│                       extractMetrics(), extractFragments(), extractTransforms(),
│                       extractImports(), extractNotes(), extractWarnings(),
│                       extractQuestions(), extractNamespaces()
│                       + public extractFieldTree() for recursive field access
├── spread-expand.ts  — expandSpreads(), expandEntityFields(), collectFieldPaths()
│                       Uses EntityFieldLookup callback (see ADR-005)
├── nl-ref.ts         — extractBacktickRefs(), classifyRef()
│                       Pure text functions — no index dependency (see ADR-006)
└── format.ts         — format(tree, source) → formatted string (Feature 20)
```

### Key Types

| Type | Module | Description |
|---|---|---|
| `SyntaxNode` | `types.ts` | Abstract CST node interface (structurally matches web-tree-sitter `Node`) |
| `Tree` | `types.ts` | Parsed tree with `rootNode: SyntaxNode` |
| `FieldDecl` | `types.ts` | Recursive field declaration: `{ name, type, isList?, children?, spreads?, metadata? }` |
| `ExtractedSchema` | `types.ts` | Schema block: name, namespace, fields (FieldDecl[]), spreads, metadata |
| `ExtractedMapping` | `types.ts` | Mapping block: sourceRefs, targetRef, arrows |
| `ExtractedArrow` | `types.ts` | Arrow: sourceFields, targetField, transform steps, classification |
| `MetaEntry` | `types.ts` | Metadata entry union: tag, kv, enum, note, slice |
| `EntityFieldLookup` | `spread-expand.ts` | Callback `(name, ns) => { fields, spreads? } \| null` |
| `BacktickRef` | `nl-ref.ts` | `{ ref: string, offset: number }` from an NL string |

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
│                          Multi-file orchestration; wraps satsuma-core extractions
├── nl-ref-extract.ts    — resolveRef(), resolveAllNLRefs(), extractNLRefData()
│                          Resolution layer (needs WorkspaceIndex). Pure extraction
│                          (extractBacktickRefs, classifyRef) imported from @satsuma/core
├── workspace.ts         — File discovery, parsing, index building for a workspace dir
├── graph-builder.ts     — Builds the graph data structure for satsuma graph
├── lint-engine.ts       — Lint rule evaluation
├── validate.ts          — Validation logic
└── parser.ts            — initParser(), parseFile() wrappers
```

`WorkspaceIndex` (CLI-specific) holds fully resolved, multi-file semantic data:
- `schemas: Map<string, SchemaRecord>` — all schemas, keyed by qualified name
- `mappings: Map<string, MappingRecord>` — all mappings
- `arrows: ArrowRecord[]` — all arrows across all files
- `metrics: Map<string, MetricRecord>` — all metrics
- `fragments: Map<string, FragmentRecord>` — all fragments
- `nlRefData: NLRefData[]` — all NL strings with extracted refs
- … (warnings, questions, notes, namespace metadata)

---

## vscode-satsuma Server Internal Structure

```
vscode-satsuma/server/src/
├── server.ts            — LSP server entry: request handlers, lifecycle
├── parser-utils.ts      — initParser(), parseSource(), nodeRange()
│                          CST helpers (child, children, etc.) imported from @satsuma/core
├── workspace-index.ts   — indexFile(), DefinitionEntry, ReferenceEntry, ImportEntry
│                          IDE-oriented index (definitions + references for go-to-def)
│                          Import resolution: getImportReachableUris()
├── viz-model.ts         — buildVizModel() → VizModel
│                          Uses satsuma-core extraction + adds LSP-specific enrichment
│                          (SourceLocation, comments, notes, metadata for rendering)
├── coverage.ts          — computeMappingCoverage() → SchemaCoverageResult
├── semantic-tokens.ts   — Semantic highlighting
├── semantic-diagnostics.ts — Semantic validation
├── hover.ts             — Hover information
├── definition.ts        — Go-to-definition
├── references.ts        — Find references
├── completion.ts        — Completions
├── symbols.ts           — Document/workspace symbols
├── rename.ts            — Rename refactoring
├── folding.ts           — Folding regions
└── formatting.ts        — Document formatting (calls @satsuma/core format())
```

`VizModel` (LSP-specific) is the visualization data contract consumed by `@satsuma/viz`:
- Enriched with source locations (for click-to-open)
- Includes comments, notes, and metadata for rendering
- Schema-scoped: one `VizModel` per file

`DefinitionEntry` / `ReferenceEntry` (LSP-specific) are the IDE index types:
- Keyed by qualified name for O(1) go-to-definition
- Flat: the IDE index is not a full semantic model

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

**Rule:** Any code that works with fields must recurse through the `FieldDecl.children` tree. `satsuma-core`'s `extractFieldTree()` returns the full recursive tree. Callers that need a flat list (e.g. for completion, coverage) call `collectFieldPaths()` from `spread-expand.ts` to flatten with dotted paths.

The historical footgun (the `fieldLocations` LSP handler returning only top-level fields) was fixed in Feature 26 by routing through `extractFieldTree()`.

---

## Extension Points

To add a new extraction consumer (e.g. a second language server, a linter, a code generator):

1. Add a dependency on `@satsuma/core` in the new package
2. Call `extractSchemas()`, `extractMappings()`, etc. on the tree root node
3. For spread-aware field lists, implement `EntityFieldLookup` and call `expandSpreads()`
4. For NL ref annotation, call `extractBacktickRefs()` on NL string text

No CLI or LSP code needs to be imported.

---

## Test Strategy

| Package | Test Location | Approach |
|---|---|---|
| `tree-sitter-satsuma` | `test/corpus/` | tree-sitter corpus tests (parse → CST assertions) |
| `satsuma-core` | `test/*.test.js` | Unit tests against pure functions; no I/O |
| `satsuma-cli` | `test/*.test.js` | Integration tests via CLI commands; golden snapshot for `graph --json` |
| `vscode-satsuma/server` | `test/*.test.js` | Unit tests for LSP handlers + extraction adapters |

The **golden snapshot** (`satsuma-cli/test/fixtures/golden-graph-output.json`) captures the output of `satsuma graph --json examples/` and is asserted byte-for-byte on every test run. This is the primary regression guard for CLI output correctness during and after the Feature 26 migration.

---

## See Also

- `adrs/` — Architectural decision records
- `SATSUMA-V2-SPEC.md` — Language specification (authoritative)
- `SATSUMA-CLI.md` — CLI command reference
- `features/26-extraction-consolidation/PRD.md` — Feature 26 PRD
