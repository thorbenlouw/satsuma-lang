---
id: sl-pxw5
status: open
deps: [sl-ikzl, sl-fgqt]
links: []
created: 2026-03-29T18:50:35Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): satsuma-core — full NL @-ref extraction and resolution

Move ALL NL @-ref logic from satsuma-cli/src/nl-ref-extract.ts into satsuma-core/src/nl-ref.ts: extraction, classification, AND resolution. Resolution uses a DefinitionLookup callback interface — the same abstraction pattern as spread-expand (ADR-005, ADR-006).

## Naming correction

The current code uses `BacktickRef` / `extractBacktickRefs`, which is misleading — backticks are just name-quoting syntax. The defining feature is the `@` prefix (grammar node: `at_ref`). Rename throughout:
- `BacktickRef` → `AtRef`
- `extractBacktickRefs` → `extractAtRefs`
- `RefKind` → `RefClassification` (already the correct name in the CLI)

## Functions to move to satsuma-core/src/nl-ref.ts

**Extraction (pure text):**
- `interface AtRef { ref: string; offset: number }`
- `extractAtRefs(text: string): AtRef[]` — finds all @-refs in an NL string

**Classification (pure text):**
- `type RefClassification = "namespace-qualified-field" | "namespace-qualified-schema" | "dotted-field" | "bare"`
- `classifyRef(ref: string): RefClassification`

**Resolution (uses DefinitionLookup callback — no WorkspaceIndex):**
- `interface MappingContext { sources: string[]; targets: string[]; namespace: string | null }`
- `interface Resolution { resolved: boolean; resolvedTo: { kind: string; name: string } | null }`
- `type DefinitionLookup = (name: string, namespace: string | null) => { kind: "schema" | "fragment"; fields: FieldDecl[] } | { kind: "transform" } | null`
- `resolveRef(ref: string, context: MappingContext, lookup: DefinitionLookup): Resolution`
- `resolveAllAtRefs(nlData: NLRefData[], lookup: DefinitionLookup): ResolvedAtRef[]`

**CST walking (pure CST — no index):**
- `extractNLRefData(rootNode: SyntaxNode, mappings: ExtractedMapping[]): NLRefData[]` — walks CST to find all NL string positions

NLRefData and ResolvedAtRef types must be moved from CLI types.ts to satsuma-core/src/types.ts.

## CLI migration

satsuma-cli/src/nl-ref-extract.ts becomes a re-export shim that:
1. Imports all of the above from @satsuma/core
2. Provides a CLI-specific DefinitionLookup factory:
   ```typescript
   export function makeDefinitionLookup(index: WorkspaceIndex): DefinitionLookup { ... }
   ```
3. May keep thin command-specific orchestration wrappers that use the factory

## Dependency note

sl-fgqt (spread-expand) must complete first because resolveRef uses expandEntityFields for field-existence checks — and the in-core version of spread-expand must be available before nl-ref resolution can call it.

## Acceptance Criteria

1. satsuma-core/src/nl-ref.ts exports: AtRef, RefClassification, MappingContext, Resolution, DefinitionLookup, extractAtRefs, classifyRef, resolveRef, resolveAllAtRefs, extractNLRefData
2. NLRefData, ResolvedAtRef types exist in satsuma-core/src/types.ts
3. CLI nl-ref-extract.ts is a re-export shim with a makeDefinitionLookup factory
4. All existing CLI nl-ref-extract.test.js tests pass unchanged (they now exercise satsuma-core code via the shim)
5. satsuma-core builds
6. Golden snapshot test (sl-8pj3) still passes
7. Unit tests in satsuma-core/test/nl-ref.test.js cover: @-ref extraction, @`backtick name` extraction, namespace-qualified ref classification, dotted-field classification, bare ref resolution (sources/targets context), namespace-qualified resolution, transform name resolution, unresolvable ref → resolved: false
