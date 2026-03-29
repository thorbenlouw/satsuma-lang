# ADR-008 — Fragment Spread Expansion Semantics

**Status:** Accepted
**Date:** 2026-03

## Context

Satsuma schemas can include fields from named fragments using spread syntax:

```satsuma
fragment AddressFields {
  street string
  city string
  postcode string
}

fragment ContactFields {
  ...AddressFields
  email string
  phone string
}

schema customers {
  id string
  name string
  ...ContactFields
}
```

The question is: what does a spread *mean* — both for analysis/lineage and for tooling (LSP, coverage, completions)? Two interpretations are possible:

1. **Entity model**: a schema "has a ContactFields" relationship. Fragments are first-class nodes in the graph. Arrow sources/targets reference the fragment as a distinct entity.
2. **Macro model**: a spread is textual inclusion. After expansion, `customers` has `id`, `name`, `street`, `city`, `postcode`, `email`, `phone` as direct fields. Fragments are not nodes in the graph.

There is also a question of what happens when expansion would produce a duplicate: if `customers` also declares `email string` directly, the spread and the direct declaration both claim the same field name.

## Decision

### 1. Fragment spreads are macros — fields are inlined as first-class members

Expanding `...ContactFields` into `customers` is equivalent to copy-pasting ContactFields' full field list (after recursively expanding any of *its* spreads) at the point of the `...` in customers' body. The result is indistinguishable from having declared those fields directly:

```
customers (expanded) = {
  id, name,               ← declared directly
  street, city, postcode, ← from ContactFields → AddressFields
  email, phone            ← from ContactFields
}
```

This applies recursively to any depth. Fragments that spread other fragments are fully flattened before being spread into a consuming schema.

### 2. Fragments are not graph nodes

From a lineage and data-flow perspective, fragments are transparent. An arrow that maps to `customers.street` is an arrow to `customers.street` — not an arrow to `AddressFields.street` via `ContactFields`. The fragment path is irrelevant to lineage traversal.

In `satsuma graph --json`, `satsuma lineage`, `satsuma field-lineage`, and the viz model, fragments do not appear as entities. All analysis operates on the expanded field sets of schemas.

### 3. LSP tooling may track the originating fragment for go-to-definition

Although fragments are transparent to analysis, the source location of a field declaration may be in a fragment file. An IDE user right-clicking `customers.street` and selecting "Go to Definition" should navigate to `street string` in `AddressFields`, not produce an error or navigate to the `...ContactFields` spread site.

The `DefinitionEntry` in the LSP workspace index therefore stores the original file and range of each field declaration, regardless of which schema the field was spread into. This is an LSP-layer concern only — it does not affect the extraction model.

### 4. Duplicate field names after expansion are an error

If a schema declares a field with the same name as a field introduced by a spread — directly or transitively — this is a validation error:

```satsuma
schema customers {
  email string      // ← direct declaration
  ...ContactFields  // ← also brings in email — ERROR: duplicate field 'email'
}
```

The error is raised by the validator (`satsuma validate`). The extractor (`satsuma-core/extract.ts`) and spread expander (`satsuma-core/spread-expand.ts`) produce diagnostics for duplicate fields and include the first occurrence in the expanded field list, skipping subsequent duplicates. The duplicate-detection check compares field names case-sensitively.

Two spreads that both include the same field (diamond case) are also an error:

```satsuma
fragment A { x string }
fragment B { ...A }
fragment C { ...A }

schema s {
  ...B
  ...C  // ← x appears via both B and C — ERROR: duplicate field 'x'
}
```

## Consequences

**Positive:**
- Analysis is simple: every consumer works on expanded field sets. There is no "resolve this field through its fragment chain" step at analysis time.
- Arrow matching is unambiguous: `customers.street` is a valid arrow target immediately after expansion, with no need to know it came from a fragment.
- The graph is smaller: fragments are not nodes, so lineage graphs don't contain intermediate fragment entities that add noise.

**Negative:**
- The expanded field set must be computed before any analysis can proceed. For large workspaces with many deep fragment chains, this adds latency to index building (mitigated by caching in `buildIndex`).
- Duplicate-field errors can be surprising: a user who adds a field to a fragment may not immediately realise it conflicts with a field in a consuming schema elsewhere in the workspace. The validator must produce a clear error message that names both the schema and the fragment where the duplicate arises.
- Go-to-definition for spread fields requires the LSP to carry origin provenance (`fromFragment: string`) through the extraction pipeline, adding complexity to the LSP adapter layer.
