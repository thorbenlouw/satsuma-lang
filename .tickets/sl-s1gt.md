---
id: sl-s1gt
status: open
deps: [sl-pxw5, sl-60gz]
links: []
created: 2026-03-29T18:51:45Z
type: task
priority: 2
assignee: Thorben Louw
---
# feat(26): LSP — add fully resolved NL @-ref annotations to VizModel

Update buildVizModel in vscode-satsuma/server/src/viz-model.ts to annotate ArrowEntry.transform with fully resolved NL @-refs using satsuma-core's extractAtRefs() and resolveRef(). This gives the viz panel visibility into the implicit data dependencies expressed in natural-language transform text, with resolution to canonical names.

## Changes

1. Extend TransformInfo interface:
   ```typescript
   interface TransformInfo {
     // existing fields...
     atRefs?: ResolvedAtRef[];  // resolved @-refs from NL transform text
   }
   ```

2. Build a DefinitionLookup callback from the LSP's DefinitionIndex:
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

3. In the arrow extraction section of buildVizModel, for arrows with NL transform steps:
   - Call extractAtRefs(nlText) to get raw @-refs
   - Call resolveRef() for each ref against the lookup
   - Attach ResolvedAtRef[] to transform.atRefs

4. Only populate atRefs when the transform kind is 'nl' or 'mixed'

5. Import AtRef, ResolvedAtRef, extractAtRefs, resolveRef, DefinitionLookup from '@satsuma/core'

The viz component (satsuma-viz/src/) does not need to change in this ticket — TransformInfo.atRefs as an optional field is backward compatible.

## Acceptance Criteria

1. TransformInfo.atRefs?: ResolvedAtRef[] is present in the interface
2. buildVizModel for a mapping with NL transform containing @crm::customers.id produces transform.atRefs with a resolved entry (resolved: true, resolvedTo: { kind: "schema" | "field", name: "crm::customers.id" })
3. buildVizModel for a mapping with NL transform containing an unknown @bogus_ref produces an entry with resolved: false
4. Arrows with purely structural (non-NL) transforms have atRefs undefined or empty
5. All existing LSP viz-model tests pass
6. New test: buildVizModel with NL transform "@exchange_rates.spot" → transform.atRefs has one entry, resolved true, kind "field"
