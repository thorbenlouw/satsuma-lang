# STM Semantic Tokens Design

Post-MVP plan for parser-backed semantic highlighting layered on top of the
TextMate grammar in the VS Code STM extension.

**Status**: Design — not yet implemented. Depends on parser stability (stm-14x).

---

## 1. Purpose

The TextMate grammar in `tooling/vscode-stm/syntaxes/stm.tmLanguage.json`
provides reliable baseline highlighting but cannot resolve 8 categories of
ambiguous constructs (see `HIGHLIGHTING-TAXONOMY.md §3`). This document
describes how parser-backed semantic tokens will resolve those ambiguities and
layering model for the two systems.

**Key principle**: Semantic tokens *augment* baseline TextMate scopes. They do
not replace them. The extension must degrade gracefully when the semantic token
provider is unavailable or loading.

---

## 2. The 8 Ambiguous Constructs

These are the constructs that require parser context to resolve correctly.

### 2.1 Source vs. Target Paths in Map Bodies (§3.1)

**TextMate limitation**: Both sides of `->` get `variable.other.field.stm`.

**Semantic resolution**: The parser has distinct `source:` and `target:` field
nodes on `map_entry`. The semantic provider can assign:
- `variable` + `source` modifier → source-side field
- `variable` + `target` modifier → target-side field

**Token**: `variable` with `source` or `target` modifier.

### 2.2 Schema ID vs. Field ID in Dotted Paths (§3.2)

**TextMate limitation**: `sfdc_account.BillingCountry` — entire path coloured
uniformly as `variable.other.field.stm`.

**Semantic resolution**: Parser resolves `field_path` segments using schema
definitions in scope. The leading segment may be a `schema_ref` node.

**Token**: `type` for schema references, `property` with `reference` for fields.

### 2.3 Namespace Qualifier vs. Identifier (§3.3)

**TextMate limitation**: `crm::orders` — `crm` gets default identifier scope.
`::` is correctly scoped as `punctuation.separator.namespace.stm`.

**Semantic resolution**: Import and workspace declarations define which
identifiers are namespace references. The parser can resolve `crm` as a
`namespace_ref` node after resolving the import graph.

**Token**: `namespace` for the qualifier identifier.

### 2.4 Soft Keywords as Identifiers (§3.4)

**TextMate limitation**: `namespace` and `workspace` as field names are
approximated by context anchors — occasional false-positives possible.

**Semantic resolution**: Parser context unambiguously distinguishes keyword from
identifier use for `namespace` and `workspace`.

**Token**: `keyword` with `control` modifier for keyword uses.

### 2.5 Function Calls vs. Identifiers in Transforms (§3.5)

**TextMate limitation**: Only `identifier(` patterns are scoped as function
calls. Bare pipeline identifiers (e.g. `trim | lowercase`) cannot be
distinguished from field references.

**Semantic resolution**: Parser knows which identifiers are in function-call
position in a transform pipeline.

**Token**: `function` for transform function names.

### 2.6 `map` Keyword in Value-Map Literals vs. Block Declarations (§3.6)

**TextMate limitation**: Context pattern distinguishes most cases; minor
false-positives in complex nesting.

**Semantic resolution**: Parser has distinct `map_block` and `value_map_literal`
node types.

**Token**: No additional token needed — the existing `keyword.other.stm` scope
is sufficient once the parser confirms the node type. Alternatively, use a
`keyword` token with a custom `literal` modifier.

### 2.7 Inline Note Blocks on Map Entries (§3.7)

**TextMate limitation**: Pattern for `{ note '''...''' }` works but the outer
`{}` may be mis-scoped.

**Semantic resolution**: Parser has `inline_note_block` node; semantic provider
can correctly scope the enclosing brace pair.

**Token**: Outer `{}` → `punctuation.section.block.stm` (unchanged); inner
content confirmation with `comment` token.

### 2.8 `selection_criteria` Blocks (§3.8)

**TextMate limitation**: Treated as opaque multiline string.

**Semantic resolution**: Parser can signal this is a foreign-language region.
Could trigger embedded language injection (e.g. SQL highlighting). This requires
a full language server to support `textDocument/documentHighlights` for embedded
content.

**Token**: Deferred to LSP phase; not addressable with extension-host WASM alone.

---

## 3. Proposed Semantic Token Types

These token types should be registered in the extension `package.json` when
implementing semantic highlighting.

| Semantic Token Type | Modifier(s)    | TextMate Baseline                 | Resolves |
|--------------------|-----------------|------------------------------------|----------|
| `variable`         | `source`        | `variable.other.field.stm`         | §2.1     |
| `variable`         | `target`        | `variable.other.field.stm`         | §2.1     |
| `namespace`        | —               | `variable.other.field.stm`         | §2.3     |
| `type`             | —               | `entity.name.type.stm`             | §2.2     |
| `function`         | —               | `entity.name.function.stm`         | §2.5     |
| `property`         | `declaration`   | `variable.other.field.stm`         | §2.2     |
| `property`         | `reference`     | `variable.other.field.stm`         | §2.2     |
| `variable`         | `readonly`      | `variable.other.field.stm`         | §2.1     |
| `keyword`          | `control`       | `keyword.other.stm`                | §2.4     |

All token types use standard VS Code semantic token names where possible to
maximise theme compatibility without custom token declarations.

---

## 4. Intentional TextMate / Tree-sitter Divergences

The following divergences are known and intentional. The semantic layer resolves
them where noted.

