---
id: sl-fgqt
status: closed
deps: [sl-ikzl]
links: []
created: 2026-03-29T18:50:19Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): satsuma-core — spread-expand with SchemaLookup callback abstraction

Move satsuma-cli/src/spread-expand.ts into satsuma-core/src/spread-expand.ts, refactoring its dependency on CLI's WorkspaceIndex into a SchemaLookup callback interface.

The problem: spread-expand.ts currently imports resolveScopedEntityRef from index-builder.ts and takes a WorkspaceIndex parameter. Both are CLI-specific. Moving the file as-is would drag the entire CLI WorkspaceIndex type into satsuma-core.

Design decision: Abstract the index dependency to a callback interface.

Define in satsuma-core/src/spread-expand.ts:
  // Callback to look up a fragment/schema's fields by name+namespace.
  // Implementations: CLI passes a closure over WorkspaceIndex.schemas/fragments;
  // LSP passes a closure over its workspace-index definitions.
  type EntityFieldLookup = (name: string, currentNs: string | null) => { fields: FieldDecl[]; spreads?: string[] } | null;

Refactor the exported functions to accept EntityFieldLookup instead of WorkspaceIndex:
  - collectFieldPaths(fields, prefix, paths): void  [already pure, no change]
  - expandSpreads(schema, currentNs, lookup): FieldDecl[]
  - expandEntityFields(names, currentNs, lookup): FieldDecl[]
  - expandNestedSpreads(fields, currentNs, lookup, diagnostics?): FieldDecl[]

The CLI's index-builder.ts wraps its WorkspaceIndex into the required EntityFieldLookup callback:
  const lookup: EntityFieldLookup = (name, ns) =>
    resolveScopedEntityRef(name, ns, index.schemas) ?? resolveScopedEntityRef(name, ns, index.fragments);

This is an ADR-worthy design decision — document it as ADR-007.

## Acceptance Criteria

1. satsuma-core/src/spread-expand.ts exists with EntityFieldLookup interface and all 4 functions 2. No import of WorkspaceIndex in satsuma-core 3. CLI spread-expand.ts becomes a re-export shim where exported functions pass through a CLI-specific adapter 4. All existing CLI validate.test.js and expand-spread-related tests pass 5. satsuma-core builds 6. Unit tests in satsuma-core/test/spread-expand.test.js verify: cycle detection, diamond spreads, nested spreads in record fields, missing fragment (returns empty)


## Notes

**2026-03-29T20:38:42Z**

Cause: Fragment spread expansion was coupled to WorkspaceIndex, preventing reuse in satsuma-core. Fix: Created satsuma-core/src/spread-expand.ts with EntityRefResolver/SpreadEntityLookup callback abstraction (ADR-005); CLI shim wraps with WorkspaceIndex adapters. 70 core tests, 866 CLI tests pass.
