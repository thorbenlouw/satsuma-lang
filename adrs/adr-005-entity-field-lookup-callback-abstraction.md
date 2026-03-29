# ADR-005 — EntityFieldLookup Callback Abstraction for Spread Expansion

**Status:** Accepted
**Date:** 2026-03 (Feature 26)

## Context

Fragment spread expansion (`spread-expand.ts`) resolves `...FragmentName` references in a schema's field list by looking up the fragment's fields from a multi-file workspace index. In the CLI, this index is `WorkspaceIndex` — a rich in-memory structure built by `index-builder.ts` after parsing all files in the workspace.

The problem: if `satsuma-core/src/spread-expand.ts` imports `WorkspaceIndex` from the CLI, it creates an upward dependency — a library depending on an application. This would make `satsuma-core` un-usable by the LSP without also importing the CLI's entire workspace model.

The LSP has its own workspace index (`vscode-satsuma/server/src/workspace-index.ts`) that has a different shape (`Map<string, DefinitionEntry[]>` rather than the CLI's typed maps of schema/fragment records). There is no single index type that both tools share.

Alternatives considered:
1. Define a `WorkspaceIndex` interface in `satsuma-core` that both CLI and LSP implement — would require both consumers to adapt their index types to match; large migration risk
2. Move `WorkspaceIndex` to `satsuma-core` entirely — turns `satsuma-core` into a much larger library with multi-file orchestration concerns; violates the "extraction only" boundary
3. Use a callback (function parameter) instead of a typed index — the chosen approach

## Decision

`spread-expand.ts` in `satsuma-core` accepts an `EntityFieldLookup` callback instead of a `WorkspaceIndex`:

```typescript
/** Look up a fragment or schema entity by name and current namespace. */
type EntityFieldLookup = (name: string, currentNs: string | null) =>
  { fields: FieldDecl[]; spreads?: string[] } | null;
```

Each consumer wraps its own index into this callback:
- **CLI**: `(name, ns) => resolveScopedEntityRef(name, ns, index.schemas) ?? resolveScopedEntityRef(name, ns, index.fragments)`
- **LSP**: `(name, ns) => index.definitions.get(qualifiedName(name, ns))?.[0] ?? null` (the LSP's DefinitionEntry already has a `fields: FieldInfo[]` property)

## Consequences

**Positive:**
- `satsuma-core` has no dependency on either the CLI or LSP workspace types
- Each consumer provides the exact lookup semantics appropriate for its index
- The callback interface is minimal and easy to implement for future consumers

**Negative:**
- Each consumer must write a small adapter closure — 3–5 lines per caller
- The callback indirection adds a layer of indirection when reading the spread expansion code
- Type mismatch: CLI uses `FieldDecl[]`, LSP uses `FieldInfo[]`. The callback must return `FieldDecl[]`, so the LSP adapter must convert `FieldInfo` → `FieldDecl`. This is a minor mapping step (both have `name`, `type`, `children` properties).