| Feature | Tree-sitter | TextMate | Semantic Resolution |
|---------|-------------|----------|---------------------|
| `map_entry` source/target fields | Separate `source:` and `target:` nodes | Both sides same scope | `variable` + `source`/`target` modifiers |
| `value_map_literal` vs `map_block` | Distinct node types | Context patterns | No token change needed; parser confirms node |
| `schema_keyword` role | Named field on `schema_block` | Keyword by regex position | `type` token for schema name |
| `path_segment` inside `field_path` | Structured path with segments | Flat identifier + dot | `type` vs `property.reference` per segment |
| `block_map_entry` vs `nested_map` | Distinct structural nodes | Both look like `token { ... }` | No visible difference needed at MVP |
| Transform continuation node types | `transform_head`, `pipe_continuation`, `when_clause` | Matched by leading token only | `function` for pipeline functions |

---

## 5. Delivery Mechanism

Two options exist for parser-backed semantic highlighting:

### Option A: Extension-host Parser Integration (WASM)

Ship a WASM build of `tree-sitter-stm` and run it directly in the VS Code
extension host to produce semantic tokens.

**Pros**:
- No external process; runs in-extension
- Low startup cost
- Incremental parsing natively supported by tree-sitter
- No IPC overhead

**Cons**:
- Requires WASM build toolchain for the grammar
- Extension bundle size increases (~200–400 KB for WASM + JS bindings)
- Limited to parsing-only (no completion, hover, diagnostics without more work)
- tree-sitter WASM binding API is less ergonomic than native

**Suitable for**: Phase 1 of semantic highlighting — scope refinement only.

### Option B: Future Language Server (LSP)

A language server (Node.js or Rust) parses STM files and provides semantic
tokens via the LSP `textDocument/semanticTokens` request.

**Pros**:
- Enables full language features: completion, hover, go-to-definition, diagnostics
- Natural boundary for parser logic
- Language-agnostic (can be consumed by other editors)
- Cleaner separation of concerns

**Cons**:
- Higher startup cost; LSP process must be launched
- Requires IPC; higher latency on first token request
- More infrastructure to build and maintain

**Suitable for**: Phase 2+ when full language intelligence is needed.

### Recommendation

Implement **Option A** first for semantic token scope refinement, scoped to
resolving constructs 2.1–2.5 above. This can be done with minimal infrastructure
once the tree-sitter grammar is stable. Evolve to Option B when the project
needs completion, hover, or diagnostics.

---

## 6. Dependency Gates

Semantic highlighting should not be attempted until:

1. **Tree-sitter grammar is stable** — `stm-14x` complete, including all quality
   gates (`stm-14x.8`). Grammar must not be in active structural churn.
2. **CST-to-AST mapping is defined and tested** — the mapping from parse tree
   nodes to semantic entities must be defined and exercised by tests.
3. **A reusable parser package boundary exists** — the parser must be consumable
   as a library (e.g. an npm package or a compiled WASM artifact), not just as
   a grammar development directory.
4. **Shared fixture contract is in place** — the fixture reuse contract from
   `HIGHLIGHTING-TAXONOMY.md §4.4` must be followed: new TextMate fixtures and
   semantic assertions should validate against the same canonical files.

---

## 7. Layering Model

```
VS Code Editor
│
├── TextMate Grammar (syntaxes/stm.tmLanguage.json)
│   ├── Always active
│   ├── Provides baseline token scopes for all constructs
│   └── Gracefully handles malformed/incomplete STM files
│
└── Semantic Token Provider (future: src/semanticTokens.ts)
    ├── Active when tree-sitter-stm WASM is loaded
    ├── Provides refined token types/modifiers for the 8 ambiguous constructs
    ├── Falls back transparently if parser unavailable or file unparseable
    └── Validates against shared fixtures (HIGHLIGHTING-TAXONOMY.md §4.4)
```

Semantic tokens **override** TextMate scopes for the same text ranges. For all
ranges not covered by semantic tokens, TextMate scopes remain active. This
means:

- Files with syntax errors still get reasonable highlighting from TextMate
- The semantic layer only needs to handle valid/parseable STM
- Themes that don't support semantic tokens continue to work via TextMate scopes

---

## 8. Test Strategy for Semantic Layer

When implementing semantic tokens, reuse the shared fixture contract:

| Source | Semantic Usage |
|--------|---------------|
| `examples/*.stm` | Golden semantic fixtures — assert refined token types |
| `test/fixtures/*.stm` | Add semantic assertions to existing scope fixtures |
| Tree-sitter corpus tests | Derive semantic type assertions for isolated constructs |

New semantic-only distinctions (e.g. `source` vs `target` modifier on the same
`variable` token type) should add targeted fixtures that assert:
1. The baseline TextMate scope (existing assertion)
2. The refined semantic token type + modifier (new assertion)

---

## 9. Open Risks and Assumptions

| Risk | Mitigation |
|------|-----------|
| tree-sitter WASM bundle size exceeds acceptable limit | Compress with wasm-opt; lazy-load the WASM on first STM file open |
| Incremental parsing performance on large files | Benchmark with `sfdc_to_snowflake.stm` and `multi-source-hub.stm` |
| Semantic token API stability across VS Code versions | Pin VS Code engine version; test on oldest supported version |
| Parse errors cause semantic provider to crash | Wrap all parsing in try/catch; return empty token array on error |
| Tree-sitter grammar structural changes post-stabilisation | Pin grammar version; update semantic bindings when grammar version bumps |
| Theme authors don't support custom semantic token types | All custom types fall back to built-in VS Code semantic types |
