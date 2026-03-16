---
id: stm-0oad
status: closed
deps: [stm-dy6t]
links: []
created: 2026-03-16T13:46:54Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-t1n8
---
# Add multi-schema highlighting support to the VS Code extension

Extend the STM VS Code grammar and fixtures for namespace/workspace syntax. The multi-schema feature (stm-0z5) has landed — `namespace`, `workspace`, `from`, `as`, and `::` are part of the current language surface per STM-SPEC.md §4.5–§4.7 and the parser grammar.

## Design Notes

Reference: [HIGHLIGHTING-TAXONOMY.md §1.1, §1.2, §2.1, §2.7, §3.3, §3.4](features/03-vscode-syntax-highlighter/HIGHLIGHTING-TAXONOMY.md)

### Keywords to add

| Keyword | Context | TextMate Scope | Taxonomy Ref |
|---|---|---|---|
| `namespace` | Soft keyword — namespace declaration | `keyword.other.stm` | §1.1, §2.1 |
| `workspace` | Soft keyword — workspace block | `keyword.other.stm` | §1.1, §2.1 |
| `from` | Import path / workspace entry | `keyword.control.import.stm` | §1.2, §2.1 |
| `as` | Import alias | `keyword.control.import.stm` | §1.2, §2.1 |

### Operators to add

| Symbol | Scope | Taxonomy Ref |
|---|---|---|
| `::` | `punctuation.separator.namespace.stm` | §1.6, §2.7 |

### Soft keyword strategy (taxonomy §3.4)

`namespace` and `workspace` are soft keywords — they act as keywords only at the start of top-level declarations. As field names (e.g. `namespace VARCHAR(50)`), they are plain identifiers. Match them as keywords only in declaration-head position using begin/end patterns anchored to start-of-line or block context. Do not globally match them as `keyword.other.stm`.

### Namespace qualifier ambiguity (taxonomy §3.3)

In `crm::orders.order_id`, `crm` is a namespace qualifier. TextMate can match `::` as a delimiter but cannot verify the preceding token is actually a declared namespace. **Decision**: colour the `::` delimiter with `punctuation.separator.namespace.stm` and let the preceding identifier take default scope. If `identifier::` is matchable by regex, optionally scope the namespace portion as `entity.name.type.stm`, but accept false positives. Full namespace resolution is deferred to semantic tokens.

### Fixture files

Add to `test/fixtures/imports.stm` (or create a dedicated `test/fixtures/multi-schema.stm`):

- `namespace "crm"` declaration — keyword + string scoping
- `workspace "data_platform" { schema "crm" from "crm/pipeline.stm" }` — keyword, string, nested keyword scoping
- `import schema Orders from "crm/pipeline.stm"` — import+schema+from keywords
- `import schema Orders from "crm/pipeline.stm" as CrmOrders` — with alias
- `crm::orders.order_id -> warehouse::dim_orders.order_id` — namespace-qualified paths in map entries
- `namespace` used as a field name — should NOT be scoped as keyword

### Tree-sitter correspondence

- `namespace_decl` node → `namespace` keyword capture (`@keyword`)
- `workspace_block` node → `workspace` keyword capture (`@keyword`)
- `namespace_separator` (`::`) → `@punctuation.delimiter` → `punctuation.separator.namespace.stm`
- `schema ... from ...` entries inside workspace → `schema` + `from` keywords

## Acceptance Criteria

- `namespace` and `workspace` are highlighted as `keyword.other.stm` only in declaration-head position.
- `namespace` and `workspace` used as field names are not highlighted as keywords.
- `from` and `as` in import and workspace contexts are highlighted as `keyword.control.import.stm`.
- `::` is highlighted as `punctuation.separator.namespace.stm`.
- Namespace-qualified paths (`ns::schema.field`) highlight the `::` delimiter; preceding and following identifiers take default or type scopes.
- Workspace blocks (`workspace "name" { schema "x" from "path" }`) scope all keywords and strings correctly.
- Fixture coverage includes namespace declarations, workspace blocks, import-with-alias, namespace-qualified paths, and soft-keyword-as-identifier cases.
- The extension remains backward compatible with non-namespaced STM files — no regressions in existing fixtures.
