# ADR-006 — NL Ref (@-ref) Extraction and Resolution in satsuma-core

**Status:** Accepted
**Date:** 2026-03 (Feature 26)

## Context

NL strings in Satsuma transforms can contain inline cross-references using `@` syntax, e.g.:

```satsuma
"Convert amount using @exchange_rates.spot"
"Look up @crm::customers.id in the dim"
"Derive from @`Awkward Source Name`.field"
```

The `@` is the defining marker — the backticks are just name-quoting syntax for identifiers with special characters, the same as backtick-quoting used for block labels elsewhere in the language. The grammar node type for these is `at_ref`.

These NL refs are used by:
- **CLI** — traces implicit lineage edges from NL transform text; powers `satsuma nl-refs`, `satsuma lineage`, `satsuma field-lineage`, and `satsuma validate`
- **LSP** — needed for viz arrow annotations showing NL-derived data flow

The NL ref code in `satsuma-cli/src/nl-ref-extract.ts` (599 lines) has two phases:
1. **Extraction** (`extractAtRefs`, `classifyRef`): pure text parsing of an NL string — no index needed
2. **Resolution** (`resolveRef`, `resolveAllNLRefs`): lookup extracted refs against the workspace to produce `Resolution` records with `{ resolved, resolvedTo: { kind, name } }`

Both the CLI and LSP need full resolution — the LSP needs resolved refs to render meaningful viz edges (a labelled arrow that says "derives from crm::customers.id" rather than just "derives from some unresolved thing").

The resolution logic depends on:
- Schema/fragment lookup (to verify the ref exists and get its fields)
- Spread expansion (to check field existence on spread-using schemas)
- Transform lookup (to classify a bare name as a transform ref)
- `MappingContext` — the source/target schemas and namespace of the surrounding mapping block

## Decision

All NL ref logic (extraction, classification, AND resolution) lives in `satsuma-core`. The resolution functions accept a `DefinitionLookup` callback interface instead of `WorkspaceIndex` — the same abstraction pattern as `spread-expand.ts` (ADR-005).

### Types defined in satsuma-core/src/nl-ref.ts

```typescript
/** An @-ref found in an NL string, with its raw text and position. */
export interface AtRef {
  ref: string;       // resolved text with backtick-quoting stripped
  offset: number;    // byte offset in the NL string
}

/** Syntactic classification of an @-ref. */
export type RefClassification =
  | "namespace-qualified-field"
  | "namespace-qualified-schema"
  | "dotted-field"
  | "bare";

/** Resolution result for a single AtRef. */
export interface Resolution {
  resolved: boolean;
  resolvedTo: { kind: "schema" | "fragment" | "transform" | "field"; name: string } | null;
}

/**
 * Callback to look up a named entity (schema, fragment, or transform) by name
 * and namespace. Implementations wrap each consumer's workspace index.
 *
 * Returns:
 * - { kind: 'schema' | 'fragment', fields } if a matching entity with fields is found
 * - { kind: 'transform' } if a matching transform is found (no fields needed)
 * - null if the entity is not found
 */
export type DefinitionLookup = (
  name: string,
  namespace: string | null,
) =>
  | { kind: "schema" | "fragment"; fields: FieldDecl[] }
  | { kind: "transform" }
  | null;

/** The source/target context of the enclosing mapping block. */
export interface MappingContext {
  sources: string[];
  targets: string[];
  namespace: string | null;
}
```

### Functions in satsuma-core/src/nl-ref.ts

```typescript
/** Extract all @-refs from a raw NL string. Pure text function. */
export function extractAtRefs(text: string): AtRef[];

/** Classify an @-ref by its syntactic form. Pure string analysis. */
export function classifyRef(ref: string): RefClassification;

/** Resolve a single @-ref string against the provided lookup. */
export function resolveRef(
  ref: string,
  context: MappingContext,
  lookup: DefinitionLookup,
): Resolution;

/** Resolve all AtRefs found in NL data for a file. */
export function resolveAllAtRefs(
  nlData: NLRefData[],
  lookup: DefinitionLookup,
): ResolvedNLRef[];
```

### Consumer adapters

**CLI** wraps `WorkspaceIndex`:
```typescript
const lookup: DefinitionLookup = (name, ns) => {
  const schema = resolveScopedEntityRef(name, ns, index.schemas);
  if (schema) return { kind: "schema", fields: schema.fields };
  const frag = resolveScopedEntityRef(name, ns, index.fragments);
  if (frag) return { kind: "fragment", fields: frag.fields };
  if (resolveScopedEntityRef(name, ns, index.transforms)) return { kind: "transform" };
  return null;
};
```

**LSP** wraps `DefinitionIndex`:
```typescript
const lookup: DefinitionLookup = (name, ns) => {
  const key = ns ? `${ns}::${name}` : name;
  const entry = definitionIndex.get(key)?.[0];
  if (!entry) return null;
  return entry.kind === "transform"
    ? { kind: "transform" }
    : { kind: entry.kind as "schema" | "fragment", fields: entry.fields ?? [] };
};
```

## Consequences

**Positive:**
- NL ref resolution is available to both CLI and LSP from a single implementation
- The LSP viz can show fully resolved NL-derived edges (e.g. "→ crm::customers.id") not just raw text
- Tested once in `satsuma-core/test/nl-ref.test.js`
- The same "callback abstraction" pattern as spread-expand — a consistent approach to index decoupling

**Negative:**
- Each consumer must write a `DefinitionLookup` adapter (3–8 lines)
- The resolution logic has a dependency on `expandEntityFields` (from `spread-expand.ts`, also in satsuma-core) for field-existence checks — this is an intra-core dependency, which is fine, but the module order matters
- `NLRefData` and `ResolvedNLRef` types (currently CLI-only) must be promoted to `satsuma-core/src/types.ts`
