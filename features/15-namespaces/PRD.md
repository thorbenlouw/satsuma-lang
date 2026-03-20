# Namespaces: Scoped Definitions with `namespace` Blocks

> **Status: COMPLETED** (2026-03-20). Grammar (`namespace_block`, `namespaced_path`), index builder, all CLI commands, validator, VS Code syntax highlighting, and canonical examples implemented. All corpus tests pass.

## Goal

Introduce a flat `namespace` block that scopes all named definitions — schemas, metrics, mappings, fragments, and transforms — under a single-level name. Cross-namespace references use explicit `ns::name` qualification. Unqualified names resolve within the current namespace and the global namespace only — never by searching other named namespaces.

## Problem

Satsuma requires all named definitions to be globally unique within a workspace. This is enforced today by the `duplicate-definition` validator error. In real-world data platforms, this breaks down:

- **Same source system, different concerns**: A POS system exposes store reference data, transaction data, and customer linkage data. Satsuma forces either one monolithic schema or name-mangling (`pos_oracle_store`, `pos_oracle_txn`).
- **Multi-team convergence**: When teams merge Satsuma files into a shared workspace, name collisions are inevitable. Two teams may independently model a `customer` schema from different source systems.
- **Layered architectures**: Data Vault, Kimball, and lakehouse patterns define schemas at multiple layers (raw, vault, mart). A `customer` schema might exist at each layer with different fields and semantics.

Without namespaces, teams embed scope into names — sacrificing readability.

## Current State: Unique Names Across All Entity Types

As a prerequisite (implemented), Satsuma enforces that **all named definitions must be unique across entity types** within a workspace. A schema called `customer` and a metric called `customer` in the same workspace is an error:

```
error [duplicate-definition] Metric 'customer' conflicts with schema already defined in crm.stm:5
```

This rule carries forward into namespaces: within a single namespace, no two definitions of any kind may share a name.

## Approach

### Syntax

A `namespace` block wraps definitions under a name. Namespaces are **flat — one level only, no nesting**:

```stm
namespace pos {
  schema pos_oracle (note "POS store reference data") {
    STORE_ID    VARCHAR(20)   (pk)
    STORE_NAME  VARCHAR(100)  (required)
  }
}

namespace ecom {
  schema orders (note "Shopify order lines") {
    order_id    BIGINT        (pk)
  }
}
```

All named entity types — schemas, metrics, mappings, fragments, transforms — are scoped by their enclosing namespace. A namespace can contain any mix of these.

### Namespace merging across files

The same namespace name can appear in multiple files (or multiple times in one file). Blocks with the same name are **merged** — their definitions are combined into a single logical namespace:

```stm
// file: pos-stores.stm
namespace pos (note "Oracle Retail POS source system") {
  schema stores { /* ... */ }
}

// file: pos-transactions.stm
namespace pos (note "Oracle Retail POS source system") {
  schema transactions { /* ... */ }
}
// Result: namespace 'pos' contains both 'stores' and 'transactions'.
```

Duplicate namespace blocks are **not** an error — they are the mechanism for spreading a namespace across files.

**Metadata merging rule:** Metadata tags may be restated across blocks with the same value. Conflicting values for the same tag are an error:

```stm
// OK — same note restated
namespace pos (note "Oracle Retail POS") { /* ... */ }
namespace pos (note "Oracle Retail POS") { /* ... */ }

// OK — one block adds a note, the other doesn't
namespace pos (note "Oracle Retail POS") { /* ... */ }
namespace pos { /* ... */ }

// ERROR — conflicting note values
namespace pos (note "Oracle Retail POS") { /* ... */ }
namespace pos (note "POS system") { /* ... */ }
```

### The global namespace

Definitions outside any `namespace` block live in the **global namespace**. The global namespace is the shared commons — its definitions are visible from everywhere without qualification:

