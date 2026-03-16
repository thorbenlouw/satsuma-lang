---
id: stm-5lbl
status: closed
deps: [stm-o50b]
links: []
created: 2026-03-16T13:46:54Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-t1n8
---
# Design parser-backed semantic highlighting follow-on for STM

Document the post-MVP plan for semantic tokens layered on top of the TextMate grammar using the STM parser or future language server so the project has a clear path beyond regex-only highlighting.

## Design Notes

Reference: [HIGHLIGHTING-TAXONOMY.md §3, §4.2, §4.3, §4.4](features/03-vscode-syntax-highlighter/HIGHLIGHTING-TAXONOMY.md)

### Ambiguous constructs requiring semantic tokens

The taxonomy identifies 8 construct categories that TextMate cannot precisely handle (§3). Each represents a semantic token opportunity:

| # | Construct | TextMate Limitation | Semantic Resolution |
|---|---|---|---|
| 1 | Source vs target paths in map bodies (§3.1) | Both sides get same scope | Parser-backed `source` / `target` modifiers on `variable` |
| 2 | Schema ID vs field ID in dotted paths (§3.2) | Entire path uniform | Parser resolves path segment roles from schema definitions |
| 3 | Namespace qualifier vs identifier (§3.3) | `::` matched but prefix unverified | Namespace resolution from import/workspace declarations |
| 4 | Soft keywords as identifiers (§3.4) | Context-anchored regex only | Full parser context distinguishes keyword from identifier |
| 5 | Function calls vs identifiers in transforms (§3.5) | Only `id(` pattern | Parser knows function-call position in transform chain |
| 6 | `map` keyword: block vs value-map literal (§3.6) | Parent context pattern | Parser has distinct `map_block` and `value_map_literal` nodes |
| 7 | Inline note blocks on map entries (§3.7) | `{ note '''...''' }` pattern | Parser's `inline_note_block` node |
| 8 | `selection_criteria` blocks (§3.8) | Treated as opaque string | Parser could signal embedded language region |

### Intentional divergences between Tree-sitter and TextMate (taxonomy §4.2)

| Feature | Tree-sitter | TextMate |
|---|---|---|
| `map_entry` source/target fields | Separate `source:` and `target:` field nodes | Flat regex — both sides same scope |
| `value_map_literal` vs `map_block` | Distinct node types | Must rely on context patterns |
| `schema_keyword` role | Named field on `schema_block` | Keyword matched by regex regardless of position |
| `path_segment` inside `field_path` | Structured path with segments | Flat identifier + dot matching |
| `block_map_entry` vs `nested_map` | Distinct structural nodes | Both look like `tokens { ... }` |
| `transform_head`, `pipe_continuation`, `when_clause` | Distinct continuation node types | Matched by leading token regex only |

### Proposed semantic token types (taxonomy §4.3)

When parser-backed semantic highlighting is implemented, register these custom types:

| Semantic Token Type | Modifier(s) | Description |
|---|---|---|
| `variable` | `source` | Source-side field reference in a map entry |
| `variable` | `target` | Target-side field reference in a map entry |
| `namespace` | — | Namespace qualifier before `::` |
| `type` | — | Schema name in declaration header or path |
| `function` | — | Transform function name in pipeline |
| `property` | `declaration` | Field name in schema body (declaration site) |
| `property` | `reference` | Field name in map body (usage site) |
| `variable` | `readonly` | Computed mapping target (no direct source) |
| `keyword` | `control` | Soft keyword in keyword position |

### Shared fixture reuse contract (taxonomy §4.4)

The semantic highlighting layer should validate against the same fixtures used by TextMate and Tree-sitter tests. New semantic-only distinctions should add targeted fixtures that assert both the baseline TextMate scope and the refined semantic type.

### Delivery mechanism decision

The design note should compare:
1. **Extension-host parser integration** — ship a WASM build of tree-sitter-stm and run it directly in the VS Code extension host to produce semantic tokens
2. **Future LSP** — a language server (likely Node or Rust) that parses STM files and provides semantic tokens via the LSP `textDocument/semanticTokens` request

Factors: parser maturity, startup cost, incremental parsing needs, scope of future LSP features (completion, hover, diagnostics).

### Dependency gates

Semantic highlighting should not be attempted until:
- Tree-sitter grammar is stable (stm-14x complete, including quality gates stm-14x.8)
- CST-to-AST mapping is defined and tested
- A reusable parser package or service boundary exists (not just grammar.js)

## Acceptance Criteria

- A design note exists (in `features/03-vscode-syntax-highlighter/` or `docs/`) documenting the semantic token plan.
- The note identifies all 8 ambiguous constructs from taxonomy §3 and maps each to a specific semantic token type or modifier.
- The 9 proposed semantic token types from taxonomy §4.3 are included with rationale.
- The 6 intentional Tree-sitter/TextMate divergences from taxonomy §4.2 are referenced to show what the semantic layer resolves.
- The note compares extension-host parser integration vs LSP delivery with practical trade-offs.
- Dependency gates are defined: parser stability, CST-to-AST mapping, reusable parser boundary.
- The layering model is explicit: semantic tokens augment baseline TextMate scopes, they do not replace them.
- The shared fixture reuse contract from taxonomy §4.4 is referenced for the semantic layer's test strategy.
- Open implementation risks and assumptions are captured for future work.
