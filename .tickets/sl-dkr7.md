---
id: sl-dkr7
status: closed
deps: []
links: []
created: 2026-03-28T21:35:07Z
type: bug
priority: 2
assignee: Thorben Louw
---
# graph + lineage don't follow NL field refs (@ref) as implicit lineage edges

NL @ref mentions in mapping transform strings (e.g. -> output { "@bla is summed" }) are resolved in the arrows command as nl-derived arrows but are completely absent from the graph command's field_edges and from lineage traversal.

Affected commands:
- satsuma graph --json: field_edges[] never includes nl-derived edges; buildFieldEdges() only iterates index.fieldArrows (AST arrow nodes), not synthetic NL refs
- satsuma lineage: graph-builder.ts only creates schema-level NL ref edges, and even those are skipped when the schema is already declared in mapping.sources (line 99). No field-level NL ref edges exist.
- satsuma arrows --as-source: nl-derived arrows are added but the --as-source filter compares bare field names while nl-derived sources are fully-qualified canonical paths (::schema.field), causing the filter to incorrectly exclude them.

## Design

Design decision (recorded 2026-03-28): An NL @ref mention in a mapping transform string (@bla, @schema.field, @ns::schema.field) is an implicit field reference that carries the same lineage weight as a declared source field to the left of an arrow. When @bla appears in -> output_field { "@bla is used here" }, this is semantically equivalent to bla -> output_field with classification nl-derived. Tools must follow these references in all lineage-aware operations.

## Acceptance Criteria

- satsuma graph --json includes nl-derived field edges in edges[] with classification 'nl-derived'
- satsuma lineage --from / --to follows nl-derived edges when traversing the graph (field-level nl refs add edges in graph-builder)
- satsuma arrows --as-source correctly includes nl-derived arrows for the queried field (fix canonical key comparison in direction filter)
- Smoke tests covering each case

## Notes

**2026-03-29**

Cause: Three separate bugs: (1) `arrows.ts` compared `resolvedTo` (canonical `::s1.a`) against `qualifiedField` (non-canonical `s1.a`), so nl-derived arrows were never found when querying a source field; (2) the `--as-source` filter checked bare field names against fully-qualified canonical sources; (3) `graph.ts buildFieldEdges()` only iterated `index.fieldArrows` and never synthesised nl-derived edges from `resolveAllNLRefs`.
Fix: Normalised the comparison to use `canonicalKey(qualifiedField)` in arrows.ts; updated the `--as-source` filter to match canonical paths; added an nl-derived edge synthesis loop to `buildFieldEdges` with dedup logic to avoid emitting redundant edges when the field is already a declared source. Smoke tests updated and extended (test_05, test_01, test_02 field-lineage). (commit c69e322)