```stm
// Global definitions (no namespace block)
transform dv_hash { /* ... */ }
fragment audit_fields { /* ... */ }

namespace vault {
  schema hub_customer {
    ...audit_fields                    // global — visible without qualification
  }

  mapping 'load hub' {
    source { `pos::pos_oracle` }       // cross-namespace — must qualify
    target { `hub_customer` }          // local — no qualification needed
  }
}
```

If a local name shadows a global name, the local definition wins. There is no syntax to force a reference to the global definition — if you need both, rename one of them.

### Name resolution

Resolution is strict and predictable. An unqualified name resolves in exactly two places:

1. The **current namespace** (the enclosing `namespace` block).
2. The **global namespace** (definitions outside any namespace block).

That's it. Unqualified names **never** search other named namespaces. To reference something in another named namespace, you **must** qualify it with `ns::name`.

This means adding a definition to namespace B can never break references in namespace A. The only interaction between named namespaces is through explicit `::` references.

**Qualified references** are direct lookups — `pos::pos_oracle` looks in namespace `pos` only, nowhere else.

**Examples:**

```stm
// Global
transform dv_hash { /* ... */ }

namespace pos {
  schema pos_oracle { /* ... */ }
  schema stores { /* ... */ }

  mapping 'example' {
    source { `pos_oracle` }           // OK: local to this namespace
    target { `vault::hub_store` }     // OK: explicit cross-namespace ref
    // dv_hash available here — it's global
  }
}

namespace vault {
  schema hub_store { /* ... */ }

  mapping 'cross ref' {
    source { `pos::pos_oracle` }      // OK: explicit namespace required
    target { `hub_store` }            // OK: local
    source { `pos_oracle` }           // ERROR: not in vault, not in global
  }
}
```

**Error examples:**

```
error [undefined-ref] 'pos_oracle' is not defined in namespace 'vault' or the global namespace
  hint: did you mean 'pos::pos_oracle'?

error [undefined-ref] 'customer' is not defined in the global namespace
  hint: did you mean 'crm::customer' or 'billing::customer'?
```

### Cross-kind uniqueness within a namespace

Within a single namespace (including the global namespace), **all names must be unique regardless of entity kind**. A namespace cannot contain both a schema and a metric named `customer`:

```stm
namespace analytics {
  schema customer { /* ... */ }
  metric customer { /* ... */ }       // ERROR: conflicts with schema 'customer'
}
```

This matches the current workspace-level rule and extends it per-namespace. Names in **different** namespaces do not conflict — that is the entire point.

### Referencing entities across namespaces

The `::` separator is used everywhere an entity name appears — in mapping source/target references, fragment spreads, backticked references, and transform invocations:

```stm
namespace vault {
  mapping 'pos to hub_store' {
    source { `pos::pos_oracle` }       // cross-namespace source
    target { `hub_store` }             // local target
  }

  schema hub_customer {
    ...pos::customer_fields            // cross-namespace spread
  }
}
```

### Imports

Imports use namespace-qualified names to pull entities from other files:

```stm
// Import a namespaced entity
import { pos::pos_oracle } from "sources.stm"

// Import a global entity
import { dv_hash } from "common.stm"

// Multiple imports
import { vault::hub_customer, vault::hub_store } from "vault/hubs.stm"
```

### Replaces `workspace`

The previously proposed `workspace` block (documented but never implemented in the grammar or CLI) is superseded by `namespace` plus `import`. Everything a workspace block would have done — mapping names to source files and providing a platform-wide entry point — is handled by namespace blocks for scoping and imports for cross-file resolution:

```stm
// platform.stm — entry point for a multi-file data platform
import { pos::pos_oracle, pos::stores } from "pos/pipeline.stm"
import { vault::hub_customer, vault::hub_store } from "vault/hubs.stm"
import { mart::mart_customer_360 } from "mart/dimensions.stm"
```

## Success Criteria

