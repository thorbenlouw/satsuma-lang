---
id: lsp-vfn0
status: closed
deps: [lsp-qmm1]
links: []
created: 2026-03-25T17:28:23Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-1, cli]
---
# P1.5: Update nl-ref-extract.ts ref classification

Update NL reference extraction and classification to use canonical ref form.

## Acceptance Criteria

- Extracted NL refs are classified using canonical form
- Ref resolution matches canonical keys in workspace index
- Tests updated


## Notes

**2026-03-26T00:15:00Z**

Cause: resolveRef() returned bare index keys (e.g. "schema.field") instead of canonical form (e.g. "::schema.field")
Fix: Wrapped all resolvedTo.name returns in canonicalKey(). Updated isSchemaInMappingSources() to compare canonical forms. Updated where-used gatherRefs() NL matching for canonical keys. Updated lint-engine makeAddSourceFix() to use resolveCanonicalKey() for source insertion.
