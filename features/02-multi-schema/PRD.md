# PRD: Multi-Schema Namespace and Workspace Support

## Feature: `02-multi-schema`

---

## 1. Problem Statement

### 1.1 Cross-file Lineage Gap

STM files today describe one integration at a time. There is no first-class mechanism to stitch multiple integration files into a platform-wide lineage graph. When a data platform spans dozens of integrations across multiple teams, understanding the full data flow requires external tooling that re-parses file contents and guesses at relationships.

### 1.2 Name Collision Across Projects

Schemas from different logical projects routinely share names. A `orders` table exists in both the CRM system and the billing system. Without a namespace qualifier, these schemas clash when files are brought together:

```stm
// Both files define `table orders { ... }` — which one is which?
import "crm/pipeline.stm"
import "billing/pipeline.stm"
```

The current mitigation (aliased imports) is a file-local workaround, not a platform-level solution. Aliases don't propagate to lineage graphs or cross-file references.

---

## 2. Goals

1. Provide a grammar-enforced namespace prefix per file so schemas are globally unambiguous.
2. Provide a `workspace` block that assembles multiple integration files into a named platform scope — the entry point for lineage tooling.
3. Extend path syntax with `::` so namespace-qualified references are first-class in mapping headers and mapping bodies.
4. Remain fully backwards compatible — existing STM files without `namespace` declarations are unchanged.

---

## 3. Non-Goals

- Within-file namespace blocks (sub-namespacing within a single file) are deferred.
- Runtime namespace resolution and import graph walking is a tooling concern, not a grammar concern.
- Generating lineage graphs is a separate tool (`stm lineage`) that consumes the workspace; the grammar merely makes it unambiguous.
- Renaming or aliasing namespaces at the workspace level (beyond what import aliasing already provides).

---

## 4. Design

### 4.1 File-Level `namespace` Declaration

A new optional top-level declaration (at most one per file, conventionally before any other blocks):

```stm
// crm/pipeline.stm
namespace "crm"

integration "CRM_Ingest" { cardinality 1:N }

table orders {
  order_id    UUID    [pk]
  customer_id UUID
  total       DECIMAL(12,2)
}
```

- The namespace string becomes the qualifier prefix for all schema blocks in this file.
- Files without `namespace` are "unnamespaced" — existing scoping rules apply unchanged.
- Duplicate namespace strings across imported files is a **parser error** (E016).
- `namespace` is a **soft keyword**: valid as an identifier in unnamespaced files.

### 4.2 Path Syntax Extension: `namespace::schema_id.field`

`::` cleanly separates the namespace from the existing `schema_id.field` path syntax, avoiding collision with nested field traversal (`.`):

| Path form | Meaning |
|---|---|
| `field` | Local field (implicit schema from mapping header) |
| `schema_id.field` | Schema-qualified (existing) |
| `schema_id.field.nested` | Nested field (existing) |
| `ns::schema_id.field` | Namespace + schema + field (new) |
| `ns::schema_id.field.nested` | Namespace + schema + nested field (new) |

Map headers accept namespace-qualified schemas on both sides of `->`:

```stm
mapping crm::orders -> warehouse::fact_orders {
  order_id -> source_order_id
  billing::invoices.amount -> billed_amount   // cross-namespace field reference
}
```

### 4.3 `workspace` Block

A workspace file assembles multiple integration files into a named platform scope:

```stm
// platform.stm
workspace "data_platform" {
  schema "crm"       from "crm/pipeline.stm"
  schema "billing"   from "billing/pipeline.stm"
  schema "warehouse" from "warehouse/ingest.stm"

  note '''
    # Data Platform Lineage
    Entry point for full platform lineage traversal.
  '''
}
```

Rules:
- `schema "<ns>" from "<path>"` assigns a canonical namespace to a file.
- If the file already declares `namespace "crm"`, the workspace entry must match — mismatch is **parser error** (E018).
- If the file has no `namespace`, the workspace assignment provides one for lineage purposes (file itself is unchanged).
- `integration` and `mapping` blocks are **not** allowed in workspace files (E019).
- At most one `workspace` block per file.
- Workspace files may import other workspace files for hierarchical modelling.
- Path resolution follows the same rules as import paths.

---

## 5. Design Decisions

### Why `::` and not `.` for namespace separation?

`.` is already used for field path traversal (`schema_id.field.nested`). Using `.` for namespace separation would make `crm.orders.order_id` ambiguous — is `crm` the namespace or a schema with a nested group called `orders`? The `::` separator is unambiguous because it currently appears nowhere in STM syntax.

### Why file-level namespace, not block-level?

Block-level namespaces were considered (e.g., `namespace "crm" { table orders { ... } }`). They were rejected because:
1. Most integrations naturally correspond to a single project/domain — file-level is the right granularity.
2. Block-level would require every schema to be wrapped in a namespace block, adding noise to simple files.
3. Files already act as modules (via imports), so file = namespace is a natural mapping.

### Why is `workspace` declaration-only (no `mapping` or `integration` blocks)?

The workspace file's role is to declare the canonical assembly of namespaces — it is an index, not a transformation file. Mixing transformation logic into workspace files would blur the separation of concerns that STM's design prioritizes.

### Why must workspace namespace match file's declared namespace?

Silent aliasing (workspace says `schema "crm"` but file says `namespace "billing"`) would create invisible mismatches in lineage graphs and make debugging hard. An explicit parser error forces authors to align canonical names at source.

---

## 6. Grammar Changes

New EBNF productions:

```ebnf
(* Top-level additions *)
namespace_decl   = "namespace" STRING ;
workspace_block  = "workspace" STRING "{" { workspace_entry | note | COMMENT } "}" ;
workspace_entry  = "schema" STRING "from" STRING ;

(* Path extension *)
ns_qualifier     = ident "::" ;
path             = [ ns_qualifier ] schema_id { "." ident } ;
```

`namespace`, `workspace`, and `from` are soft keywords — they can still be used as identifiers in unnamespaced files.

---

## 7. Backwards Compatibility

- Files without `namespace` are fully unchanged. All existing scoping rules apply.
- `::` is currently not valid anywhere in STM path syntax — this is a pure extension.
- Aliased imports continue to work: `import { orders as crm_orders }` is valid alongside `crm::orders`.
- No existing test or fixture needs modification.

---

## 8. Error Codes

| Code | Description |
|---|---|
| **E016** | Duplicate namespace string across files in scope |
| **E017** | Unresolved namespace qualifier in path |
| **E018** | Workspace `schema` entry namespace does not match file's declared `namespace` |
| **E019** | `integration` or `mapping` block in a workspace file |

---

## 9. Acceptance Criteria

- [ ] `STM-SPEC.md` updated: namespace declaration, `::` path syntax, workspace block, scoping rules, grammar EBNF, new error codes
- [ ] `tooling/tree-sitter-stm/grammar.js` updated to parse all new constructs without ambiguity
- [ ] Example files cover: single-file namespace, workspace assembly, cross-namespace mapping blocks, same-named schemas in different namespaces
- [ ] `docs/ast-mapping.md` updated with `namespace_decl`, `ns_qualifier`, `workspace_block`, `workspace_entry` node types
- [ ] Backwards compatible: files without `namespace` unchanged, aliased imports still work
- [ ] Parser errors on: duplicate namespace clash, workspace/file namespace mismatch, mapping/integration in workspace file