1. Schemas (and all other named entities) with the same base name coexist in different namespaces without error.
2. Unqualified references resolve in the current namespace and global namespace only — never by searching other named namespaces.
3. Cross-namespace references require explicit `ns::name` qualification.
4. Undefined references produce helpful errors with hints suggesting qualified alternatives.
5. Cross-kind uniqueness is enforced within each namespace.
6. Same-named namespace blocks across files merge their definitions; conflicting metadata values are an error.
7. The tree-sitter grammar parses namespace blocks (flat, non-nestable) and `::` qualified names in all reference positions (source/target, spreads, backticks, transforms, imports).
8. Existing Satsuma files without namespaces continue to work without changes (everything is in the global namespace).
9. CLI commands (`schemas`, `fields`, `find`, `lineage`, `validate`) handle namespaced entities correctly.

## Non-Goals

- **Nested namespaces**: Namespaces are flat (one level). Use naming conventions within a namespace for further organisation.
- **Access control or visibility**: Namespaces are purely organizational. No `private`/`public`.
- **Namespace aliases**: No `use pos as p` shorthand (could be added later).
- **Re-exports**: No mechanism to re-export entities from one namespace into another.
- **Automatic namespace inference from file paths**: Namespaces are explicit, not derived from directory structure.
- **Global namespace disambiguation syntax**: No `::name` prefix for forcing global resolution. If a local name shadows a global one, rename to resolve the conflict.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| `::` separator (not `.`) | `.` is already used for field path access (`schema.field`). `::` is visually distinct and avoids parsing ambiguity. |
| Flat namespaces (no nesting) | One level is sufficient for team/layer/system scoping. Nesting adds grammar complexity and resolution ambiguity for minimal benefit. |
| Per-block scoping (not per-file) | A file can contribute to multiple namespaces, and a namespace can span many files. This is more flexible than Go-style per-file packages. |
| Duplicate namespace blocks merge | Enables spreading a namespace across files naturally. Each block adds its definitions to the shared namespace. |
| Conflicting metadata is an error | Restatements are fine (idempotent), but different values for the same tag indicate a mistake. Fail loudly rather than pick a winner. |
| Strict resolution (no cross-namespace search) | Adding a definition to namespace B can never break namespace A. Resolution is fully predictable from local context. The cost is one `ns::` prefix per cross-namespace reference — a small price for never having "spooky action at a distance." |
| Global namespace visible everywhere | Global definitions are the shared commons (transforms, fragments, lookups). Requiring qualification for these would be unnecessarily verbose since they exist precisely to be shared. |
| No `::name` global prefix | If a local name shadows a global name, the local one wins. Resolve conflicts by renaming — not with special syntax for a rare edge case. |
| Replaces `workspace` | `namespace` blocks + `import` subsume the workspace concept. One less keyword, one fewer concept. |

## Implementation Considerations

### Grammar changes

- New `namespace_block` rule: `namespace <identifier> (<metadata>) { <definitions> }`. Cannot nest inside another `namespace_block`.
- Extended identifier/reference rules to support `::` qualified names in all positions: `block_label`, `schema_ref`, `fragment_spread`, backticked references, and transform references.
- Import syntax extension: namespace-qualified names in import lists (e.g., `import { pos::pos_oracle } from "file.stm"`).

### Index builder

- Definition keys become `namespace::name` internally (e.g., `pos::pos_oracle`). Global definitions use an empty namespace prefix.
- Merge same-named namespace blocks: collect definitions from all blocks with the same namespace name.
- `allNames` registry becomes per-namespace for uniqueness checking.
- Metadata merge: collect metadata tags per namespace, error on conflicting values.

### Validator

- Replace flat `duplicate-definition` with namespace-aware uniqueness (duplicates within a namespace are errors; same names across namespaces are fine).
- Resolution: current namespace → global namespace → error (with hints).
- Qualified references: direct lookup in the specified namespace.

### CLI

- `satsuma schemas` output shows namespace prefixes for non-global entities.
- `satsuma find` supports namespace-qualified queries.
- `satsuma lineage` traces through qualified references.
